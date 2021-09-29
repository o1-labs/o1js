import {
  Poseidon,
  Field,
  Bool,
  Group,
  Circuit as C,
  Scalar,
  PrivateKey,
  PublicKey,
  Signature,
  CircuitValue,
  prop,
  circuitMain,
  public_,
  Proof,
} from '../index';
import {
  Trade,
  HTTPSAttestation,
  Bytes,
  WebSnappRequest,
} from './exchange_lib';
import * as Util from './util';

// Proof of bought low sold high for bragging rights
//
// Prove I did a trade that did "X%" increase

class Witness extends CircuitValue {
  @prop pairId: Field;
  @prop attestation: HTTPSAttestation;

  constructor(pairId: Field, a: HTTPSAttestation) {
    super();
    this.pairId = pairId;
    this.attestation = a;
  }
}

export class Main extends C {
  @circuitMain
  // percentGain is an integer in basis points
  static main(
    witness: Witness,
    @public_ tradePairId: Field,
    @public_ basisPointsGain: Field
  ) {
    witness.attestation.verify(
      WebSnappRequest.ofString('api.coinbase.com/trades')
    );
    const trades = Trade.readAll(witness.attestation.response);

    let acc = {
      totalSpend: Field.zero,
      totalGain: Field.zero,
    };

    trades.forEach((trade) => {
      let relevant = trade.pairId.equals(tradePairId);
      let tradeValue = trade.quantity.mul(trade.price);
      acc.totalSpend = C.if(
        relevant.and(trade.isBuy),
        acc.totalSpend.add(tradeValue),
        acc.totalSpend
      );
      acc.totalGain = C.if(
        relevant.and(trade.isBuy.not()),
        acc.totalGain.add(tradeValue),
        acc.totalGain
      );
    });

    const FULL_BASIS = new Field(10000);
    /*
	    Check
	    10000 * (totalGain / totalSpend) >= 10000 + basisPointsGain
	    or, equivalently
	    10000 * totalGain >= (1000 + basisPointsGain) * totalSpend
	  */
    FULL_BASIS.mul(acc.totalGain).assertGte(
      FULL_BASIS.add(basisPointsGain).mul(acc.totalSpend)
    );
  }
}

type TradeObject = {
  pairId: string;
  price: number;
  quantity: number;
  timestamp: number;
  isBuy: boolean;
};
function trade({
  pairId,
  timestamp,
  price,
  quantity,
  isBuy,
}: TradeObject): Trade {
  return new Trade(
    Util.packBytes(pairId),
    new Bool(isBuy),
    new Field(price),
    new Field(quantity),
    new Field(timestamp)
  );
}

export function test() {
  //globalThis._hello = Main;
  const kp = Main.generateKeypair();

  // Gain of at least 10%
  const publicInput = [Util.packBytes('BTC/USDT'), new Field(1000)];

  const witness = new Witness(
    Util.packBytes('BTC/USDT'),
    new HTTPSAttestation(
      new Bytes(
        [
          {
            pairId: 'BTC/USDT',
            price: 38553_21,
            quantity: 195_14,
            timestamp: 1629856167722,
            isBuy: true,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'BTC/USDT',
            price: 38553_21,
            quantity: 195_14,
            timestamp: 1629856167722,
            isBuy: true,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'BTC/USDT',
            price: 48553_21,
            quantity: 390_28,
            timestamp: 1629856167722,
            isBuy: false,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
          {
            pairId: 'MINA/USDT',
            price: 3_27,
            quantity: 874_54,
            timestamp: 1629856164752,
            isBuy: false,
          },
        ].map(trade)
      ),
      new Signature(new Field(1), Scalar.random())
    )
  );

  const proof = Main.prove([witness], publicInput, kp);

  const vk = kp.verificationKey();

  console.log('logging verification key:', vk);
  console.log('logging keypair:', kp);
  console.log('logging proof:', proof);

  // const proofJSON = JSON.stringify(proof);
  // console.log('proof in JSON format:', proofJSON);
  // const proofFromJSON = <Proof>JSON.parse(proofJSON);
  // console.log('oldProof', proofFromJSON);

  console.log('verified?', proof.verify(vk, publicInput));
  //console.log('verified with JSON?', proofFromJSON.verify(vk, publicInput));
}
