import Client from '../dist/node/mina-signer/mina-signer.js';
import { fieldFromHex, fieldToHex, signatureJsonToHex, signatureJsonFromHex, UnsignedTransaction, publicKeyToHex, signTransaction } from '../dist/node/mina-signer/src/rosetta.js';
import { PublicKey } from '../dist/node/mina-signer/src/curve-bigint.js';
import { Field } from '../dist/node/mina-signer/src/field-bigint.js';

describe('Rosetta', () => {
  let client: Client;

  const rosettaUnsignedTxn: UnsignedTransaction = { "randomOracleInput": "0000000333E1F14C6155B706D4EA12CF70685B8DCD3342A8B36A27CC3EB61B5871F9219E33E1F14C6155B706D4EA12CF70685B8DCD3342A8B36A27CC3EB61B5871F9219E33E1F14C6155B706D4EA12CF70685B8DCD3342A8B36A27CC3EB61B5871F9219E000002570242F000000000008000000000000000C00000007FFFFFFFC00000000000000000000000000000000000000000000000000000000000000000000E0000000000000000014D677000000000", "signerInput": { "prefix": ["33E1F14C6155B706D4EA12CF70685B8DCD3342A8B36A27CC3EB61B5871F9219E", "33E1F14C6155B706D4EA12CF70685B8DCD3342A8B36A27CC3EB61B5871F9219E", "33E1F14C6155B706D4EA12CF70685B8DCD3342A8B36A27CC3EB61B5871F9219E"], "suffix": ["0000000000000007FFFFFFFC00000006000000000000000200000000001E8480", "0000000003800000000000000000000000000000000000000000000000000000", "00000000000000000000000000000000000000000000000001DCD65000000000"] }, "payment": { "to": "B62qqQomCgjaKhayN79wWqDNsSJKFaZjrkuCp8Kcrt36ubXb14XHU2X", "from": "B62qqQomCgjaKhayN79wWqDNsSJKFaZjrkuCp8Kcrt36ubXb14XHU2X", "fee": "1000000", "token": "wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf", "nonce": "1", "memo": null, "amount": "1000000000", "valid_until": null }, "stakeDelegation": null };
  const rosettaUnsignedPayload = {
    unsigned_transaction: JSON.stringify(rosettaUnsignedTxn),
    payloads: [
      {
        account_identifier: {
          address: "B62qqQomCgjaKhayN79wWqDNsSJKFaZjrkuCp8Kcrt36ubXb14XHU2X",
          metadata: {
            token_id: "wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf"
          }
        },
        hex_bytes: "7B2272616E646F6D4F7261636C65496E707574223A2230303030303030333333453146313443363135354237303644344541313243463730363835423844434433333432413842333641323743433345423631423538373146393231394533334531463134433631353542373036443445413132434637303638354238444344333334324138423336413237434333454236314235383731463932313945333345314631344336313535423730364434454131324346373036383542384443443333343241384233364132374343334542363142353837314639323139453030303030323537303234324630303030303030303030303830303030303030303030303030303043303030303030303746464646464646433030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030453030303030303030303030303030303030313444363737303030303030303030222C227369676E6572496E707574223A7B22707265666978223A5B2233334531463134433631353542373036443445413132434637303638354238444344333334324138423336413237434333454236314235383731463932313945222C2233334531463134433631353542373036443445413132434637303638354238444344333334324138423336413237434333454236314235383731463932313945222C2233334531463134433631353542373036443445413132434637303638354238444344333334324138423336413237434333454236314235383731463932313945225D2C22737566666978223A5B2230303030303030303030303030303037464646464646464330303030303030363030303030303030303030303030303230303030303030303030314538343830222C2230303030303030303033383030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030222C2230303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030314443443635303030303030303030225D7D2C227061796D656E74223A7B22746F223A224236327171516F6D43676A614B6861794E3739775771444E73534A4B46615A6A726B754370384B63727433367562586231345848553258222C2266726F6D223A224236327171516F6D43676A614B6861794E3739775771444E73534A4B46615A6A726B754370384B63727433367562586231345848553258222C22666565223A2231303030303030222C22746F6B656E223A22775348563253347158396A46734C6A516F38723142734D4C48325A524B735A7836454A643173626F7A475069654543344A66222C226E6F6E6365223A2231222C226D656D6F223A6E756C6C2C22616D6F756E74223A2231303030303030303030222C2276616C69645F756E74696C223A6E756C6C7D2C227374616B6544656C65676174696F6E223A6E756C6C7D",
        signature_type: "schnorr_poseidon"
      }]
  };

  const privateKey = 'EKFDpgrxFUU9FH1NF8t6AVC19MdAgxAHS6FSaJCsuhxmtheG9cv3';
  const publicKey = 'B62qqQomCgjaKhayN79wWqDNsSJKFaZjrkuCp8Kcrt36ubXb14XHU2X';
  // signature using reference `ocaml-signer` using the above payload and private key
  const mainnetSignatureHex = '6fbce9ccad07aa99dad2ad8d5415ac24c0b6e6d2d264f65232c0337417b6d839d2271979d2d44161b0763add744f0e4572516ff40609fe337b48d579e50c941b';
  const mainnetSignatureJson = {
    field: '26164728085389719244195795314490480006407207982358090253363589956793207995503',
    scalar: '12474029284949868513590364568638283159520724895188255555607876437432082180050'
  }
  const signedRosettaTnxMock = `
  {
    "signature": "${mainnetSignatureHex}",
    "payment": {
      "to": "B62qqQomCgjaKhayN79wWqDNsSJKFaZjrkuCp8Kcrt36ubXb14XHU2X",
      "from": "B62qqQomCgjaKhayN79wWqDNsSJKFaZjrkuCp8Kcrt36ubXb14XHU2X",
      "fee": "1000000",
      "token": "1",
      "nonce": "1",
      "memo": null,
      "amount": "1000000000",
      "valid_until": "4294967295"
    },
    "stake_delegation": null
  }`;

  beforeAll(async () => {
    client = new Client({ network: 'mainnet' });
  });

  it('field <-> hex roundtrip', () => {
    const field = BigInt(mainnetSignatureJson.field);
    const hex = fieldToHex(Field, field);
    const field_ = fieldFromHex(Field, hex)[0];
    expect(field_).toEqual(field);
  });

  it('generates a valid hex string from a signature', () => {
    let signatureHex = signatureJsonToHex(mainnetSignatureJson);
    expect(signatureHex).toBe(mainnetSignatureHex);
  });

  it('generates a valid signature from a hex string', () => {
    let signature = signatureJsonFromHex(mainnetSignatureHex);
    expect(signature).toEqual(mainnetSignatureJson);
  });

  it('signs and verifies signature', () => {
    let signedTransaction = client.signRosettaTransaction(rosettaUnsignedTxn, privateKey);
    expect(client.verifyRosettaTransaction(signedTransaction)).toBeTruthy();
  });

  it('match signature', () => {
    const { signature } = signTransaction(rosettaUnsignedTxn, privateKey, 'mainnet');
    expect(signature).toEqual(mainnetSignatureHex);
  });

  it('verify transaction', () => {
    expect(client.verifyRosettaTransaction({ data: rosettaUnsignedTxn, signature: mainnetSignatureHex, publicKey: publicKey })).toBeTruthy();
  });

  it('generates a valid rosetta transaction', () => {
    const signedGraphQLCommand =
      client.signedRosettaTransactionToSignedCommand(signedRosettaTnxMock);
    const signedRosettaTnxMockJson = JSON.parse(signedRosettaTnxMock);
    const signedGraphQLCommandJson = JSON.parse(signedGraphQLCommand);

    expect(signedRosettaTnxMockJson.payment.to).toEqual(
      signedGraphQLCommandJson.data.payload.body[1].receiver_pk
    );

    expect(signedRosettaTnxMockJson.payment.from).toEqual(
      signedGraphQLCommandJson.data.payload.common.fee_payer_pk
    );

    expect(signedRosettaTnxMockJson.payment.amount).toEqual(
      signedGraphQLCommandJson.data.payload.body[1].amount
    );
  });

  it('generates valid combine payload', () => {
    const combinePayload = client.rosettaCombinePayload(rosettaUnsignedPayload, privateKey);
    const expectedCombinePayload = {
      network_identifier: { blockchain: 'mina', network: 'mainnet' },
      unsigned_transaction: JSON.stringify(rosettaUnsignedTxn),
      signatures: [
        {
          hex_bytes: mainnetSignatureHex,
          public_key: {
            hex_bytes:
              publicKeyToHex(PublicKey.fromBase58(publicKey)),
            curve_type: 'pallas'
          },
          signature_type: 'schnorr_poseidon',
          signing_payload: rosettaUnsignedPayload.payloads[0]
        }
      ]
    };
    expect(JSON.stringify(combinePayload)).toBe(JSON.stringify(expectedCombinePayload));
  });
});
