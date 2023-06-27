open Core_kernel
module Js = Js_of_ocaml.Js
module Backend = Kimchi_backend.Pasta.Vesta_based_plonk
module Impl = Pickles.Impls.Step
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
      match x with Constant y -> y | y -> As_prover.read_var y

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

(* export stuff *)

let export () =
  Js.export "Snarky" snarky ;
  Js.export "Ledger" Local_ledger.ledger_class ;
  Js.export "Pickles" Pickles_bindings.pickles ;
  Js.export "Test" Consistency_test.test

let export_global () =
  let snarky_obj =
    Js.Unsafe.(
      let i = inject in
      obj
        [| ("Snarky", i snarky)
         ; ("Ledger", i Local_ledger.ledger_class)
         ; ("Pickles", i Pickles_bindings.pickles)
         ; ("Test", i Consistency_test.test)
        |])
  in
  Js.Unsafe.(set global (Js.string "__snarky") snarky_obj)
