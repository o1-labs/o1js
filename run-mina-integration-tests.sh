#!/bin/bash
set -e

node tests/integration/simple-zkapp-mock-apply.js
node tests/integration/inductive-proofs.js
