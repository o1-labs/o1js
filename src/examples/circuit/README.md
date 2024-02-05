# `Circuit` examples

These examples show how to use `Circuit`, which is a simple API to write a single circuit and create proofs for it.

In contrast to `ZkProgram`, `Circuit` does not pass through Pickles, but creates a proof with Kimchi directly. Therefore, it does not support recursion, but is also much faster.

Note that `Circuit` proofs are not compatible with Mina zkApps.
