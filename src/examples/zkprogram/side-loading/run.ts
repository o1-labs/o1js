import { Field, MerkleTree, verify } from "o1js";
import { sideloadedProgram, mainProgram, SideloadedProgramProof, MerkleTreeWitness, MainProgramState } from "./dynamic-keys-merkletree.js";

console.log('Compiling circuits...');
const programVk = (await sideloadedProgram.compile()).verificationKey;
const mainVk = (await mainProgram.compile()).verificationKey;

const tree = new MerkleTree(64);

console.log('Proving deployment of side-loaded key');
const rootBefore = tree.getRoot();
tree.setLeaf(1n, programVk.hash);
const witness = new MerkleTreeWitness(tree.getWitness(1n));

const { proof: proof1 } = await mainProgram.addSideloadedProgram(
  new MainProgramState({
    treeRoot: rootBefore,
    state: Field(0),
  }),
  programVk,
  witness
);

console.log('Proving child program execution');
const { proof: childProof } = await sideloadedProgram.compute(Field(0), Field(10));

console.log('Proving verification inside main program');
const { proof: proof2 } = await mainProgram.validateUsingTree(
  proof1.publicOutput,
  proof1,
  programVk,
  witness,
  SideloadedProgramProof.fromProof(childProof)
);

const validProof2 = await verify(proof2, mainVk);
console.log('ok?', validProof2);

console.log('Proving different method of child program');
const { proof: childProof2 } = await sideloadedProgram.assertAndAdd(Field(0), Field(10));

console.log('Proving verification inside main program');
const proof3 = await mainProgram.validateUsingTree(
  proof1.publicOutput,
  proof1,
  programVk,
  witness,
  SideloadedProgramProof.fromProof(childProof)
);

const validProof3 = await verify(proof2, mainVk);
console.log('ok?', validProof2);
