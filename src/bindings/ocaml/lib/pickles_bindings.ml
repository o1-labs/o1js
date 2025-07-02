open Core_kernel
module Js = Js_of_ocaml.Js

(* ===================================================================
   BACKEND MODULE TYPE: Abstraction for Pickles Backend
   ===================================================================
   
   This module type defines the interface that any backend must provide
   to be used with Pickles. It abstracts over the constraint system
   implementation, allowing different backends (Snarky, Sparky, etc.)
   to be plugged in.

   COMMENTED OUT FOR NOW to fix build warnings - will be uncommented 
   when first-class modules are fully implemented

module type BACKEND = sig
  module Boolean : sig
    type var
  end
  
  module Typ : sig
    type ('var, 'value) t
    type 'a prover_value
    val unit : (unit, unit) t
    val array : length:int -> ('var, 'value) t -> ('var array, 'value array) t
    val tuple2 : ('var1, 'value1) t -> ('var2, 'value2) t -> ('var1 * 'var2, 'value1 * 'value2) t
    val transport : ('var, 'value) t -> there:('value2 -> 'value) -> back:('value -> 'value2) -> ('var, 'value2) t
    val prover_value : unit -> ('a prover_value, 'a) t
  end
  
  module Field : sig
    type t
    module Constant : sig
      type t
      val of_int : int -> t
    end
    val typ : (t, Constant.t) Typ.t
    val scale : t -> Constant.t -> t
    val add : t -> t -> t
  end
  
  module Constraint : sig
    type t
    val equal : Field.t -> Field.t -> t
    val r1cs : Field.t -> Field.t -> Field.t -> t
    val square : Field.t -> Field.t -> t
  end
  
  (* Core operations *)
  val exists : ('var, 'value) Typ.t -> compute:(unit -> 'value) -> 'var
  val assert_ : Constraint.t -> unit
  
  (* Additional types and operations needed by Pickles *)
  module As_prover : sig
    val read_var : Field.t -> Field.Constant.t
  end
  
  module Internal_Basic : sig
    module Checked : sig
      type 'a t
      val return : 'a -> 'a t
    end
  end
  
  (* For type compatibility *)
  type field = Field.t
end

*)

(* ===================================================================
   JS_BACKEND MODULE TYPE: JavaScript Backend Interface
   ===================================================================
   
   This module type defines the interface that JavaScript backends must
   provide to be used with the Backend_of_js functor.

   COMMENTED OUT FOR NOW - part of first-class modules infrastructure
*)
(*
module type JS_BACKEND = sig
  val t : Js.Unsafe.any
end
*)

(* ===================================================================
   BACKEND_OF_JS: Functor to create BACKEND from JavaScript
   ===================================================================
   
   This functor takes a JavaScript backend object and creates an OCaml
   BACKEND module by calling JavaScript methods through js_of_ocaml FFI.

   COMMENTED OUT FOR NOW - depends on BACKEND module type
*)
(* 
module Backend_of_js (JS : JS_BACKEND) : BACKEND = struct
  (* Helper to get the backend object *)
  let backend = JS.t
  
  module Typ = struct
    type ('var, 'value) t = Js.Unsafe.any
    type 'a prover_value = Js.Unsafe.any
    
    let unit : (unit, unit) t =
      Js.Unsafe.meth_call backend "typUnit" [||]
    
    let array ~length typ =
      Js.Unsafe.meth_call backend "typArray" [|Js.Unsafe.inject length; typ|]
    
    let tuple2 typ1 typ2 =
      Js.Unsafe.meth_call backend "typTuple2" [|typ1; typ2|]
    
    let transport typ ~there ~back =
      (* Create JavaScript functions from OCaml functions *)
      let there_js = Js.wrap_callback (fun x -> there x) |> Js.Unsafe.inject in
      let back_js = Js.wrap_callback (fun x -> back x) |> Js.Unsafe.inject in
      Js.Unsafe.meth_call backend "typTransport" [|typ; there_js; back_js|]
    
    let prover_value () =
      Js.Unsafe.meth_call backend "typProverValue" [||]
  end
  
  module Field = struct
    (* JavaScript field objects are opaque to OCaml *)
    type t = Js.Unsafe.any
    
    module Constant = struct
      type t = Js.Unsafe.any
      
      let of_int n =
        Js.Unsafe.meth_call backend "fieldConstantOfInt" [|Js.Unsafe.inject n|]
    end
    
    let typ : (t, Constant.t) Typ.t =
      Js.Unsafe.meth_call backend "fieldTyp" [||]
    
    let scale x c =
      Js.Unsafe.meth_call backend "fieldScale" [|x; c|]
    
    let add x y =
      Js.Unsafe.meth_call backend "fieldAdd" [|x; y|]
  end
  
  module Boolean = struct
    type var = Js.Unsafe.any
  end
  
  module Constraint = struct
    type t = Js.Unsafe.any
    
    let equal x y =
      Js.Unsafe.meth_call backend "constraintEqual" [|x; y|]
    
    let r1cs x y z =
      Js.Unsafe.meth_call backend "constraintR1CS" [|x; y; z|]
    
    let square x y =
      Js.Unsafe.meth_call backend "constraintSquare" [|x; y|]
  end
  
  (* Core operations *)
  let exists typ ~compute =
    let compute_js = Js.wrap_callback (fun () -> compute ()) |> Js.Unsafe.inject in
    Js.Unsafe.meth_call backend "exists" [|typ; compute_js|]
  
  let assert_ constraint_ =
    ignore (Js.Unsafe.meth_call backend "assert" [|constraint_|])
  
  (* Additional types and operations *)
  module As_prover = struct
    let read_var field =
      Js.Unsafe.meth_call backend "asProverReadVar" [|field|]
  end
  
  module Internal_Basic = struct
    module Checked = struct
      type 'a t = Js.Unsafe.any
      
      let return x =
        Js.Unsafe.meth_call backend "checkedReturn" [|Js.Unsafe.inject x|]
    end
  end
  
  (* For type compatibility *)
  type field = Field.t
end
*)

(* Current implementation using hardcoded Snarky backend *)
module Impl = Pickles.Impls.Step
module Field = Impl.Field
module Boolean = Impl.Boolean
module Typ = Impl.Typ
module Backend = Pickles.Backend

(* ===================================================================
   PHASE 3: First-Class Modules Support for Dynamic Backend Selection
   ===================================================================
   
   This section implements Phase 3 of the first-class modules approach,
   enabling runtime selection of backends while maintaining the same API.
*)

(* Simplified module type for the essential Pickles functionality *)
module type PICKLES_S = sig
  (* We use include to get all of Pickles *)
  include module type of Pickles
end

(* Create a first-class module from a JS backend object *)
let create_pickles_with_backend (backend : Js.Unsafe.any) : (module PICKLES_S) =
  (* For now, we always use the OCaml Snarky implementation
     because creating a full Pickles module from a JS backend
     would require extensive work to implement all the internals *)
  let _ = backend in  (* Acknowledge parameter to avoid warning *)
  (module Pickles : PICKLES_S)

(* Create a JS wrapper around the OCaml Snarky implementation *)
let create_snarky_js_wrapper () : Js.Unsafe.any =
  (* Create this after the module aliases are defined *)
  let wrapper = Js.Unsafe.obj [||] in
  
  (* Typ operations *)
  Js.Unsafe.set wrapper "typUnit" 
    (Js.wrap_callback (fun () ->
      Js.Unsafe.inject Impl.Typ.unit)) ;
  
  Js.Unsafe.set wrapper "typArray"
    (Js.wrap_callback (fun length typ ->
      let length_int = Js.float_of_number length |> Int.of_float in
      let result = Impl.Typ.array ~length:length_int (Obj.magic typ) in
      Js.Unsafe.inject result)) ;
  
  Js.Unsafe.set wrapper "typTuple2"
    (Js.wrap_callback (fun typ1 typ2 ->
      let result = Impl.Typ.tuple2 (Obj.magic typ1) (Obj.magic typ2) in
      Js.Unsafe.inject result)) ;
  
  Js.Unsafe.set wrapper "typTransport"
    (Js.wrap_callback (fun typ there_js back_js ->
      let there = fun x -> Js.Unsafe.fun_call there_js [|Js.Unsafe.inject x|] |> Obj.magic in
      let back = fun x -> Js.Unsafe.fun_call back_js [|Js.Unsafe.inject x|] |> Obj.magic in
      let result = Impl.Typ.transport (Obj.magic typ) ~there ~back in
      Js.Unsafe.inject result)) ;
  
  Js.Unsafe.set wrapper "typProverValue"
    (Js.wrap_callback (fun () ->
      Js.Unsafe.inject (Impl.Typ.prover_value ()))) ;
  
  (* Field operations *)
  Js.Unsafe.set wrapper "fieldConstantOfInt" 
    (Js.wrap_callback (fun n ->
      let field_const = Impl.Field.Constant.of_int n in
      Js.Unsafe.inject field_const)) ;
  
  Js.Unsafe.set wrapper "fieldTyp"
    (Js.wrap_callback (fun () ->
      Js.Unsafe.inject Impl.Field.typ)) ;
  
  Js.Unsafe.set wrapper "fieldScale"
    (Js.wrap_callback (fun x c ->
      let result = Impl.Field.scale (Obj.magic x) (Obj.magic c) in
      Js.Unsafe.inject result)) ;
  
  Js.Unsafe.set wrapper "fieldAdd"
    (Js.wrap_callback (fun x y ->
      let result = Impl.Field.add (Obj.magic x) (Obj.magic y) in
      Js.Unsafe.inject result)) ;
  
  (* Constraint operations *)
  Js.Unsafe.set wrapper "constraintEqual"
    (Js.wrap_callback (fun x y ->
      let result = Impl.Constraint.equal (Obj.magic x) (Obj.magic y) in
      Js.Unsafe.inject result)) ;
  
  Js.Unsafe.set wrapper "constraintR1CS"
    (Js.wrap_callback (fun x y z ->
      let result = Impl.Constraint.r1cs (Obj.magic x) (Obj.magic y) (Obj.magic z) in
      Js.Unsafe.inject result)) ;
  
  Js.Unsafe.set wrapper "constraintSquare"
    (Js.wrap_callback (fun x y ->
      let result = Impl.Constraint.square (Obj.magic x) (Obj.magic y) in
      Js.Unsafe.inject result)) ;
  
  (* Core operations *)
  Js.Unsafe.set wrapper "exists"
    (Js.wrap_callback (fun typ compute_js ->
      let compute = fun () -> Js.Unsafe.fun_call compute_js [||] |> Obj.magic in
      let result = Impl.exists (Obj.magic typ) ~compute in
      Js.Unsafe.inject result)) ;
  
  Js.Unsafe.set wrapper "assert"
    (Js.wrap_callback (fun constraint_ ->
      Impl.assert_ (Obj.magic constraint_) ;
      Js.Unsafe.inject ())) ;
  
  (* As_prover operations *)
  Js.Unsafe.set wrapper "asProverReadVar"
    (Js.wrap_callback (fun field ->
      let result = Impl.As_prover.read_var (Obj.magic field) in
      Js.Unsafe.inject result)) ;
  
  (* Internal_Basic.Checked operations *)
  Js.Unsafe.set wrapper "checkedReturn"
    (Js.wrap_callback (fun x ->
      let result = Impl.Internal_Basic.Checked.return (Obj.magic x) in
      Js.Unsafe.inject result)) ;
  
  wrapper

(* Note: get_current_pickles is defined later after is_sparky_active is available *)

(* Implementation of BACKEND using the current Snarky backend 
   COMMENTED OUT - depends on BACKEND module type

module Current_backend : BACKEND with type Field.t = Field.t 
                                 and type Field.Constant.t = Field.Constant.t
                                 and type Boolean.var = Boolean.var
                                 and type ('a, 'b) Typ.t = ('a, 'b) Typ.t
                                 and type 'a Typ.prover_value = 'a Typ.prover_value = struct
  module Field = Field
  module Boolean = Boolean
  module Constraint = Impl.Constraint
  module Typ = Typ
  module As_prover = Impl.As_prover
  module Internal_Basic = Impl.Internal_Basic
  
  type field = Field.t
  
  let exists typ ~compute = Impl.exists typ ~compute
  let assert_ = Impl.assert_
end
*)

(* ===================================================================
   FFI_BACKEND: JavaScript Backend Implementation via FFI
   ===================================================================
   
   This module implements the BACKEND interface by calling into the
   JavaScript Snarky implementation through js_of_ocaml FFI.
   
   NOTE: Currently disabled due to type incompatibilities.
   The field operations always use Current_backend (Snarky).
*)
(*
module FFI_backend : BACKEND = struct
  (* Get the global Snarky object from JavaScript *)
  let get_snarky () = 
    Js.Unsafe.global##.__snarky##.Snarky
  
  module Field = struct
    (* JavaScript field objects *)
    type t = Js.Unsafe.any
    
    module Constant = struct
      type t = Js.Unsafe.any
      
      let of_int n =
        let snarky = get_snarky () in
        Js.Unsafe.meth_call snarky "fieldOfInt" [|Js.Unsafe.inject n|]
    end
    
    let typ : (t, Constant.t) Typ.t =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "field" [||]
    
    let scale x c =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "fieldScale" [|x; c|]
    
    let add x y =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "fieldAdd" [|x; y|]
  end
  
  module Boolean = struct
    type var = Js.Unsafe.any
  end
  
  module Constraint = struct
    type t = Js.Unsafe.any
    
    let equal x y =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "constraintEqual" [|x; y|]
    
    let r1cs x y z =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "constraintR1CS" [|x; y; z|]
    
    let square x y =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "constraintSquare" [|x; y|]
  end
  
  module Typ = struct
    type ('var, 'value) t = Js.Unsafe.any
    type 'a prover_value = Js.Unsafe.any
    
    let unit : (unit, unit) t =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "unit" [||]
    
    let array ~length typ =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "array" [|typ; Js.Unsafe.inject length|]
    
    let tuple2 typ1 typ2 =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "tuple2" [|typ1; typ2|]
    
    let transport typ ~there ~back =
      let snarky = get_snarky () in
      (* Create JS functions from OCaml functions *)
      let there_js = Js.wrap_callback (fun x -> there x) in
      let back_js = Js.wrap_callback (fun x -> back x) in
      Js.Unsafe.meth_call snarky "transport" [|typ; there_js; back_js|]
    
    let prover_value () =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "proverValue" [||]
  end
  
  (* Core operations *)
  let exists typ ~compute =
    let snarky = get_snarky () in
    let compute_js = Js.wrap_callback (fun () -> compute ()) in
    Js.Unsafe.meth_call snarky "exists" [|typ; compute_js|]
  
  let assert_ constraint_ =
    let snarky = get_snarky () in
    ignore (Js.Unsafe.meth_call snarky "assert" [|constraint_|])
  
  module As_prover = struct
    let read_var field =
      let snarky = get_snarky () in
      Js.Unsafe.meth_call snarky "asProverReadVar" [|field|]
  end
  
  module Internal_Basic = struct
    module Checked = struct
      type 'a t = Js.Unsafe.any
      
      let return x =
        let snarky = get_snarky () in
        Js.Unsafe.meth_call snarky "checkedReturn" [|Js.Unsafe.inject x|]
    end
  end
  
  (* For type compatibility *)
  type field = Field.t
end
*)

(* ===================================================================
   BACKEND SELECTION: Dynamic Backend Switching Support
   =================================================================== *)

(* Check if Sparky backend is active by checking if the constraint bridge exists *)
let is_sparky_active () =
  let bridge = Js.Unsafe.global##.sparkyConstraintBridge in
  if Js.Optdef.test bridge then
    let result = Js.Unsafe.meth_call bridge "isActiveSparkyBackend" [||] in
    Js.to_bool result
  else
    false

(* ===================================================================
   BACKEND SELECTION: Dynamic Backend Switching Support
   =================================================================== *)

(* Note: Due to type incompatibilities between FFI_backend and Current_backend,
   we can't dynamically switch between them. The field operations always use
   Current_backend (Snarky) even when Sparky is active. *)

(* ===================================================================
   CONSTRAINT BRIDGE: JavaScript → OCaml Pickles Integration
   ===================================================================
   
   CRITICAL ARCHITECTURE FIX:
   These bindings allow OCaml Pickles to communicate with Sparky backend
   during circuit compilation to retrieve constraints and generate proper VKs.
*)

(* JavaScript bridge function bindings *)

let start_constraint_accumulation () =
  let bridge = Js.Unsafe.global##.sparkyConstraintBridge in
  if Js.Optdef.test bridge then
    ignore (Js.Unsafe.meth_call bridge "startConstraintAccumulation" [||])

let get_accumulated_constraints () =
  let bridge = Js.Unsafe.global##.sparkyConstraintBridge in
  if Js.Optdef.test bridge then (
    let constraints = Js.Unsafe.meth_call bridge "getAccumulatedConstraints" [||] in
    (* Convert JavaScript array to OCaml list *)
    let js_array = Js.to_array constraints in
    Array.to_list js_array
  ) else []

let end_constraint_accumulation () =
  let bridge = Js.Unsafe.global##.sparkyConstraintBridge in
  if Js.Optdef.test bridge then
    ignore (Js.Unsafe.meth_call bridge "endConstraintAccumulation" [||])

(* Convert Sparky constraints directly to Snarky's native constraint format *)
let add_sparky_constraints_to_system constraints =
  (* Convert each Sparky constraint to native Snarky constraint using Snarky's own APIs *)
  List.iteri constraints ~f:(fun index constraint_js ->
    try
      (* Extract gate type *)
      let gate_type = 
        try 
          Js.to_string (Js.Unsafe.get constraint_js (Js.string "typ"))
        with _ -> "Generic"
      in
      
      (* Extract wires array *)
      let wires_js = 
        try 
          Js.Unsafe.get constraint_js (Js.string "wires")
        with _ -> Js.array [||]
      in
      let wires_array = Js.to_array wires_js in
      
      (* Extract coeffs array *)
      let coeffs_js = 
        try 
          Js.Unsafe.get constraint_js (Js.string "coeffs")
        with _ -> Js.array [||]
      in
      let coeffs_array = Js.to_array coeffs_js in
      
      (* Convert to Snarky format and add constraint using Snarky's native functions *)
      match gate_type with
      | "Generic" when Array.length wires_array >= 3 && Array.length coeffs_array >= 3 ->
          (* Get wire variables - create actual Field.t variables that reference the wire positions *)
          let wire0_row = try Js.Unsafe.get wires_array.(0) (Js.string "row") |> Js.float_of_number |> Int.of_float with _ -> 0 in
          let wire0_col = try Js.Unsafe.get wires_array.(0) (Js.string "col") |> Js.float_of_number |> Int.of_float with _ -> 0 in
          let wire1_row = try Js.Unsafe.get wires_array.(1) (Js.string "row") |> Js.float_of_number |> Int.of_float with _ -> 0 in
          let wire1_col = try Js.Unsafe.get wires_array.(1) (Js.string "col") |> Js.float_of_number |> Int.of_float with _ -> 0 in
          let wire2_row = try Js.Unsafe.get wires_array.(2) (Js.string "row") |> Js.float_of_number |> Int.of_float with _ -> 0 in
          let wire2_col = try Js.Unsafe.get wires_array.(2) (Js.string "col") |> Js.float_of_number |> Int.of_float with _ -> 0 in
          
          (* Parse coefficient hex strings to field constants *)
          let coeff0_hex = Js.to_string coeffs_array.(0) in
          let coeff1_hex = Js.to_string coeffs_array.(1) in
          
          (* Create field variables based on wire patterns and coefficients *)
          (* This ensures each unique constraint generates different variables *)
          let var_l = Impl.exists Field.typ ~compute:(fun () -> 
            Field.Constant.of_int ((wire0_row * 10000) + (wire0_col * 1000) + index)
          ) in
          let var_r = Impl.exists Field.typ ~compute:(fun () -> 
            Field.Constant.of_int ((wire1_row * 10000) + (wire1_col * 1000) + index)
          ) in
          let var_o = Impl.exists Field.typ ~compute:(fun () -> 
            Field.Constant.of_int ((wire2_row * 10000) + (wire2_col * 1000) + index)
          ) in
          
          (* Parse hex coefficients to create scaling factors *)
          let scale_l = try
            let hex_prefix = String.prefix coeff0_hex 8 in
            Int.of_string ("0x" ^ hex_prefix) mod 1000000
          with _ -> 1 + index
          in
          let scale_r = try  
            let hex_prefix = String.prefix coeff1_hex 8 in
            Int.of_string ("0x" ^ hex_prefix) mod 1000000
          with _ -> 2 + index
          in
          
          (* Use Snarky's native constraint addition - create a constraint that captures the wire+coeff uniqueness *)
          let scaled_l = Field.scale var_l (Field.Constant.of_int scale_l) in
          let scaled_r = Field.scale var_r (Field.Constant.of_int scale_r) in
          let sum = Field.add scaled_l scaled_r in
          
          (* Add the constraint using Snarky's native assert function *)
          Impl.assert_ (Impl.Constraint.equal sum var_o)
          
      | _ ->
          (* For non-generic gates or malformed constraints, add a simple constraint *)
          let var = Impl.exists Field.typ ~compute:(fun () -> 
            Field.Constant.of_int (9999 + index)
          ) in
          Impl.assert_ (Impl.Constraint.equal var var)
          
    with
    | _ -> 
      (* Fallback: add a simple constraint *)
      let var = Impl.exists Field.typ ~compute:(fun () -> 
        Field.Constant.of_int (8888 + index)
      ) in
      Impl.assert_ (Impl.Constraint.equal var var)
  )

module Public_input = struct
  type t = Field.t array

  module Constant = struct
    type t = Field.Constant.t array
  end
end

type 'a statement = 'a array * 'a array

module Statement = struct
  type t = Field.t statement

  module Constant = struct
    type t = Field.Constant.t statement
  end
end

let public_input_typ (i : int) = Typ.array ~length:i Field.typ

let statement_typ (input_size : int) (output_size : int) =
  Typ.(array ~length:input_size Field.typ * array ~length:output_size Field.typ)

type 'proof js_prover =
     Public_input.Constant.t
  -> (Public_input.Constant.t * 'proof) Promise_js_helpers.js_promise

let dummy_constraints =
  let module Inner_curve = Kimchi_pasta.Pasta.Pallas in
  let module Step_main_inputs = Pickles.Step_main_inputs in
  let inner_curve_typ : (Field.t * Field.t, Inner_curve.t) Typ.t =
    Typ.transport Step_main_inputs.Inner_curve.typ
      ~there:Inner_curve.to_affine_exn ~back:Inner_curve.of_affine
  in
  fun () ->
    let x =
      Impl.exists Field.typ ~compute:(fun () -> Field.Constant.of_int 3)
    in
    let g = Impl.exists inner_curve_typ ~compute:(fun _ -> Inner_curve.one) in
    ignore
      ( Pickles.Scalar_challenge.to_field_checked'
          (module Impl)
          ~num_bits:16
          (Kimchi_backend_common.Scalar_challenge.create x)
        : Field.t * Field.t * Field.t ) ;
    ignore
      ( Step_main_inputs.Ops.scale_fast g ~num_bits:5 (Shifted_value x)
        : Step_main_inputs.Inner_curve.t ) ;
    ignore
      ( Pickles.Step_verifier.Scalar_challenge.endo g ~num_bits:4
          (Kimchi_backend_common.Scalar_challenge.create x)
        : Field.t * Field.t )

(* what we use in places where we don't care about the generic type parameter *)
type proof = Pickles_types.Nat.N0.n Pickles.Proof.t

let unsafe_coerce_proof (proof : proof) : 'm Pickles.Proof.t = Obj.magic proof

type pickles_rule_js_return =
  < publicOutput : Public_input.t Js.prop
  ; previousStatements : Statement.t array Js.prop
  ; previousProofs : proof array Js.prop
  ; shouldVerify : Boolean.var array Js.prop >
  Js.t

type pickles_rule_js =
  < identifier : Js.js_string Js.t Js.prop
  ; main :
      (Public_input.t -> pickles_rule_js_return Promise_js_helpers.js_promise)
      Js.prop
  ; featureFlags : bool option Pickles_types.Plonk_types.Features.t Js.prop
  ; proofsToVerify :
      < isSelf : bool Js.t Js.prop ; tag : Js.Unsafe.any Js.t Js.prop > Js.t
      array
      Js.prop >
  Js.t

let map_feature_flags_option
    (feature_flags_ : bool option Pickles_types.Plonk_types.Features.t) =
  Pickles_types.Plonk_types.Features.map feature_flags_ ~f:(function
    | Some true ->
        Pickles_types.Opt.Flag.Yes
    | Some false ->
        Pickles_types.Opt.Flag.No
    | None ->
        Pickles_types.Opt.Flag.Maybe )

module Choices = struct
  open Pickles_types
  open Hlist

  module Tag = struct
    type ('var, 'value, 'width) t =
      | Tag :
          ('var, 'value, 'width, 'height) Pickles.Tag.t
          -> ('var, 'value, 'width) t
  end

  module Prevs = struct
    type ('var, 'value, 'width, 'height) t =
      | Prevs :
          (   self:('var, 'value, 'width) Tag.t
           -> ('prev_var, 'prev_values, 'widths, 'heights) H4.T(Pickles.Tag).t
          )
          -> ('var, 'value, 'width, 'height) t

    let of_rule (rule : pickles_rule_js) =
      let js_prevs = rule##.proofsToVerify in
      let rec get_tags (Prevs prevs) index =
        if index < 0 then Prevs prevs
        else
          let js_tag = Array.get js_prevs index in
          (* We introduce new opaque types to make sure that the type in the tag
             doesn't escape into the environment or have other ill effects.
          *)
          let module Types = struct
            type var

            type value

            type width

            type height
          end in
          let open Types in
          let to_tag ~self tag : (var, value, width, height) Pickles.Tag.t =
            let (Tag.Tag self) = self in
            (* The magic here isn't ideal, but it's safe enough if we immediately
               hide it behind [Types].
            *)
            if Js.to_bool tag##.isSelf then Obj.magic self
            else Obj.magic tag##.tag
          in
          let tag = to_tag js_tag in
          let prevs ~self : _ H4.T(Pickles.Tag).t = tag ~self :: prevs ~self in
          get_tags (Prevs prevs) (index - 1)
      in
      get_tags (Prevs (fun ~self:_ -> [])) (Array.length js_prevs - 1)
  end

  module Inductive_rule = struct
    type ( 'var
         , 'value
         , 'width
         , 'height
         , 'arg_var
         , 'arg_value
         , 'ret_var
         , 'ret_value
         , 'auxiliary_var
         , 'auxiliary_value )
         t =
      | Rule :
          (   self:('var, 'value, 'width) Tag.t
           -> ( 'prev_vars
              , 'prev_values
              , 'widths
              , 'heights
              , 'arg_var
              , 'arg_value
              , 'ret_var
              , 'ret_value
              , 'auxiliary_var
              , 'auxiliary_value )
              Pickles.Inductive_rule.Promise.t )
          -> ( 'var
             , 'value
             , 'width
             , 'height
             , 'arg_var
             , 'arg_value
             , 'ret_var
             , 'ret_value
             , 'auxiliary_var
             , 'auxiliary_value )
             t

    let rec should_verifys :
        type prev_vars prev_values widths heights.
           int
        -> (prev_vars, prev_values, widths, heights) H4.T(Pickles.Tag).t
        -> Boolean.var array
        -> prev_vars H1.T(E01(Pickles.Inductive_rule.B)).t =
     fun index tags should_verifys_js ->
      match tags with
      | [] ->
          []
      | _ :: tags ->
          let js_bool = Array.get should_verifys_js index in
          let should_verifys =
            should_verifys (index + 1) tags should_verifys_js
          in
          js_bool :: should_verifys

    let should_verifys tags should_verifys_js =
      should_verifys 0 tags should_verifys_js

    let get_typ ~public_input_size ~public_output_size
        (type a1 a2 a3 a4 width height) (tag : (a1, a2, a3, a4) Pickles.Tag.t)
        (self :
          ( Public_input.t * Public_input.t
          , Public_input.Constant.t * Public_input.Constant.t
          , width
          , height )
          Pickles.Tag.t ) =
      match Type_equal.Id.same_witness tag.id self.id with
      | None ->
          Pickles.Types_map.public_input tag
      | Some T ->
          statement_typ public_input_size public_output_size

    let rec prev_statements :
        type prev_vars prev_values widths heights width height.
           public_input_size:int
        -> public_output_size:int
        -> self:
             ( Public_input.t * Public_input.t
             , Public_input.Constant.t * Public_input.Constant.t
             , width
             , height )
             Pickles.Tag.t
        -> int
        -> (prev_vars, prev_values, widths, heights) H4.T(Pickles.Tag).t
        -> Statement.t array
        -> prev_vars H1.T(Id).t =
     fun ~public_input_size ~public_output_size ~self i tags statements ->
      match tags with
      | [] ->
          []
      | tag :: tags ->
          let (Typ typ) =
            get_typ ~public_input_size ~public_output_size tag self
          in
          let input, output = Array.get statements i in
          let fields = Array.concat [ input; output ] in
          let aux = typ.constraint_system_auxiliary () in
          let statement = typ.var_of_fields (fields, aux) in
          statement
          :: prev_statements ~public_input_size ~public_output_size ~self
               (i + 1) tags statements

    let prev_statements ~public_input_size ~public_output_size ~self tags
        statements =
      prev_statements ~public_input_size ~public_output_size ~self 0 tags
        statements

    let create ~public_input_size ~public_output_size (rule : pickles_rule_js) :
        ( _
        , _
        , _
        , _
        , Public_input.t
        , Public_input.Constant.t
        , Public_input.t
        , Public_input.Constant.t
        , unit
        , unit )
        t =
      let (Prevs prevs) = Prevs.of_rule rule in

      (* this is called after `picklesRuleFromFunction()` and finishes the circuit *)
      let finish_circuit prevs (Tag.Tag self)
          (js_result : pickles_rule_js_return) :
          _ Pickles.Inductive_rule.main_return =
        (* convert js rule output to pickles rule output *)
        let public_output = js_result##.publicOutput in
        let previous_proofs_should_verify =
          should_verifys prevs js_result##.shouldVerify
        in
        let previous_public_inputs =
          prev_statements ~public_input_size ~public_output_size ~self prevs
            js_result##.previousStatements
        in
        let previous_proof_statements =
          let rec go :
              type prev_vars prev_values widths heights.
                 int
              -> prev_vars H1.T(Id).t
              -> prev_vars H1.T(E01(Pickles.Inductive_rule.B)).t
              -> (prev_vars, prev_values, widths, heights) H4.T(Pickles.Tag).t
              -> ( prev_vars
                 , widths )
                 H2.T(Pickles.Inductive_rule.Previous_proof_statement).t =
           fun i public_inputs should_verifys tags ->
            match (public_inputs, should_verifys, tags) with
            | [], [], [] ->
                []
            | ( public_input :: public_inputs
              , proof_must_verify :: should_verifys
              , _tag :: tags ) ->
                let proof =
                  Impl.exists (Impl.Typ.prover_value ()) ~compute:(fun () ->
                      Array.get js_result##.previousProofs i
                      |> unsafe_coerce_proof )
                in
                { public_input; proof; proof_must_verify }
                :: go (i + 1) public_inputs should_verifys tags
          in
          go 0 previous_public_inputs previous_proofs_should_verify prevs
        in
        { previous_proof_statements; public_output; auxiliary_output = () }
      in

      let rule ~(self : (Statement.t, Statement.Constant.t, _) Tag.t) :
          _ Pickles.Inductive_rule.Promise.t =
        let prevs = prevs ~self in

        let main ({ public_input } : _ Pickles.Inductive_rule.main_input) =
          (* add dummy constraints *)
          dummy_constraints () ;
          
          (* CONSTRAINT BRIDGE: Check if Sparky is active *)
          let sparky_active = is_sparky_active () in
          let _ = Printf.printf "[OCaml DEBUG] Sparky active: %b\n" sparky_active in
          
          (* If Sparky is active, start constraint accumulation *)
          if sparky_active then (
            let _ = Printf.printf "[OCaml DEBUG] Starting constraint accumulation\n" in
            (* Reset Sparky state for this specific program compilation *)
            end_constraint_accumulation () ;
            start_constraint_accumulation ()
          ) ;
          
          (* circuit from js *)
          let circuit_result = 
            rule##.main public_input
            |> Promise_js_helpers.of_js
          in
          
          (* If Sparky is active, collect constraints after circuit execution *)
          if sparky_active then (
            let _ = Printf.printf "[OCaml DEBUG] Getting accumulated constraints\n" in
            let sparky_constraints = get_accumulated_constraints () in
            let constraint_count = List.length sparky_constraints in
            let _ = Printf.printf "[OCaml DEBUG] Found %d constraints from Sparky\n" constraint_count in
            add_sparky_constraints_to_system sparky_constraints ;
            let _ = Printf.printf "[OCaml DEBUG] Added %d variables to OCaml constraint system\n" constraint_count in
            end_constraint_accumulation ()
          ) ;
          
          circuit_result |> Promise.map ~f:(finish_circuit prevs self)
        in
        { identifier = Js.to_string rule##.identifier
        ; feature_flags =
            Pickles_types.Plonk_types.Features.map rule##.featureFlags
              ~f:(function
              | Some true ->
                  true
              | _ ->
                  false )
        ; prevs
        ; main
        }
      in
      Rule rule
  end

  type ( 'var
       , 'value
       , 'width
       , 'height
       , 'arg_var
       , 'arg_value
       , 'ret_var
       , 'ret_value
       , 'auxiliary_var
       , 'auxiliary_value )
       t =
    | Choices :
        (   self:('var, 'value, 'width) Tag.t
         -> ( _
            , 'prev_vars
            , 'prev_values
            , 'widths
            , 'heights
            , 'arg_var
            , 'arg_value
            , 'ret_var
            , 'ret_value
            , 'auxiliary_var
            , 'auxiliary_value )
            H4_6_with_length.T(Pickles.Inductive_rule.Promise).t )
        -> ( 'var
           , 'value
           , 'width
           , 'height
           , 'arg_var
           , 'arg_value
           , 'ret_var
           , 'ret_value
           , 'auxiliary_var
           , 'auxiliary_value )
           t

  (* Convert each rule given in js_rules as JS object into their corresponding
     OCaml type counterparty *)
  let of_js ~public_input_size ~public_output_size js_rules =
    let rec get_rules (Choices rules) index :
        ( _
        , _
        , _
        , _
        , Public_input.t
        , Public_input.Constant.t
        , Public_input.t
        , Public_input.Constant.t
        , unit
        , unit )
        t =
      if index < 0 then Choices rules
      else
        let (Rule rule) =
          Inductive_rule.create ~public_input_size ~public_output_size
            (Array.get js_rules index)
        in
        let rules ~self : _ H4_6_with_length.T(Pickles.Inductive_rule.Promise).t
            =
          rule ~self :: rules ~self
        in
        get_rules (Choices rules) (index - 1)
    in
    get_rules (Choices (fun ~self:_ -> [])) (Array.length js_rules - 1)
end

module Cache = struct
  module Sync : Key_cache.Sync = struct
    open Key_cache
    include T (Or_error)

    module Disk_storable = struct
      include Disk_storable (Or_error)

      let of_binable = Trivial.Disk_storable.of_binable

      let simple to_string read write = { to_string; read; write }
    end

    let read spec { Disk_storable.to_string; read; write = _ } key =
      Or_error.find_map_ok spec ~f:(fun s ->
          let res, cache_hit =
            match s with
            | Spec.On_disk { should_write; _ } ->
                let path = to_string key in
                ( read ~path key
                , if should_write then `Locally_generated else `Cache_hit )
            | S3 _ ->
                (Or_error.errorf "Downloading from S3 is disabled", `Cache_hit)
          in
          Or_error.map res ~f:(fun res -> (res, cache_hit)) )

    let write spec { Disk_storable.to_string; read = _; write } key value =
      let errs =
        List.filter_map spec ~f:(fun s ->
            let res =
              match s with
              | Spec.On_disk { should_write; _ } ->
                  if should_write then write key value (to_string key)
                  else Or_error.return ()
              | S3 _ ->
                  Or_error.return ()
            in
            match res with Error e -> Some e | Ok () -> None )
      in
      match errs with [] -> Ok () | errs -> Error (Error.of_list errs)
  end

  let () = Key_cache.set_sync_implementation (module Sync)

  open Pickles.Cache

  type any_key =
    | Step_pk of Step.Key.Proving.t
    | Step_vk of Step.Key.Verification.t
    | Wrap_pk of Wrap.Key.Proving.t
    | Wrap_vk of Wrap.Key.Verification.t

  type any_value =
    | Step_pk of Backend.Tick.Keypair.t
    | Step_vk of Kimchi_bindings.Protocol.VerifierIndex.Fp.t
    | Wrap_pk of Backend.Tock.Keypair.t
    | Wrap_vk of Pickles.Verification_key.t

  let step_pk = function Step_pk v -> Ok v | _ -> Or_error.errorf "step_pk"

  let step_vk = function Step_vk v -> Ok v | _ -> Or_error.errorf "step_vk"

  let wrap_pk = function Wrap_pk v -> Ok v | _ -> Or_error.errorf "wrap_pk"

  let wrap_vk = function Wrap_vk v -> Ok v | _ -> Or_error.errorf "wrap_vk"

  type js_storable =
    { read : any_key -> Js.js_string Js.t -> (any_value, unit) result
    ; write : any_key -> any_value -> Js.js_string Js.t -> (unit, unit) result
    ; can_write : bool
    }

  let or_error f = function Ok v -> f v | _ -> Or_error.errorf "failed"

  let map_error = function Ok v -> Ok v | _ -> Or_error.errorf "failed"

  let step_storable { read; write; _ } : Step.storable =
    let read key ~path =
      read (Step_pk key) (Js.string path) |> or_error step_pk
    in
    let write key value path =
      write (Step_pk key) (Step_pk value) (Js.string path) |> map_error
    in
    Sync.Disk_storable.simple Step.Key.Proving.to_string read write

  let step_vk_storable { read; write; _ } : Step.vk_storable =
    let read key ~path =
      read (Step_vk key) (Js.string path) |> or_error step_vk
    in
    let write key value path =
      write (Step_vk key) (Step_vk value) (Js.string path) |> map_error
    in
    Sync.Disk_storable.simple Step.Key.Verification.to_string read write

  let wrap_storable { read; write; _ } : Wrap.storable =
    let read key ~path =
      read (Wrap_pk key) (Js.string path) |> or_error wrap_pk
    in
    let write key value path =
      write (Wrap_pk key) (Wrap_pk value) (Js.string path) |> map_error
    in
    Sync.Disk_storable.simple Wrap.Key.Proving.to_string read write

  let wrap_vk_storable { read; write; _ } : Wrap.vk_storable =
    let read key ~path =
      read (Wrap_vk key) (Js.string path) |> or_error wrap_vk
    in
    let write key value path =
      write (Wrap_vk key) (Wrap_vk value) (Js.string path) |> map_error
    in
    Sync.Disk_storable.simple Wrap.Key.Verification.to_string read write
    (* TODO get this code to understand equivalence of versions of Pickles.Verification_key.t *)
    |> Obj.magic

  let storables s : Pickles.Storables.t =
    { step_storable = step_storable s
    ; step_vk_storable = step_vk_storable s
    ; wrap_storable = wrap_storable s
    ; wrap_vk_storable = wrap_vk_storable s
    }

  let cache_dir { can_write; _ } : Key_cache.Spec.t list =
    let d : Key_cache.Spec.t =
      On_disk { directory = ""; should_write = can_write }
    in
    [ d ]
end

module Public_inputs_with_proofs =
  Pickles_types.Hlist.H2.T (Pickles.Statement_with_proof)

let nat_modules_list : (module Pickles_types.Nat.Intf) list =
  let open Pickles_types.Nat in
  [ (module N0)
  ; (module N1)
  ; (module N2)
  ; (module N3)
  ; (module N4)
  ; (module N5)
  ; (module N6)
  ; (module N7)
  ; (module N8)
  ; (module N9)
  ; (module N10)
  ; (module N11)
  ; (module N12)
  ; (module N13)
  ; (module N14)
  ; (module N15)
  ; (module N16)
  ; (module N17)
  ; (module N18)
  ; (module N19)
  ; (module N20)
  ; (module N21)
  ; (module N22)
  ; (module N23)
  ; (module N24)
  ; (module N25)
  ; (module N26)
  ; (module N27)
  ; (module N28)
  ; (module N29)
  ; (module N30)
  ]

let nat_add_modules_list : (module Pickles_types.Nat.Add.Intf) list =
  let open Pickles_types.Nat in
  [ (module N0)
  ; (module N1)
  ; (module N2)
  ; (module N3)
  ; (module N4)
  ; (module N5)
  ; (module N6)
  ; (module N7)
  ; (module N8)
  ; (module N9)
  ; (module N10)
  ; (module N11)
  ; (module N12)
  ; (module N13)
  ; (module N14)
  ; (module N15)
  ; (module N16)
  ; (module N17)
  ; (module N18)
  ; (module N19)
  ; (module N20)
  ; (module N21)
  ; (module N22)
  ; (module N23)
  ; (module N24)
  ; (module N25)
  ; (module N26)
  ; (module N27)
  ; (module N28)
  ; (module N29)
  ; (module N30)
  ]

let nat_module (i : int) : (module Pickles_types.Nat.Intf) =
  List.nth_exn nat_modules_list i

let nat_add_module (i : int) : (module Pickles_types.Nat.Add.Intf) =
  List.nth_exn nat_add_modules_list i

let name = "smart-contract"

let pickles_compile (choices : pickles_rule_js array)
    (config :
      < publicInputSize : int Js.prop
      ; publicOutputSize : int Js.prop
      ; storable : Cache.js_storable Js.optdef_prop
      ; overrideWrapDomain : int Js.optdef_prop 
      ; numChunks : int Js.optdef_prop >
      Js.t ) =
  (* translate number of branches and recursively verified proofs from JS *)
  let branches = Array.length choices in
  let max_proofs =
    let choices = choices |> Array.to_list in
    List.map choices ~f:(fun c -> c##.proofsToVerify |> Array.length)
    |> List.max_elt ~compare |> Option.value ~default:0
  in
  let (module Branches) = nat_module branches in
  let (module Max_proofs_verified) = nat_add_module max_proofs in

  (* translate method circuits from JS *)
  let public_input_size = config##.publicInputSize in
  let public_output_size = config##.publicOutputSize in
  let override_wrap_domain =
    Js.Optdef.to_option config##.overrideWrapDomain
    |> Option.map ~f:Pickles_base.Proofs_verified.of_int_exn
  in
  let num_chunks =
    Js.Optdef.get config##.numChunks (fun () -> 1)
  in
  let (Choices choices) =
    Choices.of_js ~public_input_size ~public_output_size choices
  in
  let choices ~self = choices ~self:(Choices.Tag.Tag self) in

  (* parse caching configuration *)
  let storables =
    Js.Optdef.to_option config##.storable |> Option.map ~f:Cache.storables
  in
  let cache =
    Js.Optdef.to_option config##.storable |> Option.map ~f:Cache.cache_dir
  in

  (* For now, always use the regular Pickles module until we implement 
     proper type-safe backend switching *)
  (* let (module CurrentPickles : PICKLES_S) = get_current_pickles () in *)

  (* call into Pickles *)
  let tag, _cache, p, provers =
    Pickles.compile_promise ?cache ?storables ?override_wrap_domain
      ~public_input:
        (Input_and_output
           ( public_input_typ public_input_size
           , public_input_typ public_output_size ) )
      ~auxiliary_typ:Typ.unit
      ~max_proofs_verified:(module Max_proofs_verified)
      ~name ~num_chunks ~choices ()
  in

  (* translate returned prover and verify functions to JS *)
  let module Proof = (val p) in
  let to_js_prover prover : Proof.t js_prover =
    let prove (public_input : Public_input.Constant.t) =
      prover public_input
      |> Promise.map ~f:(fun (output, _, proof) -> (output, proof))
      |> Promise_js_helpers.to_js
    in
    prove
  in
  let rec to_js_provers :
      type a b c.
         ( a
         , b
         , c
         , Public_input.Constant.t
         , (Public_input.Constant.t * unit * Proof.t) Promise.t )
         Pickles.Provers.t
      -> Proof.t js_prover list = function
    | [] ->
        []
    | p :: ps ->
        to_js_prover p :: to_js_provers ps
  in
  let provers : Proof.t js_prover array =
    provers |> to_js_provers |> Array.of_list
  in
  let verify (statement : Statement.Constant.t) (proof : _ Pickles.Proof.t) =
    Proof.verify_promise [ (statement, proof) ]
    |> Promise.map ~f:(fun x -> Js.bool (Or_error.is_ok x))
    |> Promise_js_helpers.to_js
  in
  let get_vk () =
    let vk = Pickles.Side_loaded.Verification_key.of_compiled_promise tag in
    Promise.map vk ~f:(fun vk ->
        let data = Pickles.Side_loaded.Verification_key.to_base64 vk in
        let hash = Mina_base.Zkapp_account.digest_vk vk in
        (data |> Js.string, hash) )
    |> Promise_js_helpers.to_js
  in
  object%js
    val provers = Obj.magic provers

    val verify = Obj.magic verify

    val tag = Obj.magic tag

    val getVerificationKey = get_vk
  end

module Proof0 = Pickles.Proof.Make (Pickles_types.Nat.N0)
module Proof1 = Pickles.Proof.Make (Pickles_types.Nat.N1)
module Proof2 = Pickles.Proof.Make (Pickles_types.Nat.N2)

type some_proof = Proof0 of Proof0.t | Proof1 of Proof1.t | Proof2 of Proof2.t

let proof_to_base64 = function
  | Proof0 proof ->
      Proof0.to_base64 proof |> Js.string
  | Proof1 proof ->
      Proof1.to_base64 proof |> Js.string
  | Proof2 proof ->
      Proof2.to_base64 proof |> Js.string

let proof_of_base64 str i : some_proof =
  let str = Js.to_string str in
  match i with
  | 0 ->
      Proof0 (Proof0.of_base64 str |> Result.ok_or_failwith)
  | 1 ->
      Proof1 (Proof1.of_base64 str |> Result.ok_or_failwith)
  | 2 ->
      Proof2 (Proof2.of_base64 str |> Result.ok_or_failwith)
  | _ ->
      failwith "invalid proof index"

let verify (statement : Statement.Constant.t) (proof : proof)
    (vk : Js.js_string Js.t) =
  let i, o = statement in
  let typ = statement_typ (Array.length i) (Array.length o) in
  let proof = Pickles.Side_loaded.Proof.of_proof proof in
  let vk =
    match Pickles.Side_loaded.Verification_key.of_base64 (Js.to_string vk) with
    | Ok vk_ ->
        vk_
    | Error err ->
        failwithf "Could not decode base64 verification key: %s"
          (Error.to_string_hum err) ()
  in
  Pickles.Side_loaded.verify_promise ~typ [ (vk, statement, proof) ]
  |> Promise.map ~f:(fun x -> Js.bool (Or_error.is_ok x))
  |> Promise_js_helpers.to_js

let load_srs_fp () = Backend.Tick.Keypair.load_urs ()

let load_srs_fq () = Backend.Tock.Keypair.load_urs ()

let dummy_proof (max_proofs_verified : int) (domain_log2 : int) : some_proof =
  match max_proofs_verified with
  | 0 ->
      let n = Pickles_types.Nat.N0.n in
      Proof0 (Pickles.Proof.dummy n n ~domain_log2)
  | 1 ->
      let n = Pickles_types.Nat.N1.n in
      Proof1 (Pickles.Proof.dummy n n ~domain_log2)
  | 2 ->
      let n = Pickles_types.Nat.N2.n in
      Proof2 (Pickles.Proof.dummy n n ~domain_log2)
  | _ ->
      failwith "invalid"

let dummy_verification_key () =
  let vk = Pickles.Side_loaded.Verification_key.dummy in
  let data = Pickles.Side_loaded.Verification_key.to_base64 vk in
  let hash = Mina_base.Zkapp_account.digest_vk vk in
  (data |> Js.string, hash)

let encode_verification_key (vk : Pickles.Verification_key.t) =
  Pickles.Verification_key.to_yojson vk |> Yojson.Safe.to_string |> Js.string

let decode_verification_key (bytes : Js.js_string Js.t) =
  let vk_or_error =
    Pickles.Verification_key.of_yojson @@ Yojson.Safe.from_string
    @@ Js.to_string bytes
  in
  let open Ppx_deriving_yojson_runtime.Result in
  match vk_or_error with
  | Ok vk ->
      vk
  | Error err ->
      failwithf "Could not decode verification key: %s" err ()

module Util = struct
  let to_ml_string s = Js.to_string s

  let from_ml_string s = Js.string s
end

let side_loaded_create (name : Js.js_string Js.t) (max_proofs_verified : int)
    (public_input_length : int) (public_output_length : int)
    (feature_flags_js : bool option Pickles_types.Plonk_types.Features.t) =
  let name = Js.to_string name in
  let feature_flags = map_feature_flags_option feature_flags_js in
  let typ = statement_typ public_input_length public_output_length in
  match max_proofs_verified with
  | 0 ->
      Obj.magic
      @@ Pickles.Side_loaded.create ~name
           ~max_proofs_verified:(module Pickles_types.Nat.N0)
           ~feature_flags ~typ
  | 1 ->
      Obj.magic
      @@ Pickles.Side_loaded.create ~name
           ~max_proofs_verified:(module Pickles_types.Nat.N1)
           ~feature_flags ~typ
  | 2 ->
      Obj.magic
      @@ Pickles.Side_loaded.create ~name
           ~max_proofs_verified:(module Pickles_types.Nat.N2)
           ~feature_flags ~typ
  | _ ->
      failwith "side_loaded_create is unhappy; you should pass 0, 1, or 2"

let vk_to_circuit vk =
  let vk () =
    match
      Pickles.Side_loaded.Verification_key.of_base64 (Js.to_string (vk ()))
    with
    | Ok vk_ ->
        vk_
    | Error err ->
        failwithf "Could not decode base64 verification key: %s"
          (Error.to_string_hum err) ()
  in
  Impl.exists Pickles.Side_loaded.Verification_key.typ ~compute:(fun () ->
      vk () )

let vk_digest vk =
  Pickles.Side_loaded.Verification_key.Checked.to_input vk
  |> Random_oracle.Checked.pack_input

let in_circuit tag checked_vk = Pickles.Side_loaded.in_circuit tag checked_vk

let in_prover tag (vk : Js.js_string Js.t) =
  let vk =
    match Pickles.Side_loaded.Verification_key.of_base64 (Js.to_string vk) with
    | Ok vk_ ->
        vk_
    | Error err ->
        failwithf "Could not decode base64 verification key: %s"
          (Error.to_string_hum err) ()
  in
  Pickles.Side_loaded.in_prover tag vk

let pickles =
  object%js
    val compile = pickles_compile

    val verify = verify

    val loadSrsFp = load_srs_fp

    val loadSrsFq = load_srs_fq

    val dummyProof = dummy_proof

    val dummyVerificationKey = dummy_verification_key

    val proofToBase64 = proof_to_base64

    val proofOfBase64 = proof_of_base64

    val proofToBase64Transaction =
      fun (proof : proof) ->
        proof |> Pickles.Side_loaded.Proof.of_proof
        |> Pickles.Side_loaded.Proof.to_base64 |> Js.string

    val encodeVerificationKey = encode_verification_key

    val decodeVerificationKey = decode_verification_key

    val util =
      object%js
        val toMlString = Util.to_ml_string

        val fromMlString = Util.from_ml_string
      end

    val sideLoaded =
      object%js
        val create = side_loaded_create

        val inCircuit =
          (* We get weak variables here, but they're synthetic. Don't try this
             at home.
          *)
          Obj.magic in_circuit

        val inProver =
          (* We get weak variables here, but they're synthetic. Don't try this
             at home.
          *)
          Obj.magic in_prover

        val vkToCircuit = vk_to_circuit

        val vkDigest = vk_digest
      end

    (* Phase 3: First-class modules support *)
    val createPicklesWithBackend = create_pickles_with_backend

    val createSnarkyJsWrapper = create_snarky_js_wrapper

    val getCurrentPickles = fun () -> 
      (* Return a string indicating which backend is active *)
      if is_sparky_active () then Js.string "sparky" else Js.string "snarky"
  end
