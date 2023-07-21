module Js = Js_of_ocaml.Js
module Impl = Pickles.Impls.Step
module Field = Impl.Field
module Boolean = Impl.Boolean

module Public_input : sig
  type t = Field.t array

  module Constant : sig
    type t = Field.Constant.t array
  end
end

type 'a statement = 'a array * 'a array

module Statement : sig
  type t = Field.t statement

  module Constant : sig
    type t = Field.Constant.t statement
  end
end

type pickles_rule_js =
  < identifier : Js.js_string Js.t Js.prop
  ; main :
      (   Public_input.t
       -> < publicOutput : Public_input.t Js.prop
          ; previousStatements : Statement.t array Js.prop
          ; shouldVerify : Boolean.var array Js.prop >
          Js.t )
      Js.prop
  ; proofsToVerify :
      < isSelf : bool Js.t Js.prop ; tag : Js.Unsafe.any Js.t Js.prop > Js.t
      array
      Js.prop >
  Js.t

type proof = (Pickles_types.Nat.N0.n, Pickles_types.Nat.N0.n) Pickles.Proof.t

module Proof0 : sig
  type t = (Pickles_types.Nat.N0.n, Pickles_types.Nat.N0.n) Pickles.Proof.t
end

module Proof1 : sig
  type t = (Pickles_types.Nat.N1.n, Pickles_types.Nat.N1.n) Pickles.Proof.t
end

module Proof2 : sig
  type t = (Pickles_types.Nat.N2.n, Pickles_types.Nat.N2.n) Pickles.Proof.t
end

type some_proof = Proof0 of Proof0.t | Proof1 of Proof1.t | Proof2 of Proof2.t

val pickles :
  < compile :
      (   pickles_rule_js array
       -> < publicInputSize : int Js.prop ; publicOutputSize : int Js.prop >
          Js.t
       -> < getVerificationKey : (Js.js_string Js.t * Impl.field) Js.meth
          ; provers : 'a Js.readonly_prop
          ; tag : 'b Js.readonly_prop
          ; verify : 'c Js.readonly_prop >
          Js.t )
      Js.readonly_prop
  ; dummyBase64Proof : (unit -> Js.js_string Js.t) Js.readonly_prop
  ; dummyVerificationKey :
      (unit -> Js.js_string Js.t * Impl.field) Js.readonly_prop
  ; proofOfBase64 : (Js.js_string Js.t -> int -> some_proof) Js.readonly_prop
  ; proofToBase64 : (some_proof -> Js.js_string Js.t) Js.readonly_prop
  ; proofToBase64Transaction : (proof -> Js.js_string Js.t) Js.readonly_prop
  ; verify :
      (   Statement.Constant.t
       -> proof
       -> Js.js_string Js.t
       -> bool Js.t Promise_js_helpers.js_promise )
      Js.readonly_prop >
  Js.t
