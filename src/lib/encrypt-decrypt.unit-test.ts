import { isReady, Encryption, PrivateKey, PublicKey, shutdown } from 'snarkyjs';

await isReady;

for (let n = 0; n < 100; n++) {
    let sk = PrivateKey.random();
    let pk = sk.toPublicKey();
    let pt = pk.toFields();
    let ct = Encryption.encrypt(pt, pk);
    let fs = Encryption.decrypt(ct, sk);
    pk.toGroup().assertEquals(ct.publicKey);
    pk.assertEquals(PublicKey.fromFields(fs));
}

console.log('encryption/decryption work as expected! 🎉');

shutdown();
