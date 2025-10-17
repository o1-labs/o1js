import minimist from 'minimist';
import assert from 'node:assert';
import { Field, MerkleTree } from 'o1js';
import {
  MainProgramState,
  MerkleTreeWitness,
  SideloadedProgramProof,
  mainProgram,
  sideloadedProgram,
} from '../../examples/zkprogram/side-loading/dynamic-keys-merkletree.js';
import { CacheHarness } from './harness.js';

const { mode, tarball } = minimist(process.argv.slice(2));

const harness = await CacheHarness({ mode, tarball });

const { verificationKey: sideVk } = await sideloadedProgram.compile({ cache: harness.cache });
harness.check(sideVk, 'sideVk');

const { verificationKey: mainVk } = await mainProgram.compile({ cache: harness.cache });
harness.check(mainVk, 'mainVk');

const tree = new MerkleTree(64);
const rootBefore = tree.getRoot();
tree.setLeaf(1n, sideVk.hash);
const witness = new MerkleTreeWitness(tree.getWitness(1n));

// verifying adding a sideloaded program
{
  const { proof } = await mainProgram.addSideloadedProgram(
    new MainProgramState({
      treeRoot: rootBefore,
      state: Field(0),
    }),
    sideVk,
    witness
  );
  const ok = await harness.verify(proof, 'mainVk');
  assert.equal(ok, true, 'adding a sideloaded program should verify');

  {
    const { proof: childProof } = await sideloadedProgram.compute(Field(0), Field(10));
    const { proof: validationProof } = await mainProgram.validateUsingTree(
      proof.publicOutput,
      proof,
      sideVk,
      witness,
      SideloadedProgramProof.fromProof(childProof)
    );
    const ok = await harness.verify(validationProof, 'mainVk');
    assert.equal(ok, true, 'validation using tree should work');
  }
  {
    const { proof: childProof } = await sideloadedProgram.assertAndAdd(Field(0), Field(10));
    const { proof: validationProof } = await mainProgram.validateUsingTree(
      proof.publicOutput,
      proof,
      sideVk,
      witness,
      SideloadedProgramProof.fromProof(childProof)
    );
    const ok = await harness.verify(validationProof, 'mainVk');
    assert.equal(ok, true, 'validation on assert and add should work');
  }
}

await harness.finish();
