import { prop, CircuitValue } from './circuit_value';
import { Field, Bool, VerificationKey } from '../snarky';
import { PublicKey } from './signature';

export class Nat extends CircuitValue {
  @prop lsbFirst: Array<Bool>;
  @prop numBits: number;

  constructor(lsbFirst: Array<Bool>, numBits: number) {
    super();
    this.lsbFirst = lsbFirst;
    this.numBits = numBits;
  }
}
export class Currency extends Nat {
  constructor(lsbFirst: Array<Bool>, numBits: number) {
    super(lsbFirst, numBits)
  }
}

export class Amount extends Currency {
  constructor(lsbFirst: Array<Bool>) {
    super(lsbFirst, 64);
  }
}
export class Balance extends Currency {
  constructor(lsbFirst: Array<Bool>) {
    super(lsbFirst, 64);
  }
}
export class Fee extends Currency {
  constructor(lsbFirst: Array<Bool>) {
    super(lsbFirst, 64);
  }
}

export class GlobalSlot extends Nat {
  constructor(lsbFirst: Array<Bool>) {
    super(lsbFirst, 32);
  }
}

export class Timing extends CircuitValue {
  @prop initialMinimumBalance: Balance
  @prop cliffTime: GlobalSlot
  @prop cliffAmount: Amount
  @prop vestingPeriod: GlobalSlot
  @prop vestingIncrement: Amount

  constructor(initialMinimumBalance: Balance, cliffTime: GlobalSlot, cliffAmount: Amount, vestingPeriod: GlobalSlot, vestingIncrement: Amount) {
    super();
    this.initialMinimumBalance = initialMinimumBalance;
    this.cliffTime = cliffTime;
    this.cliffAmount = cliffAmount;
    this.vestingPeriod = vestingPeriod;
    this.vestingIncrement = vestingIncrement;
  }
}

export class Optional<T> extends CircuitValue {
/* TODO: How should we handle "Optional"s */
}

export class SetOrKeep<T> extends CircuitValue {
  @prop value: Optional<T>

  constructor(value: Optional<T>) {
    super();
    this.value = value;
  }
}

export class WithHash<T, H> extends CircuitValue {
  @prop value: T
  @prop hash: H

  constructor(value: T, hash: H) {
    super();
    this.value = value;
    this.hash = hash;
  }
}

export class Perm extends CircuitValue {
  @prop constant: Bool
  @prop signatureNecessary: Bool
  @prop signatureSufficient: Bool

  constructor(constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool) {
    super();
    this.constant = constant;
    this.signatureNecessary = signatureNecessary;
    this.signatureSufficient = signatureSufficient;
  }

  static createImpossible() {
    return new Perm(new Bool(true), new Bool(true), new Bool(false));
  }

  static createNone() {
    return new Perm(new Bool(true), new Bool(false), new Bool(true));
  }

  static createProof() {
    return new Perm(new Bool(false), new Bool(false), new Bool(false));
  }

  static createSignature() {
    return new Perm(new Bool(false), new Bool(true), new Bool(true));
  }

  static createEither() {
    return new Perm(new Bool(false), new Bool(false), new Bool(true));
  }

  static createBoth() {
    return new Perm(new Bool(false), new Bool(true), new Bool(false));
  }
}

export class Permissions extends CircuitValue {
  @prop stake: Bool
  @prop editState: Perm
  @prop send: Perm
  @prop receive: Perm
  @prop setDelegate: Perm
  @prop setPermissions: Perm
  @prop setVerificationKey: Perm
  @prop setSnappUri: Perm
  @prop editRollupState: Perm
  @prop setTokenSymbol: Perm

  constructor(stake: Bool, editState: Perm, send: Perm, receive: Perm, setDelegate: Perm, setPermissions: Perm, setVerificationKey: Perm, setSnappUri: Perm, editRollupState: Perm, setTokenSymbol: Perm) {
    super();
    this.stake = stake;
    this.editState = editState;
    this.send = send;
    this.receive = receive;
    this.setDelegate = setDelegate;
    this.setPermissions = setPermissions;
    this.setVerificationKey = setVerificationKey;
    this.setSnappUri = setSnappUri;
    this.editRollupState = editRollupState;
    this.setTokenSymbol = setTokenSymbol;
  }
}

/* TODO: How should we handle "String"s, should we bridge them from OCaml? */
export class String_ extends CircuitValue {}

export class TokenSymbol extends CircuitValue {
  // TODO: Figure out how to represent
  // (Bool, Num_bits.n) Pickles_types.Vector.t
}

export class Update extends CircuitValue {
  @prop appState: SetOrKeep<Field>
  @prop delegate: SetOrKeep<PublicKey>
  @prop verificationKey: SetOrKeep<WithHash<VerificationKey, Field>>
  @prop permissions: SetOrKeep<Permissions>
  @prop snappUri: SetOrKeep<String_>
  @prop tokenSymbol: SetOrKeep<TokenSymbol>
  @prop timing: SetOrKeep<Timing>

  constructor(
       appState: SetOrKeep<Field>,
       delegate:SetOrKeep<PublicKey>,
       verificationKey:SetOrKeep<WithHash<VerificationKey, Field>>,
       permissions:SetOrKeep<Permissions>,
       snappUri:SetOrKeep<String_>,
       tokenSymbol:SetOrKeep<TokenSymbol>,
       timing:SetOrKeep<Timing>
  ) {
    super();
    this.appState = appState;
    this.delegate = delegate;
    this.verificationKey = verificationKey;
    this.permissions = permissions;
    this.snappUri = snappUri;
    this.tokenSymbol = tokenSymbol;
    this.timing = timing;
  }
}


/*
  type timing = {
    // TODO: These all will change to the precise values instead
    .
    "initialMinimumBalance": string,
    "cliffTime": string,
    "cliffAmount": string,
    "vestingPeriod": string,
    "vestingIncrement": string
  };

  type permissions = {
    .
    "stake": bool,
    "editState": authRequired,
    "send": authRequired,
    "receive": authRequired,
    "setDelegate": authRequired,
    "setPermissions": authRequired,
    "setVerificationKey": authRequired,
    "setSnappUri": authRequired,
    "editRollupState": authRequired,
    "setTokenSymbol": authRequired
  };

  type verificationKeyWithHash = {
    .
    "verificationKey": string,
    "hash": string
  };

  type delta = {
    .
    "sign": sign,
    "magnitude": uint64
  };

  type account_action = {
    .
    "appState": list(Js.Undefined.t(field)),
    "delegate": Js.Undefined.t(publicKey),
    "verificationKey": Js.Undefined.t(verificationKeyWithHash),
    "permissions": Js.Undefined.t(permissions),
    "snappUri": Js.Undefined.t(string),
    "tokenSymbol": Js.Undefined.t(string),
    "timing": Js.Undefined.t(timing)
  };

  type body = {
    .
    "publicKey": publicKey,
    "update": update,
    "tokenId": int64,
    "delta": delta,
    "events": list(list(string)),
    "rollupEvents": list(list(string)),
    "callData": string
  };

  type state = {
    .
    "elements": list(Js.Undefined.t(field))
  };

  type account = {
    .
    "balance": Js.Undefined.t(interval(uint64)),
    "nonce": Js.Undefined.t(interval(uint32)),
    "receipt_chain_hash": Js.Undefined.t(string),
    "publicKey": Js.Undefined.t(publicKey),
    "delegate": Js.Undefined.t(publicKey),
    "state": state,
    "rollupState": Js.Undefined.t(field),
    "provedState": Js.Undefined.t(bool),
  };

  // null, null = Accept
  // Some, null = Full
  // null, Some = Nonce
  // Some, Some = <ill typed>
  type predicate = {
    .
    "account": Js.Undefined.t(account),
    "nonce": Js.Undefined.t(uint32)
  };

  type predicated('predicate) = {
    .
    "body": body,
    "predicate": 'predicate
  };

  type member('auth, 'predicate) = {
    .
    "authorization": 'auth,
    "data": predicated('predicate)
  };

  type proof_or_signature = {
    .
    "proof": Js.Undefined.t(proof),
    "signature": Js.Undefined.t(signature)
  };

  type protocolState = {
    .
    "snarkedLedgerHash": Js.Undefined.t(string),
    "snarkedNextAvailableToken": Js.Undefined.t(int64),
    "snarkedLedgerHash": Js.Undefined.t(string),
    "timestamp": Js.Undefined.t(interval(uint64)),
    "blockchainLength": Js.Undefined.t(uint32),
    "minWindowDensity": Js.Undefined.t(uint32),
    "lastVrfOutput": Js.Undefined.t(string),
    "totalCurrency": Js.Undefined.t(uint64),
    "globalSlotSinceHardFork": Js.Undefined.t(string),
    "globalSlotSinceGenesis": Js.Undefined.t(string),
    "stakingEpochData": Js.Undefined.t(string),
    "nextEpochData": Js.Undefined.t(string),
  }

  [@genType]
  type t = {
    .
    "feePayer": member(signature, uint32),
    "otherParties": array(member(proof_or_signature, predicate)),
    "protocolState": protocolState
  };
  */

// Act on the merkle tree
