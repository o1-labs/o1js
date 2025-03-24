// unit tests dedicated to testing consistency of the signature algorithm
import { expect } from 'expect';
import { sign, Signature, signFieldElement, verify, verifyFieldElement } from './signature.js';
import { Test } from '../../snarky.js';
import { Field } from './field-bigint.js';
import { PrivateKey, PublicKey } from './curve-bigint.js';
import { PrivateKey as PrivateKeySnarky } from '../../lib/provable/crypto/signature.js';
import { p } from '../../bindings/crypto/finite-field.js';
import { AccountUpdate } from '../../bindings/mina-transaction/gen/transaction-bigint.js';
import { HashInput } from './derivers-bigint.js';
import { Ml } from '../../lib/ml/conversion.js';
import { FieldConst } from '../../lib/provable/core/fieldvar.js';
import { NetworkId } from './types.js';

let mlTest = await Test();

// check consistency with OCaml, where we expose the function to sign 1 field element with "testnet"
function checkConsistentSingle(
  msg: Field,
  key: PrivateKey,
  keySnarky: PrivateKeySnarky,
  pk: PublicKey,
  networkId: NetworkId
) {
  let sig = signFieldElement(msg, key, networkId);

  // verify
  expect(verifyFieldElement(sig, msg, pk, networkId)).toEqual(true);

  // if the signature was generated with networkId=mainnet, the signature should not verify against testnet or devnet
  expect(verifyFieldElement(sig, msg, pk, networkId === 'mainnet' ? 'testnet' : 'mainnet')).toEqual(
    false
  );
  expect(verifyFieldElement(sig, msg, pk, networkId === 'mainnet' ? 'devnet' : 'mainnet')).toEqual(
    false
  );

  // consistent with OCaml
  let msgMl = FieldConst.fromBigint(msg);
  let keyMl = Ml.fromPrivateKey(keySnarky);
  let actualTest = mlTest.signature.signFieldElement(msgMl, keyMl, NetworkId.toString(networkId));
  expect(Signature.toBase58(sig)).toEqual(actualTest);
}

// check that various multi-field hash inputs can be verified
function checkCanVerify(msg: HashInput, key: PrivateKey, pk: PublicKey) {
  let sigDev = sign(msg, key, 'devnet');
  let sigTest = sign(msg, key, 'testnet');
  let sigMain = sign(msg, key, 'mainnet');
  // verify
  let okTestnetDevnet = verify(sigTest, msg, pk, 'devnet');
  let okDevnetTestnet = verify(sigDev, msg, pk, 'testnet');
  let okDevnetDevnet = verify(sigDev, msg, pk, 'devnet');
  let okMainnetDevnet = verify(sigMain, msg, pk, 'devnet');
  let okDevnetMainnet = verify(sigDev, msg, pk, 'mainnet');
  let okMainnetMainnet = verify(sigMain, msg, pk, 'mainnet');
  expect(okTestnetDevnet).toEqual(true);
  expect(okDevnetTestnet).toEqual(true);
  expect(okDevnetDevnet).toEqual(true);
  expect(okMainnetDevnet).toEqual(false);
  expect(okDevnetMainnet).toEqual(false);
  expect(okMainnetMainnet).toEqual(true);
}

// created with PrivateKey.random(); hard-coded to make tests reproducible
let privateKeys = [
  5168137537350106646038172092273964439447230860125519060122927580020622270141n,
  14928086762226019830440257243808305601005302250478321528858262459356286366453n,
  11143322587625020388344946433171679426319801593192223014315467772089286592604n,
  18906421803290277088414121591868716174001000360632913534629968674606246464596n,
  5925568526516417064863153411603894796335750603303676942163464712022427664721n,
  20037223684845539907201171426637539137161967796359729867193035014844512841185n,
  20236646771171834616838432888269706094783740262871406794713329156173567092679n,
  13507121957360975407754936805517309719995432919287716894090189496158972691353n,
  19152183577529784585604205414612388832924448123778079866321952213819564835523n,
  20617898261860919949586898353988281719931035849127590497832022423723702051831n,
];
// created with Field.random(); hard-coded to make tests reproducible
let randomFields = [
  7612970850134051471932333398465838351839532419148061934628866168663280504034n,
  27972698397543914557828288754101805907710482736523928428688840423684487283686n,
  8703743676147621684744466323325623278489059672232298069375861211469834922688n,
  16192824873102077219220893637595957128993235636019312988127478669820406609509n,
  5123429362863871987559144871409804453562526127381116452870491690397753811094n,
  25971592550162911171172249177105774374832521772676232623383824977784210633515n,
  16430178824936223386420564202153148454359399753677109773596670870194786964396n,
  19157956145170718958732174379270969488704624188346232665215657585142941265622n,
  28486023928659548119979958179075614860483912203433036340088142691910674902557n,
  14367789165599062779555941943909225438752186664081151509427474521285809812186n,
];

// check with different random private keys
for (let i = 0; i < 10; i++) {
  let key = privateKeys[i];
  let keySnarky = PrivateKeySnarky.fromBase58(PrivateKey.toBase58(key));
  let publicKey = PrivateKey.toPublicKey(key);

  // hard coded single field elements
  let hardcoded = [0n, 1n, 2n, p - 1n];
  for (let x of hardcoded) {
    checkConsistentSingle(x, key, keySnarky, publicKey, 'devnet');
    checkConsistentSingle(x, key, keySnarky, publicKey, 'testnet');
    checkConsistentSingle(x, key, keySnarky, publicKey, 'mainnet');
    checkConsistentSingle(x, key, keySnarky, publicKey, { custom: 'other' });
  }
  // random single field elements
  for (let i = 0; i < 10; i++) {
    let x = randomFields[i];
    checkConsistentSingle(x, key, keySnarky, publicKey, 'devnet');
    checkConsistentSingle(x, key, keySnarky, publicKey, 'testnet');
    checkConsistentSingle(x, key, keySnarky, publicKey, 'mainnet');
    checkConsistentSingle(x, key, keySnarky, publicKey, { custom: 'other' });
  }
  // hard-coded multi-element hash inputs
  let messages: HashInput[] = [
    { fields: [0n, 0n, 0n] },
    { fields: [4n, 20n, 120398120n] },
    {
      fields: [1n, p - 1n],
      packed: [
        [0n, 0],
        [1n, 1],
      ],
    },
    {
      packed: [
        [0xffn, 8],
        [0xffffn, 16],
        [0xffff_ffffn, 32],
        [0xffff_ffff_ffff_ffffn, 64],
      ],
    },
    AccountUpdate.toInput(AccountUpdate.empty()),
  ];
  for (let msg of messages) {
    checkCanVerify(msg, key, publicKey);
  }
}

console.log("signatures are consistent or verify / don't verify as expected! 🎉");
