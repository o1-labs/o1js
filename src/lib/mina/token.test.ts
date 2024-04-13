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
   * This deploy method lets a another token account deploy their zkApp and verification key as a child of this token contract.
   * This is important since we want the native token id of the deployed zkApp to be the token id of the token contract.
   */
  @method async deployZkapp(
    address: PublicKey,
    verificationKey: VerificationKey
  ) {
    let tokenId = this.deriveTokenId();
    let zkapp = AccountUpdate.defaultAccountUpdate(address, tokenId);
    this.approve(zkapp);
    zkapp.account.permissions.set(Permissions.default());
    zkapp.account.verificationKey.set(verificationKey);
    zkapp.requireSignature();
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
    let totalAmountInCirculation =
      this.totalAmountInCirculation.getAndRequireEquals();
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

class ContractB extends SmartContract {
  @method async approveSend(amount: UInt64) {
    this.balance.subInPlace(amount);
  }
}

class ContractC extends SmartContract {
  @method async approveSend(amount: UInt64) {
    this.balance.subInPlace(amount);
  }

  @method async approveIncorrectLayout(amount: UInt64) {
    this.balance.subInPlace(amount);
    let update = AccountUpdate.defaultAccountUpdate(this.address);
    this.self.approve(update);
  }
}

let feePayer: Mina.TestAccount;

let tokenContractAccount: Mina.TestAccount;
let tokenContract: TokenContract;
let tokenId: Field;

let contractBAccount: Mina.TestAccount;
let contractB: ContractB;

let contractCAccount: Mina.TestAccount;
let contractC: ContractC;

function setupAccounts() {
  let Local = Mina.LocalBlockchain({
    proofsEnabled: true,
    enforceTransactionLimits: false,
  });
  Mina.setActiveInstance(Local);
  [feePayer, contractBAccount, contractCAccount] = Local.testAccounts;
  tokenContractAccount = Mina.TestAccount.random();
  tokenContract = new TokenContract(tokenContractAccount);
  tokenId = tokenContract.deriveTokenId();
  contractB = new ContractB(contractBAccount, tokenId);
  contractC = new ContractC(contractCAccount, tokenId);
  return Local;
}

async function setupLocal() {
  setupAccounts();
  let tx = await Mina.transaction(feePayer, async () => {
    await tokenContract.deploy();
    let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer);
    feePayerUpdate.send({
      to: tokenContract.self,
      amount: Mina.getNetworkConstants().accountCreationFee,
    });
  });
  tx.sign([tokenContractAccount.key, feePayer.key]);
  await tx.send();
}

async function setupLocalProofs() {
  let Local = setupAccounts();
  contractC = new ContractC(contractCAccount, tokenId);
  // don't use proofs for the setup, takes too long to do this every time
  Local.setProofsEnabled(false);
  let tx = await Mina.transaction({ sender: feePayer }, async () => {
    await tokenContract.deploy();
    let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer, 3);
    feePayerUpdate.send({
      to: tokenContract.self,
      amount: Mina.getNetworkConstants().accountCreationFee,
    });
    await tokenContract.deployZkapp(
      contractBAccount,
      ContractB._verificationKey!
    );
    await tokenContract.deployZkapp(
      contractCAccount,
      ContractC._verificationKey!
    );
  });
  await tx.prove();
  tx.sign([
    tokenContractAccount.key,
    contractBAccount.key,
    contractCAccount.key,
    feePayer.key,
  ]);
  await tx.send();
  Local.setProofsEnabled(true);
}

describe('Token', () => {
  beforeAll(async () => {
    await TokenContract.compile();
    await ContractB.compile();
    await ContractC.compile();
  });

  describe('Signature Authorization', () => {
    /*
      test case description:
      Check token contract can be deployed and initialized
      tested cases:
        - create a new token
        - deploy a zkApp under a custom token
        - create a new valid token with a different parentTokenId
        - set the token symbol after deployment
    */
    describe('Token Contract Creation/Deployment', () => {
      beforeEach(async () => {
        await setupLocal();
      });

      test('correct token id can be derived with an existing token owner', () => {
        expect(tokenId).toEqual(TokenId.derive(tokenContractAccount));
      });

      test('deployed token contract exists in the ledger', () => {
        expect(Mina.getAccount(tokenContractAccount, tokenId)).toBeDefined();
      });

      test('setting a valid token symbol on a token contract', async () => {
        await (
          await Mina.transaction({ sender: feePayer }, async () => {
            let tokenZkapp = AccountUpdate.createSigned(tokenContractAccount);
            tokenZkapp.account.tokenSymbol.set(tokenSymbol);
          })
        )
          .sign([feePayer.key, tokenContractAccount.key])
          .send();
        const symbol = Mina.getAccount(tokenContractAccount).tokenSymbol;
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
            await tokenContract.mint(contractBAccount, UInt64.from(100_000));
            tokenContract.requireSignature();
          })
        )
          .sign([feePayer.key, tokenContractAccount.key])
          .send();
        expect(
          Mina.getBalance(contractBAccount, tokenId).value.toBigInt()
        ).toEqual(100_000n);
      });

      test('minting should fail if overflow occurs ', async () => {
        await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          await tokenContract.mint(
            contractBAccount,
            UInt64.from(100_000_000_000)
          );
          tokenContract.requireSignature();
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
            await tokenContract.mint(contractBAccount, UInt64.from(100_000));
            tokenContract.requireSignature();
          })
        )
          .sign([feePayer.key, tokenContractAccount.key])
          .send();
        await (
          await Mina.transaction(feePayer, async () => {
            await tokenContract.burn(contractBAccount, UInt64.from(10_000));
            tokenContract.requireSignature();
          })
        )
          .sign([contractBAccount.key, feePayer.key, tokenContractAccount.key])
          .send();
        expect(
          Mina.getBalance(contractBAccount, tokenId).value.toBigInt()
        ).toEqual(90_000n);
      });

      test('throw error if token owner burns more tokens than token account has', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await tokenContract.mint(contractBAccount, UInt64.from(1_000));
            tokenContract.requireSignature();
          })
        )
          .sign([feePayer.key, tokenContractAccount.key])
          .send();
        let tx = (
          await Mina.transaction(feePayer, async () => {
            await tokenContract.burn(contractBAccount, UInt64.from(10_000));
            tokenContract.requireSignature();
          })
        ).sign([contractBAccount.key, feePayer.key, tokenContractAccount.key]);
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
          await tokenContract.mint(contractBAccount, UInt64.from(100_000));
          tokenContract.requireSignature();
        });
        await tx.sign([feePayer.key, tokenContractAccount.key]).send();

        tx = await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenContract.internal.send({
            from: contractBAccount,
            to: contractCAccount,
            amount: UInt64.from(10_000),
          });
          AccountUpdate.attachToTransaction(tokenContract.self);
          tokenContract.requireSignature();
        });
        tx.sign([
          contractBAccount.key,
          contractCAccount.key,
          feePayer.key,
          tokenContractAccount.key,
        ]);
        await tx.send();

        expect(
          Mina.getBalance(contractBAccount, tokenId).value.toBigInt()
        ).toEqual(90_000n);
        expect(
          Mina.getBalance(contractCAccount, tokenId).value.toBigInt()
        ).toEqual(10_000n);
      });

      test('should error creating a token account if no account creation fee is specified', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await tokenContract.mint(contractBAccount, UInt64.from(100_000));
            tokenContract.requireSignature();
          })
        )
          .sign([feePayer.key, tokenContractAccount.key])
          .send();
        let tx = (
          await Mina.transaction(feePayer, async () => {
            tokenContract.internal.send({
              from: contractBAccount,
              to: contractCAccount,
              amount: UInt64.from(10_000),
            });
            AccountUpdate.attachToTransaction(tokenContract.self);
            tokenContract.requireSignature();
          })
        ).sign([contractBAccount.key, feePayer.key, tokenContractAccount.key]);

        await expect(tx.send()).rejects.toThrow();
      });

      test('should error if sender sends more tokens than they have', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            AccountUpdate.fundNewAccount(feePayer);
            await tokenContract.mint(contractBAccount, UInt64.from(100_000));
            tokenContract.requireSignature();
          })
        )
          .sign([feePayer.key, tokenContractAccount.key])
          .send();
        let tx = (
          await Mina.transaction(feePayer, async () => {
            tokenContract.internal.send({
              from: contractBAccount,
              to: contractCAccount,
              amount: UInt64.from(100_000),
            });
            AccountUpdate.attachToTransaction(tokenContract.self);
            tokenContract.requireSignature();
          })
        ).sign([contractBAccount.key, feePayer.key, tokenContractAccount.key]);
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

      test('should successfully deploy a token account under a zkApp', async () => {
        expect(Mina.getAccount(contractBAccount, tokenId)).toBeDefined();
        expect(Mina.getAccount(contractBAccount, tokenId).tokenId).toEqual(
          tokenId
        );
        expect(Mina.getAccount(contractCAccount, tokenId)).toBeDefined();
        expect(Mina.getAccount(contractCAccount, tokenId).tokenId).toEqual(
          tokenId
        );
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
          await tokenContract.mint(contractBAccount, UInt64.from(100_000));
        });
        await tx.prove();
        tx.sign([tokenContractAccount.key, feePayer.key]);
        await tx.send();
        expect(
          Mina.getBalance(contractBAccount, tokenId).value.toBigInt()
        ).toEqual(100_000n);
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
          await tokenContract.mint(contractBAccount, UInt64.from(100_000));
          tokenContract.requireSignature();
        });
        await tx.sign([feePayer.key, tokenContractAccount.key]).send();
        tx = await Mina.transaction(feePayer, async () => {
          await tokenContract.burn(contractBAccount, UInt64.from(10_000));
        });
        await tx.prove();
        tx.sign([contractBAccount.key, feePayer.key]);
        await tx.send();
        expect(
          Mina.getBalance(contractBAccount, tokenId).value.toBigInt()
        ).toEqual(90_000n);
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
          await tokenContract.mint(contractBAccount, UInt64.from(100_000));
          tokenContract.requireSignature();
        });
        await tx.prove();
        await tx.sign([feePayer.key, tokenContractAccount.key]).send();

        tx = await Mina.transaction(feePayer, async () => {
          await contractB.approveSend(UInt64.from(10_000));

          await tokenContract.approveTransfer(
            contractBAccount,
            contractCAccount,
            UInt64.from(10_000),
            contractB.self
          );
        });
        await tx.prove();
        await tx.sign([feePayer.key]).send();

        expect(
          Mina.getBalance(contractBAccount, tokenId).value.toBigInt()
        ).toEqual(90_000n);
        expect(
          Mina.getBalance(contractCAccount, tokenId).value.toBigInt()
        ).toEqual(10_000n);
      });

      test('should fail to approve with an incorrect layout', async () => {
        await (
          await Mina.transaction(feePayer, async () => {
            await tokenContract.mint(contractCAccount, UInt64.from(100_000));
            tokenContract.requireSignature();
          })
        )
          .sign([feePayer.key, tokenContractAccount.key])
          .send();

        await expect(() =>
          Mina.transaction(feePayer, async () => {
            await contractC.approveIncorrectLayout(UInt64.from(10_000));
            await tokenContract.approveTransfer(
              contractBAccount,
              contractCAccount,
              UInt64.from(10_000),
              contractC.self
            );
          })
        ).rejects.toThrow();
      });

      test('should reject tx if user bypasses the token contract by using an empty account update', async () => {
        let tx = await Mina.transaction(feePayer, async () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenContract.internal.mint({
            address: contractBAccount,
            amount: UInt64.from(100_000),
          });
          AccountUpdate.attachToTransaction(tokenContract.self);
        });
        await expect(tx.sign([feePayer.key]).send()).rejects.toThrow(
          /Update_not_permitted_access/
        );
      });
    });
  });
});
