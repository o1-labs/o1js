import {
  Poseidon,
  Field,
  Bool,
  Group,
  Circuit,
  Scalar,
  PrivateKey,
  PublicKey,
  Signature,
  CircuitValue,
  prop,
} from '../index';

export class Trade extends CircuitValue {
  @prop pairId: Field;
  @prop isBuy: Bool;
  @prop price: Field;
  @prop quantity: Field;
  @prop timestamp: Field;

  constructor(
    pairId: Field,
    isBuy: Bool,
    price: Field,
    quantity: Field,
    timestamp: Field
  ) {
    super();
    this.pairId = pairId;
    this.isBuy = isBuy;
    this.price = price;
    this.quantity = quantity;
    this.timestamp = timestamp;
  }

  static readAll(bytes: Bytes): Array<Trade> {
    return bytes.value;
  }
}

const numTrades = 12;

export class Bytes extends CircuitValue {
  value: Array<Trade>;

  constructor(value: Array<Trade>) {
    super();
    console.assert(value.length === numTrades);
    this.value = value;
  }
}

(Bytes.prototype as any)._fields = [['value', Circuit.array(Trade, numTrades)]];

export class WebSnappRequest extends CircuitValue {
  constructor() {
    super();
  }

  static ofString(_: string): WebSnappRequest {
    return new WebSnappRequest();
  }
}

export class HTTPSAttestation extends CircuitValue {
  @prop response: Bytes;
  @prop signature: Signature;

  constructor(resp: Bytes, sig: Signature) {
    super();
    this.response = resp;
    this.signature = sig;
  }

  verify(_request: WebSnappRequest) {
    //const O1PUB: Group = Group.generator;
    //this.signature.verify(O1PUB, request.toFieldElements().concat(this.response.toFieldElements()))
  }
}
