import { isReady, shutdown, Field, Poseidon } from 'snarkyjs';

await isReady;

const sponge = new Poseidon.Sponge();

for (let n = 0; n < 100; n++) {
    let x = sponge.squeeze();
    let y = x.toString();
    sponge.absorb(Field.random());
    x.assertEquals(Field(y));
}

console.log('sponge squeeze/absorb work as expected! 🎉');

shutdown();
