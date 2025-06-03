# `Circuit` examples

These examples show how to use `ZkFunction`, which is a simple API to write a single circuit and create proofs for it.

In contrast to `ZkProgram`, `ZkFunction` does not pass through Pickles, but creates a proof with Kimchi directly. Therefore, it does not support recursion, but is also much faster.

Note that `ZkFunction` proofs are not compatible with Mina zkApps.
