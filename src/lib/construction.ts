import { Field, Proof } from '../snarky';
import { PublicKey, Signature } from './signature';

const SnappStateLength = 8;

type SetOrKeep<A> = { kind: 'set'; value: A } | { kind: 'keep' };

type OrIgnore<A> = { kind: 'check'; value: A } | { kind: 'ignore' };

type ClosedInterval = { lower: bigint; upper: bigint };

type Optional<A> = A | null;

enum AuthRequired {
  None,
  Either,
  Proof,
  Signature,
  Both,
  Impossible,
}

class Permissions {
  stake: boolean;
  edit_state: AuthRequired;
  send: AuthRequired;
  receive: AuthRequired;
  set_delegate: AuthRequired;
  set_permissions: AuthRequired;
  set_verification_key: AuthRequired;
  set_snapp_uri: AuthRequired;
  edit_rollup_state: AuthRequired;
  set_token_symbol: AuthRequired;

  constructor() {
    this.stake = true;
    this.edit_state = AuthRequired.Proof;
    this.edit_rollup_state = AuthRequired.Proof;
    this.send = AuthRequired.Signature;
    this.receive = AuthRequired.None;
    this.set_delegate = AuthRequired.Signature;
    this.set_snapp_uri = AuthRequired.Signature;
    this.set_permissions = AuthRequired.Signature;
    this.set_verification_key = AuthRequired.Signature;
    this.set_token_symbol = AuthRequired.Signature;
  }
}

class PartialUpdate {
  app_state: Array<Optional<SetOrKeep<Field>>>;
  delegate: Optional<SetOrKeep<PublicKey>>;
  permissions: Optional<SetOrKeep<Permissions>>;
  snapp_uri: Optional<SetOrKeep<string>>;
  token_symbol: Optional<SetOrKeep<string>>;

  constructor() {
    this.app_state = [];
    for (let i = 0; i < SnappStateLength; ++i) {
      this.app_state.push(null);
    }
    this.delegate = null;
    this.permissions = null;
    this.snapp_uri = null;
    this.token_symbol = null;
  }
}

class PartialPredicate {
  balance: Optional<ClosedInterval>;
  nonce: Optional<ClosedInterval>;
  receipt_chain_hash: Optional<OrIgnore<Field>>;
  public_key: Optional<OrIgnore<PublicKey>>;
  delegate: Optional<OrIgnore<PublicKey>>;
  state: Array<Optional<OrIgnore<Field>>>;
  rollup_state: Optional<OrIgnore<Field>>;
  proved_state: Optional<OrIgnore<boolean>>;

  constructor() {
    this.state = [];
    for (let i = 0; i < SnappStateLength; ++i) {
      this.state.push(null);
    }
    this.balance = null;
    this.nonce = null;
    this.receipt_chain_hash = null;
    this.public_key = null;
    this.delegate = null;
    this.rollup_state = null;
    this.proved_state = null;
  }
}

type TokenId = bigint;

class PartialParty {
  pk: Optional<PublicKey>;
  update: PartialUpdate;
  token_id: Optional<TokenId>;
  delta: Optional<bigint>;
  events_rev: Array<Array<Field>>;
  rollup_events: Array<Array<Field>>;
  predicate: PartialPredicate;
  control: Optional<Signature | Proof>;
  constructor() {
    this.pk = null;
    this.update = new PartialUpdate();
    this.token_id = null;
    this.delta = null;
    this.events_rev = [];
    this.rollup_events = [];
    this.predicate = new PartialPredicate();
    this.control = null;
  }

  set_pk(pk: PublicKey) {
    if (this.pk === null) {
      this.pk = pk;
    } else {
      throw new Error('Public key is already set');
    }
  }

  set_token_id(token_id: TokenId) {
    if (this.token_id === null) {
      this.token_id = token_id;
    } else {
      throw new Error('Token id is already set');
    }
  }

  modify_delta(x: bigint) {
    if (this.delta === null) {
      this.delta = x;
    } else {
      this.delta += x;
    }
  }

  emit_event(e: Array<Field>) {
    this.events_rev.push(e);
  }

  update_app_state_i(i: number, x: Field) {
    this.update.app_state[i] = { kind: 'set', value: x };
  }

  update_delegate(delegate: PublicKey) {
    this.update.delegate = { kind: 'set', value: delegate };
  }

  update_permissions(p: Permissions) {
    this.update.permissions = { kind: 'set', value: p };
  }

  expect_balance(b: bigint) {
    this.predicate.balance = { lower: b, upper: b };
  }

  expect_balance_between(lower: bigint, upper: bigint) {
    this.predicate.balance = { lower, upper };
  }

  expect_nonce(n: bigint) {
    this.predicate.nonce = { lower: n, upper: n };
  }

  expect_nonce_between(lower: bigint, upper: bigint) {
    this.predicate.nonce = { lower, upper };
  }

  expect_public_key(pk: PublicKey) {
    this.predicate.public_key = { kind: 'check', value: pk };
  }

  expect_delegate(pk: PublicKey) {
    this.predicate.delegate = { kind: 'check', value: pk };
  }

  expect_app_state_i(x: Field, i: number) {
    this.predicate.state[i] = { kind: 'check', value: x };
  }
}
