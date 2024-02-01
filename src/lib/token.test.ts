import {
  State,
  state,
  UInt64,
  Bool,
  SmartContract,
  Mina,
  PrivateKey,
  AccountUpdate,
  method,
  PublicKey,
  Permissions,
  VerificationKey,
  Field,
  Experimental,
  Int64,
  TokenId,
} from 'o1js';

const tokenSymbol = 'TOKEN';

class TokenContract extends SmartContract {
  SUPPLY = UInt64.from(10n ** 18n);
  @state(UInt64) totalAmountInCirculation = State<UInt64>();

  /**
   * This deploy method lets a another token account deploy their zkApp and verification key as a child of this token contract.
   * This is important since we want the native token id of the deployed zkApp to be the token id of the token contract.
   */
  @method deployZkapp(address: PublicKey, verificationKey: VerificationKey) {
    let tokenId = this.token.id;
    let zkapp = AccountUpdate.defaultAccountUpdate(address, tokenId);
    this.approve(zkapp);
    zkapp.account.permissions.set(Permissions.default());
    zkapp.account.verificationKey.set(verificationKey);
    zkapp.requireSignature();
  }

  init() {
    super.init();
    let address = this.address;
    let receiver = this.token.mint({
      address,
      amount: this.SUPPLY,
    });
    receiver.account.isNew.assertEquals(Bool(true));
    this.balance.subInPlace(Mina.getNetworkConstants().accountCreationFee);
    this.totalAmountInCirculation.set(this.SUPPLY.sub(100_000_000));
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      receive: Permissions.proof(),
      access: Permissions.proofOrSignature(),
    });
  }

  @method mint(receiverAddress: PublicKey, amount: UInt64) {
    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);
    let newTotalAmountInCirculation = totalAmountInCirculation.add(amount);
    newTotalAmountInCirculation.value.assertLessThanOrEqual(
      this.SUPPLY.value,
      "Can't mint more than the total supply"
    );
    this.token.mint({
      address: receiverAddress,
      amount,
    });
    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }

  @method burn(receiverAddress: PublicKey, amount: UInt64) {
    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);
    let newTotalAmountInCirculation = totalAmountInCirculation.sub(amount);
    totalAmountInCirculation.value.assertGreaterThanOrEqual(
      UInt64.from(0).value,
      "Can't burn less than 0"
    );
    this.token.burn({
      address: receiverAddress,
      amount,
    });
    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }

  @method approveTransferCallback(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: UInt64,
    callback: Experimental.Callback<any>
  ) {
    let layout = AccountUpdate.Layout.NoChildren; // Allow only 1 accountUpdate with no children
    let senderAccountUpdate = this.approve(callback, layout);
    let negativeAmount = Int64.fromObject(
      senderAccountUpdate.body.balanceChange
    );
    negativeAmount.assertEquals(Int64.from(amount).neg());
    let tokenId = this.token.id;
    senderAccountUpdate.body.tokenId.assertEquals(tokenId);
    senderAccountUpdate.body.publicKey.assertEquals(senderAddress);
    let receiverAccountUpdate = Experimental.createChildAccountUpdate(
      this.self,
      receiverAddress,
      tokenId
    );
    receiverAccountUpdate.balance.addInPlace(amount);
  }
}

class ZkAppB extends SmartContract {
  @method approveZkapp(amount: UInt64) {
    this.balance.subInPlace(amount);
  }
}

class ZkAppC extends SmartContract {
  @method approveZkapp(amount: UInt64) {
    this.balance.subInPlace(amount);
  }

  @method approveIncorrectLayout(amount: UInt64) {
    this.balance.subInPlace(amount);
    let update = AccountUpdate.defaultAccountUpdate(this.address);
    this.self.approve(update);
  }
}

let feePayerKey: PrivateKey;
let feePayer: PublicKey;
let tokenZkappKey: PrivateKey;
let tokenZkappAddress: PublicKey;
let tokenZkapp: TokenContract;
let tokenId: Field;

let zkAppBKey: PrivateKey;
let zkAppBAddress: PublicKey;
let zkAppB: ZkAppB;

let zkAppCKey: PrivateKey;
let zkAppCAddress: PublicKey;
let zkAppC: ZkAppC;

function setupAccounts() {
  let Local = Mina.LocalBlockchain({
    proofsEnabled: true,
    enforceTransactionLimits: false,
  });
  Mina.setActiveInstance(Local);
  feePayerKey = Local.testAccounts[0].privateKey;
  feePayer = Local.testAccounts[0].publicKey;

  tokenZkappKey = PrivateKey.random();
  tokenZkappAddress = tokenZkappKey.toPublicKey();

  tokenZkapp = new TokenContract(tokenZkappAddress);
  tokenId = tokenZkapp.token.id;

  zkAppBKey = Local.testAccounts[1].privateKey;
  zkAppBAddress = zkAppBKey.toPublicKey();
  zkAppB = new ZkAppB(zkAppBAddress, tokenId);

  zkAppCKey = Local.testAccounts[2].privateKey;
  zkAppCAddress = zkAppCKey.toPublicKey();
  zkAppC = new ZkAppC(zkAppCAddress, tokenId);
  return Local;
}

async function setupLocal() {
  setupAccounts();
  let tx = await Mina.transaction(feePayer, () => {
    let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer);
    feePayerUpdate.send({
      to: tokenZkappAddress,
      amount: Mina.getNetworkConstants().accountCreationFee,
    });
    tokenZkapp.deploy();
  });
  tx.sign([tokenZkappKey, feePayerKey]);
  await tx.send();
}

async function setupLocalProofs() {
  let Local = setupAccounts();
  zkAppC = new ZkAppC(zkAppCAddress, tokenId);
  // don't use proofs for the setup, takes too long to do this every time
  Local.setProofsEnabled(false);
  let tx = await Mina.transaction({ sender: feePayer }, () => {
    let feePayerUpdate = AccountUpdate.fundNewAccount(feePayer, 3);
    feePayerUpdate.send({
      to: tokenZkappAddress,
      amount: Mina.getNetworkConstants().accountCreationFee,
    });
    tokenZkapp.deploy();
    tokenZkapp.deployZkapp(zkAppBAddress, ZkAppB._verificationKey!);
    tokenZkapp.deployZkapp(zkAppCAddress, ZkAppC._verificationKey!);
  });
  await tx.prove();
  tx.sign([tokenZkappKey, zkAppBKey, zkAppCKey, feePayerKey]);
  await tx.send();
  Local.setProofsEnabled(true);
}

describe('Token', () => {
  beforeAll(async () => {
    await TokenContract.compile();
    await ZkAppB.compile();
    await ZkAppC.compile();
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
        expect(tokenId).toEqual(TokenId.derive(tokenZkappAddress));
      });

      test('deployed token contract exists in the ledger', () => {
        expect(Mina.getAccount(tokenZkappAddress, tokenId)).toBeDefined();
      });

      test('setting a valid token symbol on a token contract', async () => {
        await (
          await Mina.transaction({ sender: feePayer }, () => {
            let tokenZkapp = AccountUpdate.createSigned(tokenZkappAddress);
            tokenZkapp.account.tokenSymbol.set(tokenSymbol);
          })
        )
          .sign([feePayerKey, tokenZkappKey])
          .send();
        const symbol = Mina.getAccount(tokenZkappAddress).tokenSymbol;
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
          await Mina.transaction({ sender: feePayer }, () => {
            AccountUpdate.fundNewAccount(feePayer);
            tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
            tokenZkapp.requireSignature();
          })
        )
          .sign([feePayerKey, tokenZkappKey])
          .send();
        expect(
          Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
        ).toEqual(100_000n);
      });

      test('minting should fail if overflow occurs ', async () => {
        await Mina.transaction(feePayer, () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000_000_000));
          tokenZkapp.requireSignature();
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
          await Mina.transaction(feePayer, () => {
            AccountUpdate.fundNewAccount(feePayer);
            tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
            tokenZkapp.requireSignature();
          })
        )
          .sign([feePayerKey, tokenZkappKey])
          .send();
        await (
          await Mina.transaction(feePayer, () => {
            tokenZkapp.burn(zkAppBAddress, UInt64.from(10_000));
            tokenZkapp.requireSignature();
          })
        )
          .sign([zkAppBKey, feePayerKey, tokenZkappKey])
          .send();
        expect(
          Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
        ).toEqual(90_000n);
      });

      test('throw error if token owner burns more tokens than token account has', async () => {
        await (
          await Mina.transaction(feePayer, () => {
            AccountUpdate.fundNewAccount(feePayer);
            tokenZkapp.mint(zkAppBAddress, UInt64.from(1_000));
            tokenZkapp.requireSignature();
          })
        )
          .sign([feePayerKey, tokenZkappKey])
          .send();
        let tx = (
          await Mina.transaction(feePayer, () => {
            tokenZkapp.burn(zkAppBAddress, UInt64.from(10_000));
            tokenZkapp.requireSignature();
          })
        ).sign([zkAppBKey, feePayerKey, tokenZkappKey]);
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
        let tx = await Mina.transaction(feePayer, () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
          tokenZkapp.requireSignature();
        });
        await tx.sign([feePayerKey, tokenZkappKey]).send();

        tx = await Mina.transaction(feePayer, () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenZkapp.token.send({
            from: zkAppBAddress,
            to: zkAppCAddress,
            amount: UInt64.from(10_000),
          });
          AccountUpdate.attachToTransaction(tokenZkapp.self);
          tokenZkapp.requireSignature();
        });
        tx.sign([zkAppBKey, zkAppCKey, feePayerKey, tokenZkappKey]);
        await tx.send();

        expect(
          Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
        ).toEqual(90_000n);
        expect(
          Mina.getBalance(zkAppCAddress, tokenId).value.toBigInt()
        ).toEqual(10_000n);
      });

      test('should error creating a token account if no account creation fee is specified', async () => {
        await (
          await Mina.transaction(feePayer, () => {
            AccountUpdate.fundNewAccount(feePayer);
            tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
            tokenZkapp.requireSignature();
          })
        )
          .sign([feePayerKey, tokenZkappKey])
          .send();
        let tx = (
          await Mina.transaction(feePayer, () => {
            tokenZkapp.token.send({
              from: zkAppBAddress,
              to: zkAppCAddress,
              amount: UInt64.from(10_000),
            });
            AccountUpdate.attachToTransaction(tokenZkapp.self);
            tokenZkapp.requireSignature();
          })
        ).sign([zkAppBKey, feePayerKey, tokenZkappKey]);

        await expect(tx.send()).rejects.toThrow();
      });

      test('should error if sender sends more tokens than they have', async () => {
        await (
          await Mina.transaction(feePayer, () => {
            AccountUpdate.fundNewAccount(feePayer);
            tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
            tokenZkapp.requireSignature();
          })
        )
          .sign([feePayerKey, tokenZkappKey])
          .send();
        let tx = (
          await Mina.transaction(feePayer, () => {
            tokenZkapp.token.send({
              from: zkAppBAddress,
              to: zkAppCAddress,
              amount: UInt64.from(100_000),
            });
            AccountUpdate.attachToTransaction(tokenZkapp.self);
            tokenZkapp.requireSignature();
          })
        ).sign([zkAppBKey, feePayerKey, tokenZkappKey]);
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
        expect(Mina.getAccount(zkAppBAddress, tokenId)).toBeDefined();
        expect(Mina.getAccount(zkAppBAddress, tokenId).tokenId).toEqual(
          tokenId
        );
        expect(Mina.getAccount(zkAppCAddress, tokenId)).toBeDefined();
        expect(Mina.getAccount(zkAppCAddress, tokenId).tokenId).toEqual(
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
        let tx = await Mina.transaction(feePayer, () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
        });
        await tx.prove();
        tx.sign([tokenZkappKey, feePayerKey]);
        await tx.send();
        expect(
          Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
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
        let tx = await Mina.transaction(feePayer, () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
          tokenZkapp.requireSignature();
        });
        await tx.sign([feePayerKey, tokenZkappKey]).send();
        tx = await Mina.transaction(feePayer, () => {
          tokenZkapp.burn(zkAppBAddress, UInt64.from(10_000));
        });
        await tx.prove();
        tx.sign([zkAppBKey, feePayerKey]);
        await tx.send();
        expect(
          Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
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
        let tx = await Mina.transaction(feePayer, () => {
          tokenZkapp.mint(zkAppBAddress, UInt64.from(100_000));
          tokenZkapp.requireSignature();
        });
        await tx.prove();
        await tx.sign([feePayerKey, tokenZkappKey]).send();

        tx = await Mina.transaction(feePayer, () => {
          let approveSendingCallback = Experimental.Callback.create(
            zkAppB,
            'approveZkapp',
            [UInt64.from(10_000)]
          );
          tokenZkapp.approveTransferCallback(
            zkAppBAddress,
            zkAppCAddress,
            UInt64.from(10_000),
            approveSendingCallback
          );
        });
        await tx.prove();
        await tx.sign([feePayerKey]).send();

        expect(
          Mina.getBalance(zkAppBAddress, tokenId).value.toBigInt()
        ).toEqual(90_000n);
        expect(
          Mina.getBalance(zkAppCAddress, tokenId).value.toBigInt()
        ).toEqual(10_000n);
      });

      test('should fail to approve with an incorrect layout', async () => {
        await (
          await Mina.transaction(feePayer, () => {
            tokenZkapp.mint(zkAppCAddress, UInt64.from(100_000));
            tokenZkapp.requireSignature();
          })
        )
          .sign([feePayerKey, tokenZkappKey])
          .send();

        await expect(() =>
          Mina.transaction(feePayer, () => {
            let approveSendingCallback = Experimental.Callback.create(
              zkAppC,
              'approveIncorrectLayout',
              [UInt64.from(10_000)]
            );
            tokenZkapp.approveTransferCallback(
              zkAppBAddress,
              zkAppCAddress,
              UInt64.from(10_000),
              approveSendingCallback
            );
          })
        ).rejects.toThrow();
      });

      test('should reject tx if user bypasses the token contract by using an empty account update', async () => {
        let tx = await Mina.transaction(feePayer, () => {
          AccountUpdate.fundNewAccount(feePayer);
          tokenZkapp.token.mint({
            address: zkAppBAddress,
            amount: UInt64.from(100_000),
          });
          AccountUpdate.attachToTransaction(tokenZkapp.self);
        });
        await expect(tx.sign([feePayerKey]).send()).rejects.toThrow(
          /Update_not_permitted_access/
        );
      });
    });
  });
});
