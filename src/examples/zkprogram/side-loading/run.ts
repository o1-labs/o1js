import { Field, MerkleTree, verify } from 'o1js';
import {
  sideloadedProgram,
  mainProgram,
  SideloadedProgramProof,
  MerkleTreeWitness,
  MainProgramState,
} from './dynamic-keys-merkletree.js';
import { perfStart, perfEnd } from '../../../lib/testing/perf-regression.js';

const csSide = await sideloadedProgram.analyzeMethods();
const csMain = await mainProgram.analyzeMethods();

perfStart('compile', sideloadedProgram.name);
const sideVk = (await sideloadedProgram.compile()).verificationKey;
perfEnd();

perfStart('compile', mainProgram.name);
const mainVk = (await mainProgram.compile()).verificationKey;
perfEnd();

const tree = new MerkleTree(64);

console.log('\nProving deployment of side-loaded key');
const rootBefore = tree.getRoot();
tree.setLeaf(1n, sideVk.hash);
const witness = new MerkleTreeWitness(tree.getWitness(1n));

perfStart('prove', mainProgram.name, csMain, 'addSideloadedProgram');
const { proof: proof1 } = await mainProgram.addSideloadedProgram(
  new MainProgramState({
    treeRoot: rootBefore,
    state: Field(0),
  }),
  sideVk,
  witness
);
perfEnd();

console.log('\nProving child program execution');
perfStart('prove', sideloadedProgram.name, csSide, 'compute');
const { proof: childProof1 } = await sideloadedProgram.compute(Field(0), Field(10));
perfEnd();

console.log('\nProving verification inside main program');
perfStart('prove', mainProgram.name, csMain, 'validateUsingTree');
const { proof: proof2 } = await mainProgram.validateUsingTree(
  proof1.publicOutput,
  proof1,
  sideVk,
  witness,
  SideloadedProgramProof.fromProof(childProof1)
);
perfEnd();

const validProof2 = await verify(proof2, mainVk);
console.log('ok?', validProof2);

console.log('\nProving different method of child program');
perfStart('prove', sideloadedProgram.name, csSide, 'assertAndAdd');
const { proof: childProof2 } = await sideloadedProgram.assertAndAdd(Field(0), Field(10));
perfEnd();

console.log('\nProving verification inside main program');
const { proof: proof3 } = await mainProgram.validateUsingTree(
  proof1.publicOutput,
  proof1,
  sideVk,
  witness,
  SideloadedProgramProof.fromProof(childProof2)
);

const validProof3 = await verify(proof3, mainVk);
console.log('ok?', validProof3);
