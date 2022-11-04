import {
    Poseidon,
    Field,
    Circuit,
    circuitMain,
    public_,
    isReady,
    Ledger,
  } from 'snarkyjs';
  
  class Main extends Circuit {
    @circuitMain
    static main(preimage: Field, @public_ hash: Field) {
      Poseidon.hash([preimage]).assertEquals(hash);
    }
  }
  
  await isReady;
  
  console.log('generating keypair...');
  const kp = Main.generateKeypair();

  console.log(Ledger.keypairToJson(kp));
  
  const preimage = Field.one;
  const hash = Poseidon.hash([preimage]);
  
  console.log('prove...');
  const pi = Main.prove([preimage], [hash], kp);
  console.log('proof', pi);
  
  console.log('verify...');
  let ok = Main.verify([hash], kp.verificationKey(), pi);
  console.log('ok?', ok);
  