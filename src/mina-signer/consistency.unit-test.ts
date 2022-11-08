import { expect } from 'expect';
import { isReady, Ledger } from '../snarky.js';
import { UInt32, UInt64 } from '../lib/int.js';
import { PrivateKey, PublicKey as PublicKeySnarky } from '../lib/signature.js';
import { AccountUpdate as AccountUpdateSnarky } from '../lib/account_update.js';
import { PublicKey } from '../provable/curve-bigint.js';
import {
  AccountUpdate,
  Json,
  ZkappCommand,
} from '../provable/gen/transaction-bigint.js';
import * as TypesSnarky from '../provable/gen/transaction.js';

await isReady;

// public key roundtrip & consistency w/ OCaml serialization
let publicKeyBase58 = 'B62qmfmZrxjfRHfnx1QJLHUyStQxSkqao9civMXPaymkknX5PCiZT7J';
let pkSnarky = PublicKeySnarky.fromBase58(publicKeyBase58);
let pk = PublicKey.fromJSON(publicKeyBase58);
expect(pk.x).toEqual(pkSnarky.x.toBigInt());
expect(pk.isOdd).toEqual(pkSnarky.isOdd.toField().toBigInt());
expect(PublicKey.toJSON(pk)).toEqual(publicKeyBase58);

// example account update
let accountUpdateJsonString =
  '{"body":{"publicKey":"B62qmfmZrxjfRHfnx1QJLHUyStQxSkqao9civMXPaymkknX5PCiZT7J","tokenId":"yEWUTZqtT8PmCFU32EXwCwudK4gtxCWkjcAC7eTwj2riWhCV8M","update":{"appState":["9",null,null,null,null,null,null,null],"delegate":"B62qrja1a2wu3ciKygrqNiNoDZUsHCcE1VfF4LZQtQkzszWhogpWN9i","verificationKey":null,"permissions":{"editState":"Proof","send":"Signature","receive":"Proof","setDelegate":"Signature","setPermissions":"None","setVerificationKey":"None","setZkappUri":"Signature","editSequenceState":"Proof","setTokenSymbol":"Signature","incrementNonce":"Signature","setVotingFor":"Signature"},"zkappUri":null,"tokenSymbol":"BLABLA","timing":{"initialMinimumBalance":"1","cliffTime":"0","cliffAmount":"0","vestingPeriod":"1","vestingIncrement":"2"},"votingFor":null},"balanceChange":{"magnitude":"14197832","sgn":"Negative"},"incrementNonce":true,"events":[["0"],["1"]],"sequenceEvents":[["0"],["1"]],"callData":"6743900749438632952963252074409706338210982229126682817949490928992849119219","callDepth":1,"preconditions":{"network":{"snarkedLedgerHash":null,"timestamp":null,"blockchainLength":null,"minWindowDensity":null,"totalCurrency":null,"globalSlotSinceHardFork":null,"globalSlotSinceGenesis":null,"stakingEpochData":{"ledger":{"hash":"4295928848099762379149452702606274128891023958431976727769309015818325653869","totalCurrency":null},"seed":null,"startCheckpoint":null,"lockCheckpoint":null,"epochLength":null},"nextEpochData":{"ledger":{"hash":null,"totalCurrency":null},"seed":null,"startCheckpoint":null,"lockCheckpoint":"16957731668585847663441468154039306422576952181094510426739468515732343321592","epochLength":null}},"account":{"balance":{"lower":"1000000000","upper":"1000000000"},"nonce":null,"receiptChainHash":null,"delegate":"B62qrja1a2wu3ciKygrqNiNoDZUsHCcE1VfF4LZQtQkzszWhogpWN9i","state":["9",null,null,null,null,null,null,null],"sequenceState":null,"provedState":null,"isNew":true}},"useFullCommitment":false,"caller":"yEWUTZqtT8PmCFU32EXwCwudK4gtxCWkjcAC7eTwj2riWhCV8M","authorizationKind":"None_given"},"authorization":{"proof":null,"signature":null}}';
let accountUpdateJson: Json.AccountUpdate = JSON.parse(accountUpdateJsonString);
let accountUpdate = AccountUpdate.fromJSON(accountUpdateJson);

// account update JSON roundtrip
expect(JSON.stringify(AccountUpdate.toJSON(accountUpdate))).toEqual(
  accountUpdateJsonString
);

// example tx
// TODO: generate in JS
let feePayerKeySnarky = PrivateKey.fromBase58(
  'EKDkKHit3WxjQ8SBSnP9zK7qfLtdi28tEDrzLtskTNJi1gyESTZ1'
);
// TODO: to public key in JS
let feePayerAddressSnarky = feePayerKeySnarky.toPublicKey();
let feePayerAddress = feePayerAddressSnarky.toBase58();
let nonce = 1n;
let fee = 100_000_000n;
// TODO: generate in JS
let memo = Ledger.memoToBase58('hello world');

let feePayer: ZkappCommand['feePayer'] = {
  body: { publicKey: PublicKey.fromJSON(feePayerAddress), nonce, fee },
  authorization: Ledger.dummySignature(),
};
let zkappCommandJson = ZkappCommand.toJSON({
  feePayer,
  memo,
  accountUpdates: [accountUpdate],
});

// snarkyjs fromJSON -> toJSON roundtrip, + consistency with mina-signer
let feePayerSnarky = AccountUpdateSnarky.defaultFeePayer(
  feePayerAddressSnarky,
  feePayerKeySnarky,
  UInt32.from(nonce)
);
feePayerSnarky.body.fee = UInt64.from(fee);
let accountUpdateSnarky = TypesSnarky.AccountUpdate.fromJSON(accountUpdateJson);
let zkappCommandJsonSnarky = TypesSnarky.ZkappCommand.toJSON({
  feePayer: feePayerSnarky,
  memo,
  accountUpdates: [accountUpdateSnarky],
});
expect(JSON.stringify(zkappCommandJson)).toEqual(
  JSON.stringify(zkappCommandJsonSnarky)
);
