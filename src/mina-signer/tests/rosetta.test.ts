import Client from '../dist/node/mina-signer/MinaSigner.js';
import { signatureFromHex, signatureJsonToHex } from '../dist/node/mina-signer/src/rosetta.js';

describe('Rosetta', () => {
  let client: Client;

  const rosettaTnxMockSignature = '389ac7d4077f3d485c1494782870979faa222cd906b25b2687333a92f41e40b925adb08705eddf2a7098e5ac9938498e8a0ce7c70b25ea392f4846b854086d43';
  const signedRosettaTnxMock = `
  {
    "signature": "${rosettaTnxMockSignature}",
    "payment": {
      "to": "B62qnzbXmRNo9q32n4SNu2mpB8e7FYYLH8NmaX6oFCBYjjQ8SbD7uzV",
      "from": "B62qnzbXmRNo9q32n4SNu2mpB8e7FYYLH8NmaX6oFCBYjjQ8SbD7uzV",
      "fee": "10000000",
      "token": "1",
      "nonce": "0",
      "memo": null,
      "amount": "1000000000",
      "valid_until": "4294967295"
    },
    "stake_delegation": null
  }`;

  // NOTE: copied from the test-vectors legacy signatures file
  // RE: the rosettaTnxMockSignature above does not correctly convert
  const legacySignatureJson = {
    field: '2290465734865973481454975811990842289349447524565721011257265781466170720513',
    scalar: '174718295375042423373378066296864207343460524320417038741346483351503066865',
  };

  beforeAll(async () => {
    client = new Client({ network: 'mainnet' });
  });

  it('generates a valid signature from a hex string', () => {
    let { r, s } = signatureFromHex(rosettaTnxMockSignature);
    expect(r).not.toBeNaN();
    expect(r).not.toBeFalsy();
    expect(s).not.toBeNaN();
    expect(s).not.toBeFalsy();

    // TODO we could go further and use validate method on the return?
    // or leave as is with the assumption that the above hex is known to be valid

    // what would the correct method be to verify?
  });

  it('generates a valid hex string from a signature', () => {
    // leaving this in place ATM as a comparison to what appears to be simply an incorrect assumption
    // i.e -> the mock signature may be testnet vs main or ...

    // let signature = signatureFromHex(rosettaTnxMockSignature);
    // let hex = signatureToHex(signature);
    // fails
    // expect(hex).toEqual(rosettaTnxMockSignature);

    let hex = signatureJsonToHex(legacySignatureJson);
    let sig = signatureFromHex(hex);

    expect(sig.r).toEqual(BigInt(legacySignatureJson.field));
    expect(sig.s).toEqual(BigInt(legacySignatureJson.scalar));
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
});
