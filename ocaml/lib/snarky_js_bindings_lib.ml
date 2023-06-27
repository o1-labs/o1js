open Core_kernel
module Backend = Kimchi_backend.Pasta.Vesta_based_plonk
module Impl = Pickles.Impls.Step
module Other_impl = Pickles.Impls.Wrap
module Js = Js_of_ocaml.Js
module Field = Impl.Field
module Boolean = Impl.Boolean
module As_prover = Impl.As_prover
module Typ = Impl.Typ

(* light-weight wrapper around snarky-ml core *)

module Snarky = struct
  let typ (size_in_fields : int) = Typ.array ~length:size_in_fields Field.typ

  let exists (size_in_fields : int) (compute : unit -> Field.Constant.t array) =
    Impl.exists (typ size_in_fields) ~compute

  let exists_var (compute : unit -> Field.Constant.t) =
    Impl.exists Field.typ ~compute

  module Run = struct
    let as_prover = Impl.as_prover

    let in_prover_block () = As_prover.in_prover_block () |> Js.bool

    let run_and_check (f : unit -> unit) =
      try
        Impl.run_and_check_exn (fun () ->
            f () ;
            fun () -> () )
      with exn -> Util.raise_exn exn

    let run_unchecked (f : unit -> unit) =
      try
        Impl.run_and_check_exn (fun () ->
            Snarky_backendless.Snark0.set_eval_constraints false ;
            f () ;
            Snarky_backendless.Snark0.set_eval_constraints true ;
            fun () -> () )
      with exn -> Util.raise_exn exn

    let constraint_system (main : unit -> unit) =
      let cs =
        Impl.constraint_system ~input_typ:Impl.Typ.unit
          ~return_typ:Impl.Typ.unit (fun () -> main)
      in
      object%js
        val rows = Backend.R1CS_constraint_system.get_rows_len cs

        val digest =
          Backend.R1CS_constraint_system.digest cs |> Md5.to_hex |> Js.string

        val json =
          Backend.R1CS_constraint_system.to_json cs
          |> Js.string |> Util.json_parse
      end
  end

  module Field = struct
    type t = Field.t

    (** add x, y to get a new AST node Add(x, y); handles if x, y are constants *)
    let add x y = Field.add x y

    (** scale x by a constant to get a new AST node Scale(c, x); handles if x is a constant; handles c=0,1 *)
    let scale c x = Field.scale x c

    (** witnesses z = x*y and constrains it with [assert_r1cs]; handles constants *)
    let mul x y = Field.mul x y

    (** evaluates a CVar by unfolding the AST and reading Vars from a list of public input + aux values *)
    let read_var (x : Field.t) = As_prover.read_var x

    (** x === y without handling of constants *)
    let assert_equal x y = Impl.assert_ (Impl.Constraint.equal x y)

    (** x*y === z without handling of constants *)
    let assert_mul x y z = Impl.assert_ (Impl.Constraint.r1cs x y z)

    (** x*x === y without handling of constants *)
    let assert_square x y = Impl.assert_ (Impl.Constraint.square x y)

    (** x*x === x without handling of constants *)
    let assert_boolean x = Impl.assert_ (Impl.Constraint.boolean x)

    (** check x < y and x <= y.
        this is used in all comparisons, including with assert *)
    let compare (bit_length : int) x y =
      let ({ less; less_or_equal } : Field.comparison_result) =
        Field.compare ~bit_length x y
      in
      (less, less_or_equal)

    let to_bits (length : int) x =
      Field.choose_preimage_var ~length x |> Array.of_list

    let from_bits bits = Array.to_list bits |> Field.project

    (** returns x truncated to the lowest [16 * length_div_16] bits
       => can be used to assert that x fits in [16 * length_div_16] bits.

       more efficient than [to_bits] because it uses the [EC_endoscalar] gate;
       does 16 bits per row (vs 1 bits per row that you can do with generic gates).
    *)
    let truncate_to_bits16 (length_div_16 : int) x =
      let _a, _b, x0 =
        Pickles.Scalar_challenge.to_field_checked' ~num_bits:(length_div_16 * 16)
          (module Impl)
          { inner = x }
      in
      x0

    (* can be implemented with Field.to_constant_and_terms *)
    let seal x = Pickles.Util.seal (module Impl) x

    let to_constant_and_terms x = Field.to_constant_and_terms x
  end

  module Bool = struct
    let not x = Boolean.not x

    let and_ x y = Boolean.(x &&& y)

    let or_ x y = Boolean.(x ||| y)

    let assert_equal x y = Boolean.Assert.(x = y)

    let equals x y = Boolean.equal x y
  end

  module Group = struct
    let ec_add p1 p2 p3 inf same_x slope inf_z x21_inv =
      let open Impl in
      with_label "Elliptic Curve Addition" (fun () ->
          assert_
            { annotation = Some __LOC__
            ; basic =
                Kimchi_backend_common.Plonk_constraint_system.Plonk_constraint.T
                  (EC_add_complete
                     { p1; p2; p3; inf; same_x; slope; inf_z; x21_inv } )
            } ;
          p3 )

    let scale p (scalar_bits : Boolean.var array) =
      Pickles.Step_main_inputs.Ops.scale_fast_msb_bits p
        (Shifted_value scalar_bits)
  end

  module Circuit = struct
    module Main = struct
      let of_js (main : Field.t array -> unit) =
        let main' public_input () = main public_input in
        main'
    end

    let compile main public_input_size =
      let input_typ = typ public_input_size in
      let return_typ = Impl.Typ.unit in
      let cs =
        Impl.constraint_system ~input_typ ~return_typ (Main.of_js main)
      in
      Impl.Keypair.generate ~prev_challenges:0 cs

    let prove main public_input_size public_input keypair =
      let pk = Impl.Keypair.pk keypair in
      let input_typ = typ public_input_size in
      let return_typ = Impl.Typ.unit in
      Impl.generate_witness_conv ~input_typ ~return_typ
        ~f:(fun { Impl.Proof_inputs.auxiliary_inputs; public_inputs } () ->
          Backend.Proof.create pk ~auxiliary:auxiliary_inputs
            ~primary:public_inputs )
        (Main.of_js main) public_input

    let verify public_input proof vk =
      let public_input_vec = Backend.Field.Vector.create () in
      Array.iter public_input ~f:(fun x ->
          Backend.Field.Vector.emplace_back public_input_vec x ) ;
      Backend.Proof.verify proof vk public_input_vec |> Js.bool

    module Keypair = struct
      let get_vk t = Impl.Keypair.vk t

      external prover_to_json :
        Kimchi_bindings.Protocol.Index.Fp.t -> Js.js_string Js.t
        = "prover_to_json"

      let get_cs_json t =
        (Impl.Keypair.pk t).index |> prover_to_json |> Util.json_parse
    end
  end

  module Poseidon = struct
    let to_unchecked (x : Field.t) =
      match x with Constant y -> y | y -> Impl.As_prover.read_var y

    let hash_array (xs : Field.t array) (is_checked : bool Js.t) : Field.t =
      if Js.to_bool is_checked then Random_oracle.Checked.hash xs
      else
        Random_oracle.hash (Array.map ~f:to_unchecked xs) |> Impl.Field.constant

    (* this could be removed eventually since it's easily implemented using `update` *)
    let hash input is_checked = hash_array input is_checked

    let update (state : Field.t Random_oracle.State.t) (input : Field.t array)
        (is_checked : bool Js.t) : Field.t Random_oracle.State.t =
      if Js.to_bool is_checked then Random_oracle.Checked.update ~state input
      else
        Random_oracle.update
          ~state:(Random_oracle.State.map ~f:to_unchecked state)
          (Array.map ~f:to_unchecked input)
        |> Random_oracle.State.map ~f:Impl.Field.constant

    let hash_to_group (xs : Field.t array) (is_checked : bool Js.t) =
      let input = hash_array xs is_checked in
      let digest =
        if Js.to_bool is_checked then
          Snark_params.Group_map.Checked.to_group input
        else
          let x, y = Snark_params.Group_map.to_group (to_unchecked input) in
          (Impl.Field.constant @@ x, Impl.Field.constant @@ y)
      in
      digest

    (* sponge *)

    module Poseidon_sponge_checked =
      Sponge.Make_sponge (Pickles.Step_main_inputs.Sponge.Permutation)
    module Poseidon_sponge =
      Sponge.Make_sponge (Sponge.Poseidon (Pickles.Tick_field_sponge.Inputs))

    let sponge_params_checked =
      Sponge.Params.(
        map pasta_p_kimchi
          ~f:(Fn.compose Impl.Field.constant Impl.Field.Constant.of_string))

    let sponge_params =
      Sponge.Params.(map pasta_p_kimchi ~f:Impl.Field.Constant.of_string)

    type sponge =
      | Checked of Poseidon_sponge_checked.t
      | Unchecked of Poseidon_sponge.t

    (* returns a "sponge" that stays opaque to JS *)
    let sponge_create (is_checked : bool Js.t) : sponge =
      if Js.to_bool is_checked then
        Checked
          (Poseidon_sponge_checked.create ?init:None sponge_params_checked)
      else Unchecked (Poseidon_sponge.create ?init:None sponge_params)

    let sponge_absorb (sponge : sponge) (field : Field.t) : unit =
      match sponge with
      | Checked s ->
          Poseidon_sponge_checked.absorb s field
      | Unchecked s ->
          Poseidon_sponge.absorb s (to_unchecked @@ field)

    let sponge_squeeze (sponge : sponge) : Field.t =
      match sponge with
      | Checked s ->
          Poseidon_sponge_checked.squeeze s
      | Unchecked s ->
          Poseidon_sponge.squeeze s |> Impl.Field.constant
  end
end

let snarky =
  object%js
    method exists = Snarky.exists

    method existsVar = Snarky.exists_var

    val run =
      let open Snarky.Run in
      object%js
        method asProver = as_prover

        val inProverBlock = in_prover_block

        method runAndCheck = run_and_check

        method runUnchecked = run_unchecked

        method constraintSystem = constraint_system
      end

    val field =
      object%js
        method add = Snarky.Field.add

        method scale = Snarky.Field.scale

        method mul = Snarky.Field.mul

        method readVar = Snarky.Field.read_var

        method assertEqual = Snarky.Field.assert_equal

        method assertMul = Snarky.Field.assert_mul

        method assertSquare = Snarky.Field.assert_square

        method assertBoolean = Snarky.Field.assert_boolean

        method compare = Snarky.Field.compare

        method toBits = Snarky.Field.to_bits

        method fromBits = Snarky.Field.from_bits

        method truncateToBits16 = Snarky.Field.truncate_to_bits16

        method seal = Snarky.Field.seal

        method toConstantAndTerms = Snarky.Field.to_constant_and_terms
      end

    val bool =
      object%js
        method not = Snarky.Bool.not

        method and_ = Snarky.Bool.and_

        method or_ = Snarky.Bool.or_

        method assertEqual = Snarky.Bool.assert_equal

        method equals = Snarky.Bool.equals
      end

    val group =
      object%js
        method ecadd = Snarky.Group.ec_add

        method scale = Snarky.Group.scale
      end

    val circuit =
      object%js
        method compile = Snarky.Circuit.compile

        method prove = Snarky.Circuit.prove

        method verify = Snarky.Circuit.verify

        val keypair =
          object%js
            method getVerificationKey = Snarky.Circuit.Keypair.get_vk

            method getConstraintSystemJSON = Snarky.Circuit.Keypair.get_cs_json
          end
      end

    val poseidon =
      object%js
        method hash = Snarky.Poseidon.hash

        method update = Snarky.Poseidon.update

        method hashToGroup = Snarky.Poseidon.hash_to_group

        val sponge =
          object%js
            method create = Snarky.Poseidon.sponge_create

            method absorb = Snarky.Poseidon.sponge_absorb

            method squeeze = Snarky.Poseidon.sponge_squeeze
          end
      end
  end

(* Test - functions that have a ts implementation, exposed for ts-ml consistency tests *)

type public_key = Signature_lib.Public_key.Compressed.t

module Account_update = Mina_base.Account_update
module Zkapp_command = Mina_base.Zkapp_command

module Test = struct
  module Encoding = struct
    (* arbitrary base58_check encoding *)
    let binary_string_to_base58_check bin_string (version_byte : int) :
        Js.js_string Js.t =
      let module T = struct
        let version_byte = Char.of_int_exn version_byte

        let description = "any"
      end in
      let module B58 = Base58_check.Make (T) in
      bin_string |> B58.encode |> Js.string

    let binary_string_of_base58_check (base58 : Js.js_string Js.t)
        (version_byte : int) =
      let module T = struct
        let version_byte = Char.of_int_exn version_byte

        let description = "any"
      end in
      let module B58 = Base58_check.Make (T) in
      base58 |> Js.to_string |> B58.decode_exn

    (* base58 encoding of some transaction types *)
    let public_key_to_base58 (pk : public_key) : Js.js_string Js.t =
      pk |> Signature_lib.Public_key.Compressed.to_base58_check |> Js.string

    let public_key_of_base58 (pk_base58 : Js.js_string Js.t) : public_key =
      pk_base58 |> Js.to_string
      |> Signature_lib.Public_key.Compressed.of_base58_check_exn

    let private_key_to_base58 (sk : Other_impl.field) : Js.js_string Js.t =
      sk |> Signature_lib.Private_key.to_base58_check |> Js.string

    let private_key_of_base58 (sk_base58 : Js.js_string Js.t) : Other_impl.field
        =
      sk_base58 |> Js.to_string |> Signature_lib.Private_key.of_base58_check_exn

    let token_id_to_base58 (field : Impl.field) : Js.js_string Js.t =
      field |> Mina_base.Account_id.Digest.of_field
      |> Mina_base.Account_id.Digest.to_string |> Js.string

    let token_id_of_base58 (field : Js.js_string Js.t) : Impl.field =
      Mina_base.Account_id.Digest.to_field_unsafe
      @@ Mina_base.Account_id.Digest.of_string @@ Js.to_string field

    let memo_to_base58 (memo : Js.js_string Js.t) : Js.js_string Js.t =
      Js.string @@ Mina_base.Signed_command_memo.to_base58_check
      @@ Mina_base.Signed_command_memo.create_from_string_exn
      @@ Js.to_string memo

    let memo_hash_base58 (memo_base58 : Js.js_string Js.t) : Impl.field =
      memo_base58 |> Js.to_string
      |> Mina_base.Signed_command_memo.of_base58_check_exn
      |> Mina_base.Signed_command_memo.hash
  end

  module Token_id = struct
    let derive pk token =
      let account_id =
        Mina_base.Account_id.create pk (Mina_base.Token_id.of_field token)
      in
      Mina_base.Account_id.derive_token_id ~owner:account_id
      |> Mina_base.Token_id.to_field_unsafe

    let derive_checked pk token =
      let account_id =
        Mina_base.Account_id.Checked.create pk
          (Mina_base.Token_id.Checked.of_field token)
      in
      Mina_base.Account_id.Checked.derive_token_id ~owner:account_id
      |> Mina_base.Account_id.Digest.Checked.to_field_unsafe
  end

  (* deriver *)
  let account_update_of_json, _account_update_to_json =
    let deriver =
      Account_update.Graphql_repr.deriver
      @@ Fields_derivers_zkapps.Derivers.o ()
    in
    let account_update_of_json (account_update : Js.js_string Js.t) :
        Account_update.t =
      Fields_derivers_zkapps.of_json deriver
        (account_update |> Js.to_string |> Yojson.Safe.from_string)
      |> Account_update.of_graphql_repr
    in
    let account_update_to_json (account_update : Account_update.t) :
        Js.js_string Js.t =
      Fields_derivers_zkapps.to_json deriver
        (Account_update.to_graphql_repr account_update ~call_depth:0)
      |> Yojson.Safe.to_string |> Js.string
    in
    (account_update_of_json, account_update_to_json)

  let body_deriver =
    Mina_base.Account_update.Body.Graphql_repr.deriver
    @@ Fields_derivers_zkapps.o ()

  let body_of_json json =
    json
    |> Fields_derivers_zkapps.of_json body_deriver
    |> Account_update.Body.of_graphql_repr

  module Signature = struct
    let sign_field_element (x : Impl.field) (key : Other_impl.field)
        (is_mainnet : bool Js.t) =
      let network_id =
        Mina_signature_kind.(if Js.to_bool is_mainnet then Mainnet else Testnet)
      in
      Signature_lib.Schnorr.Chunked.sign ~signature_kind:network_id key
        (Random_oracle.Input.Chunked.field x)
      |> Mina_base.Signature.to_base58_check |> Js.string

    let dummy_signature () =
      Mina_base.Signature.(dummy |> to_base58_check) |> Js.string
  end

  module To_fields = struct
    (* helper function to check whether the fields we produce from JS are correct *)
    let fields_of_json
        (typ :
          ('var, 'value, Field.Constant.t, 'tmp) Impl.Internal_Basic.Typ.typ )
        of_json (json : Js.js_string Js.t) : Impl.field array =
      let json = json |> Js.to_string |> Yojson.Safe.from_string in
      let value = of_json json in
      let (Typ typ) = typ in
      let fields, _ = typ.value_to_fields value in
      fields

    let account_update =
      fields_of_json (Mina_base.Account_update.Body.typ ()) body_of_json
  end

  module Hash_from_json = struct
    let account_update (p : Js.js_string Js.t) =
      p |> account_update_of_json |> Account_update.digest

    let transaction_commitments (tx_json : Js.js_string Js.t) =
      let tx =
        Zkapp_command.of_json @@ Yojson.Safe.from_string @@ Js.to_string tx_json
      in
      let commitment = Zkapp_command.commitment tx in
      let fee_payer = Account_update.of_fee_payer tx.fee_payer in
      let fee_payer_hash =
        Zkapp_command.Digest.Account_update.create fee_payer
      in
      let full_commitment =
        Zkapp_command.Transaction_commitment.create_complete commitment
          ~memo_hash:(Mina_base.Signed_command_memo.hash tx.memo)
          ~fee_payer_hash
      in
      object%js
        val commitment = commitment

        val fullCommitment = full_commitment

        val feePayerHash = (fee_payer_hash :> Impl.field)
      end

    let zkapp_public_input (tx_json : Js.js_string Js.t)
        (account_update_index : int) =
      let tx =
        Zkapp_command.of_json @@ Yojson.Safe.from_string @@ Js.to_string tx_json
      in
      let account_update =
        List.nth_exn tx.account_updates account_update_index
      in
      object%js
        val accountUpdate =
          (account_update.elt.account_update_digest :> Impl.field)

        val calls =
          (Zkapp_command.Call_forest.hash account_update.elt.calls :> Impl.field)
      end
  end

  module Hash_input = struct
    type random_oracle_input = Impl.field Random_oracle_input.Chunked.t

    let pack_input (input : random_oracle_input) : Impl.field array =
      Random_oracle.pack_input input

    (* hash inputs for various account_update subtypes *)
    let timing_input (json : Js.js_string Js.t) : random_oracle_input =
      let deriver = Account_update.Update.Timing_info.deriver in
      let json = json |> Js.to_string |> Yojson.Safe.from_string in
      let value = Fields_derivers_zkapps.(of_json (deriver @@ o ()) json) in
      let input = Account_update.Update.Timing_info.to_input value in
      input

    let permissions_input (json : Js.js_string Js.t) : random_oracle_input =
      let deriver = Mina_base.Permissions.deriver in
      let json = json |> Js.to_string |> Yojson.Safe.from_string in
      let value = Fields_derivers_zkapps.(of_json (deriver @@ o ()) json) in
      let input = Mina_base.Permissions.to_input value in
      input

    let update_input (json : Js.js_string Js.t) : random_oracle_input =
      let deriver = Account_update.Update.deriver in
      let json = json |> Js.to_string |> Yojson.Safe.from_string in
      let value = Fields_derivers_zkapps.(of_json (deriver @@ o ()) json) in
      let input = Account_update.Update.to_input value in
      input

    let account_precondition_input (json : Js.js_string Js.t) :
        random_oracle_input =
      let deriver = Mina_base.Zkapp_precondition.Account.deriver in
      let json = json |> Js.to_string |> Yojson.Safe.from_string in
      let value = Fields_derivers_zkapps.(of_json (deriver @@ o ()) json) in
      let input = Mina_base.Zkapp_precondition.Account.to_input value in
      input

    let network_precondition_input (json : Js.js_string Js.t) :
        random_oracle_input =
      let deriver = Mina_base.Zkapp_precondition.Protocol_state.deriver in
      let json = json |> Js.to_string |> Yojson.Safe.from_string in
      let value = Fields_derivers_zkapps.(of_json (deriver @@ o ()) json) in
      let input = Mina_base.Zkapp_precondition.Protocol_state.to_input value in
      input

    let body_input (json : Js.js_string Js.t) : random_oracle_input =
      let json = json |> Js.to_string |> Yojson.Safe.from_string in
      let value = body_of_json json in
      let input = Account_update.Body.to_input value in
      input
  end

  module Transaction_hash = struct
    module Signed_command = Mina_base.Signed_command
    module Signed_command_payload = Mina_base.Signed_command_payload

    let ok_exn result =
      let open Ppx_deriving_yojson_runtime.Result in
      match result with Ok c -> c | Error e -> failwith ("not ok: " ^ e)

    let keypair () = Signature_lib.Keypair.create ()

    let hash_payment (command : Js.js_string Js.t) =
      let command : Signed_command.t =
        command |> Js.to_string |> Yojson.Safe.from_string
        |> Signed_command.of_yojson |> ok_exn
      in
      Mina_transaction.Transaction_hash.(
        command |> hash_signed_command |> to_base58_check |> Js.string)

    let hash_payment_v1 (command : Js.js_string Js.t) =
      let command : Signed_command.t_v1 =
        command |> Js.to_string |> Yojson.Safe.from_string
        |> Signed_command.Stable.V1.of_yojson |> ok_exn
      in
      let b58 = Signed_command.to_base58_check_v1 command in
      Mina_transaction.Transaction_hash.(
        b58 |> digest_string |> to_base58_check)
      |> Js.string

    let serialize_common (command : Js.js_string Js.t) =
      let command : Signed_command_payload.Common.t =
        command |> Js.to_string |> Yojson.Safe.from_string
        |> Signed_command_payload.Common.of_yojson |> ok_exn
      in
      Binable.to_bigstring
        (module Signed_command_payload.Common.Stable.Latest)
        command

    let serialize_payment (command : Js.js_string Js.t) =
      let command : Signed_command.t =
        command |> Js.to_string |> Yojson.Safe.from_string
        |> Signed_command.of_yojson |> ok_exn
      in
      Binable.to_bigstring (module Signed_command.Stable.Latest) command

    let serialize_payment_v1 (command : Js.js_string Js.t) =
      let command : Signed_command.t_v1 =
        command |> Js.to_string |> Yojson.Safe.from_string
        |> Signed_command.Stable.V1.of_yojson |> ok_exn
      in
      Signed_command.to_base58_check_v1 command |> Js.string

    let example_payment =
      let kp = keypair () in
      let payload : Signed_command_payload.t =
        { Signed_command_payload.dummy with
          body =
            Payment
              { Mina_base.Payment_payload.dummy with
                source_pk = Signature_lib.Public_key.compress kp.public_key
              }
        }
      in
      let payment = Signed_command.sign kp payload in
      (payment :> Signed_command.t)
      |> Signed_command.to_yojson |> Yojson.Safe.to_string |> Js.string
  end
end

let test =
  object%js
    val encoding =
      object%js
        val toBase58 = Test.Encoding.binary_string_to_base58_check

        val ofBase58 = Test.Encoding.binary_string_of_base58_check

        method publicKeyToBase58 = Test.Encoding.public_key_to_base58

        method publicKeyOfBase58 = Test.Encoding.public_key_of_base58

        method privateKeyToBase58 = Test.Encoding.private_key_to_base58

        method privateKeyOfBase58 = Test.Encoding.private_key_of_base58

        method tokenIdToBase58 = Test.Encoding.token_id_to_base58

        method tokenIdOfBase58 = Test.Encoding.token_id_of_base58

        method memoToBase58 = Test.Encoding.memo_to_base58

        method memoHashBase58 = Test.Encoding.memo_hash_base58
      end

    val tokenId =
      object%js
        method derive = Test.Token_id.derive

        method deriveChecked = Test.Token_id.derive_checked
      end

    val signature =
      object%js
        method signFieldElement = Test.Signature.sign_field_element

        val dummySignature = Test.Signature.dummy_signature
      end

    val fieldsFromJson =
      object%js
        method accountUpdate = Test.To_fields.account_update
      end

    val hashFromJson =
      object%js
        method accountUpdate = Test.Hash_from_json.account_update

        method transactionCommitments =
          Test.Hash_from_json.transaction_commitments

        method zkappPublicInput = Test.Hash_from_json.zkapp_public_input
      end

    val hashInputFromJson =
      let open Test.Hash_input in
      object%js
        val packInput = pack_input

        val timing = timing_input

        val permissions = permissions_input

        val accountPrecondition = account_precondition_input

        val networkPrecondition = network_precondition_input

        val update = update_input

        val body = body_input
      end

    val transactionHash =
      let open Test.Transaction_hash in
      object%js
        method hashPayment = hash_payment

        method hashPaymentV1 = hash_payment_v1

        method serializeCommon = serialize_common

        method serializePayment = serialize_payment

        method serializePaymentV1 = serialize_payment_v1

        method examplePayment = example_payment
      end
  end

(* export stuff *)

let export () =
  Js.export "Snarky" snarky ;
  Js.export "Ledger" Local_ledger.ledger_class ;
  Js.export "Pickles" Pickles_bindings.pickles ;
  Js.export "Test" test

let export_global () =
  let snarky_obj =
    Js.Unsafe.(
      let i = inject in
      obj
        [| ("Snarky", i snarky)
         ; ("Ledger", i Local_ledger.ledger_class)
         ; ("Pickles", i Pickles_bindings.pickles)
         ; ("Test", i test)
        |])
  in
  Js.Unsafe.(set global (Js.string "__snarky") snarky_obj)
