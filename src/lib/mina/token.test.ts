import {
  State,
  state,
  UInt64,
  Bool,
  SmartContract,
  Mina,
  AccountUpdate,
  method,
  PublicKey,
  Permissions,
  VerificationKey,
  Field,
  Int64,
  TokenId,
  TokenContract as TokenContractBase,
  AccountUpdateForest,
} from 'o1js';

const tokenSymbol = 'TOKEN';

// TODO: Refactor to use `TokenContract.approveBase()`

class TokenContract extends TokenContractBase {
  SUPPLY = UInt64.from(10n ** 18n);
  @state(UInt64) totalAmountInCirculation = State<UInt64>();

  async approveBase(_: AccountUpdateForest) {
    throw Error('Not used');
  }

  /**
   * This deploy method lets a another token account deploy their contract and verification key as a child of this token contract.
   * This is important since we want the native token id of the deployed contract to be the token id of the token contract.
   */
  @method async deploy_(address: PublicKey, verificationKey: VerificationKey) {
    let tokenId = this.deriveTokenId();
    let au = AccountUpdate.default(address, tokenId);
    this.approve(au);
    au.account.permissions.set(Permissions.default());
    au.account.verificationKey.set(verificationKey);
    au.requireSignature();
  }

  init() {
    super.init();
    let address = this.address;
    let receiver = this.internal.mint({ address, amount: this.SUPPLY });
    receiver.account.isNew.requireEquals(Bool(true));
    this.balance.subInPlace(Mina.getNetworkConstants().accountCreationFee);
    this.totalAmountInCirculation.set(this.SUPPLY.sub(100_000_000));
  }

  async deploy() {
    await super.deploy();
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      receive: Permissions.proof(),
      access: Permissions.proofOrSignature(),
    });
  }

  @method async mint(receiverAddress: PublicKey, amount: UInt64) {
    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.requireEquals(totalAmountInCirculation);
    let newTotalAmountInCirculation = totalAmountInCirculation.add(amount);
    newTotalAmountInCirculation.value.assertLessThanOrEqual(
      this.SUPPLY.value,
      "Can't mint more than the total supply"
    );
    this.internal.mint({ address: receiverAddress, amount });
    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }

  @method async burn(receiverAddress: PublicKey, amount: UInt64) {
    let totalAmountInCirculation = this.totalAmountInCirculation.getAndRequireEquals();
    let newTotalAmountInCirculation = totalAmountInCirculation.sub(amount);
    this.internal.burn({ address: receiverAddress, amount });
    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }

  @method async approveTransfer(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: UInt64,
    senderAccountUpdate: AccountUpdate
  ) {
    this.approve(senderAccountUpdate);
    let negativeAmount = senderAccountUpdate.balanceChange;
    negativeAmount.assertEquals(Int64.from(amount).neg());
    let tokenId = this.deriveTokenId();
    senderAccountUpdate.body.tokenId.assertEquals(tokenId);
    senderAccountUpdate.body.publicKey.assertEquals(senderAddress);
    let receiverAccountUpdate = AccountUpdate.create(receiverAddress, tokenId);
    receiverAccountUpdate.balance.addInPlace(amount);
  }
}

class B extends SmartContract {
  @method async approveSend(amount: UInt64) {
    this.balance.subInPlace(amount);
  }
}

class C extends SmartContract {
  @method async approveSend(amount: UInt64) {
    this.balance.subInPlace(amount);
  }

  @method async approveIncorrectLayout(amount: UInt64) {
    this.balance.subInPlace(amount);
    let update = AccountUpdate.default(this.address);
    this.self.approve(update);
  }
}

let feePayer: Mina.TestPublicKey;

let tokenAccount: Mina.TestPublicKey;
let token: TokenContract;
let tokenId: Field;

let bAccount: Mina.TestPublicKey;
let b: B;

let cAccount: Mina.TestPublicKey;
let c: C;

async function setupAccounts() {
  let Local = await Mina.LocalBlockchain({
    proofsEnabled: true,
    enforceTransactionLimits: false,
  });
  Mina.setActiveInstance(Local);
  [feePayer, bAccount, cAccount] = Local.testAccounts;
  tokenAccount = Mina.TestPublicKey.random();
  token = new TokenContract(tokenAccount);
  tokenId = token.deriveTokenId();
  b = new B(bAccount, tokenId);
  c = new C(cAccount, tokenId);
  return Local;
}

async function setupLocal() {
  await setupAccounts();
  let tx = await Mina.transaction(feePayer, async () => {
    await token.deploy();
    let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer);
    feePayerUpdate.send({
      to: token.self,
      amount: Mina.getNetworkConstants().accountCreationFee,
    });
  });
  tx.sign([tokenAccount.key, feePayer.key]);
  await tx.send();
}

async function setupLocalProofs() {
  let Local = await setupAccounts();
  c = new C(cAccount, tokenId);
  // don't use proofs for the setup, takes too long to do this every time
  Local.setProofsEnabled(false);
  let tx = await Mina.transaction({ sender: feePayer }, async () => {
    await token.deploy();
    let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer, 3);
    feePayerUpdate.send({
      to: token.self,
      amount: Mina.getNetworkConstants().accountCreationFee,
    });
    await token.deploy_(bAccount, B._verificationKey!);
    await token.deploy_(cAccount, C._verificationKey!);
  });
  await tx.prove();
  tx.sign([tokenAccount.key, bAccount.key, cAccount.key, feePayer.key]);
  await tx.send();
  Local.setProofsEnabled(true);
}

describe('Token', () => {
  beforeAll(async () => {
    await TokenContract.compile();
    await B.compile();
    await C.compile();
  });

  describe('Signature Authorization', () => {
    /*
      test case description:
      Check token contract can be deployed and initialized
      tested cases:
        - create a new token
        - deploy a contract under a custom token
        - create a new valid token with a different parentTokenId
        - set the token symbol after deployment
    */
    describe('Token Contract Creation/Deployment', () => {
      beforeEach(async () => {
        await setupLocal();
      });

      test('correct token id can be derived with an existing token owner', () => {
        expect(tokenId).toEqual(TokenId.derive(tokenAccount));
      });

      test('deployed token contract exists in the ledger', () => {
        expect(Mina.getAccount(tokenAccount, tokenId)).toBeDefined();
      });

      test('setting a valid token symbol on a token contract', async () => {
        await (
          await Mina.transaction({ sender: feePayer }, async () => {
            let au = AccountUpdate.createSigned(tokenAccount);
            au.account.tokenSymbol.set(tokenSymbol);
          })
        )
          .sign([feePayer.key, tokenAccount.key])
          .send();
        const symbol = Mina.getAccount(tokenAccount).tokenSymbol;
        expect(tokenSymbol).toBeDefined();
        expect(symbol).toEqual(tokenSymbol);
      });
    });

    /*
      test case description:
      token contract can mint new tokens with a signature
      tested cases:
        - mints and updates the token balance of the receiver
        - fails if we mint over an overflow amount
    */
    describe('Mint token', () => {
      beforeEach(async () => {
        await setupLocal();
      });

      test('token contract can successfully mint and updates the balances in the ledger (signature)', async () => {
        await (
          await Mina.transaction({ sender: feePayer }, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await token.mint(bAccount, UInt64.from(100_000));
            token.requireSignature();
          })
        )
          .sign([feePayer.key, tokenAccount.key])
          .send();
        expect(Mina.getBalance(bAccount, tokenId).value.toBigInt()).toEqual(100_000n);
      });

      test('minting should fail if overflow occurs ', async () => {
        await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          await token.mint(bAccount, UInt64.from(100_000_000_000));
          token.requireSignature();
        }).catch((e) => {
          expect(e).toBeDefined();
        });
      });
    });

    /*
      test case description:
      token contract can burn tokens with a signature
      tested cases:
        - burns and updates the token balance of the receiver
        - fails if we burn more than the balance amount
    */
    describe('Burn token', () => {
      beforeEach(async () => {
        await setupLocal();
      });
      test('token contract can successfully burn and updates the balances in the ledger (signature)', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await token.mint(bAccount, UInt64.from(100_000));
            token.requireSignature();
          })
        )
          .sign([feePayer.key, tokenAccount.key])
          .send();
        await (
          await Mina.transaction(feePayer, async () => {
            await token.burn(bAccount, UInt64.from(10_000));
            token.requireSignature();
          })
        )
          .sign([bAccount.key, feePayer.key, tokenAccount.key])
          .send();
        expect(Mina.getBalance(bAccount, tokenId).value.toBigInt()).toEqual(90_000n);
      });

      test('throw error if token owner burns more tokens than token account has', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await token.mint(bAccount, UInt64.from(1_000));
            token.requireSignature();
          })
        )
          .sign([feePayer.key, tokenAccount.key])
          .send();
        let tx = (
          await Mina.transaction(feePayer, async () => {
            await token.burn(bAccount, UInt64.from(10_000));
            token.requireSignature();
          })
        ).sign([bAccount.key, feePayer.key, tokenAccount.key]);
        await expect(tx.send()).rejects.toThrow();
      });
    });

    /*
      test case description:
      token contract can transfer tokens with a signature
      tested cases:
        - sends tokens and updates the balance of the receiver
        - fails if no account creation fee is paid for the new token account
        - fails if we transfer more than the balance amount
    */
    describe('Transfer', () => {
      beforeEach(async () => {
        await setupLocal();
      });

      test('change the balance of a token account after sending', async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          await token.mint(bAccount, UInt64.from(100_000));
          token.requireSignature();
        });
        await tx.sign([feePayer.key, tokenAccount.key]).send();

        tx = await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          token.internal.send({
            from: bAccount,
            to: cAccount,
            amount: UInt64.from(10_000),
          });
          AccountUpdate.attachToTransaction(token.self);
          token.requireSignature();
        });
        tx.sign([bAccount.key, cAccount.key, feePayer.key, tokenAccount.key]);
        await tx.send();

        expect(Mina.getBalance(bAccount, tokenId).value.toBigInt()).toEqual(90_000n);
        expect(Mina.getBalance(cAccount, tokenId).value.toBigInt()).toEqual(10_000n);
      });

      test('should error creating a token account if no account creation fee is specified', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await token.mint(bAccount, UInt64.from(100_000));
            token.requireSignature();
          })
        )
          .sign([feePayer.key, tokenAccount.key])
          .send();
        let tx = (
          await Mina.transaction(feePayer, async () => {
            token.internal.send({
              from: bAccount,
              to: cAccount,
              amount: UInt64.from(10_000),
            });
            AccountUpdate.attachToTransaction(token.self);
            token.requireSignature();
          })
        ).sign([bAccount.key, feePayer.key, tokenAccount.key]);

        await expect(tx.send()).rejects.toThrow();
      });

      test('should error if sender sends more tokens than they have', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await token.mint(bAccount, UInt64.from(100_000));
            token.requireSignature();
          })
        )
          .sign([feePayer.key, tokenAccount.key])
          .send();
        let tx = (
          await Mina.transaction(feePayer, async () => {
            token.internal.send({
              from: bAccount,
              to: cAccount,
              amount: UInt64.from(100_000),
            });
            AccountUpdate.attachToTransaction(token.self);
            token.requireSignature();
          })
        ).sign([bAccount.key, feePayer.key, tokenAccount.key]);
        await expect(tx.send()).rejects.toThrow();
      });
    });
  });

  describe('Proof Authorization', () => {
    /*
      test case description:
      Check token contract can be deployed and initialized with proofs
      tested cases:
        - can deploy and initialize child contracts of the parent token contract
    */
    describe('Token Contract Creation/Deployment', () => {
      beforeEach(async () => {
        await setupLocalProofs().catch((err) => {
          console.log(err);
          throw err;
        });
      });

      test('should successfully deploy a token account under a contract', async () => {
        expect(Mina.getAccount(bAccount, tokenId)).toBeDefined();
        expect(Mina.getAccount(bAccount, tokenId).tokenId).toEqual(tokenId);
        expect(Mina.getAccount(cAccount, tokenId)).toBeDefined();
        expect(Mina.getAccount(cAccount, tokenId).tokenId).toEqual(tokenId);
      });
    });

    /*
      test case description:
      token contract can mint new tokens with a proof
      tested cases:
        - mints and updates the token balance of the receiver
    */
    describe('Mint token', () => {
      beforeEach(async () => {
        await setupLocal();
      });

      test('token contract can successfully mint and updates the balances in the ledger (proof)', async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          await token.mint(bAccount, UInt64.from(100_000));
        });
        await tx.prove();
        tx.sign([tokenAccount.key, feePayer.key]);
        await tx.send();
        expect(Mina.getBalance(bAccount, tokenId).value.toBigInt()).toEqual(100_000n);
      });
    });

    describe('Burn token', () => {
      beforeEach(async () => {
        await setupLocal();
      });

      /*
      test case description:
      token contract can burn tokens with a proof 
      tested cases:
        - burns and updates the token balance of the receiver
    */
      test('token contract can successfully burn and updates the balances in the ledger (proof)', async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          await token.mint(bAccount, UInt64.from(100_000));
          token.requireSignature();
        });
        await tx.sign([feePayer.key, tokenAccount.key]).send();
        tx = await Mina.transaction(feePayer, async () => {
          await token.burn(bAccount, UInt64.from(10_000));
        });
        await tx.prove();
        tx.sign([bAccount.key, feePayer.key]);
        await tx.send();
        expect(Mina.getBalance(bAccount, tokenId).value.toBigInt()).toEqual(90_000n);
      });
    });

    /*
      test case description:
      token contract can transfer tokens with a proof
      tested cases:
        - approves a transfer and updates the token balance of the sender and receiver
        - fails if we specify an incorrect layout to witness when authorizing a transfer
        - fails if we specify an empty parent accountUpdate to bypass authorization
    */
    describe('Transfer', () => {
      beforeEach(async () => {
        await setupLocalProofs();
      });

      test('should approve and the balance of a token account after sending', async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          await token.mint(bAccount, UInt64.from(100_000));
          token.requireSignature();
        });
        await tx.prove();
        await tx.sign([feePayer.key, tokenAccount.key]).send();

        tx = await Mina.transaction(feePayer, async () => {
          await b.approveSend(UInt64.from(10_000));

          await token.approveTransfer(bAccount, cAccount, UInt64.from(10_000), b.self);
        });
        await tx.prove();
        await tx.sign([feePayer.key]).send();

        expect(Mina.getBalance(bAccount, tokenId).value.toBigInt()).toEqual(90_000n);
        expect(Mina.getBalance(cAccount, tokenId).value.toBigInt()).toEqual(10_000n);
      });

      test('should fail to approve with an incorrect layout', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            await token.mint(cAccount, UInt64.from(100_000));
            token.requireSignature();
          })
        )
          .sign([feePayer.key, tokenAccount.key])
          .send();

        await expect(() =>
          Mina.transaction(feePayer, async () => {
            await c.approveIncorrectLayout(UInt64.from(10_000));
            await token.approveTransfer(bAccount, cAccount, UInt64.from(10_000), c.self);
          })
        ).rejects.toThrow();
      });

      test('should reject tx if user bypasses the token contract by using an empty account update', async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          token.internal.mint({
            address: bAccount,
            amount: UInt64.from(100_000),
          });
          AccountUpdate.attachToTransaction(token.self);
        });
        await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(/Update_not_permitted_access/);
      });
    });
  });
});
