/**
 * Parity tests comparing TypeScript Ledger implementation with OCaml implementation.
 *
 * These tests ensure that the TS implementation matches the behavior of the original OCaml local_ledger.ml
 */

import { Ledger as TSLedger } from './local-ledger.js';
import { Ledger as OCamlLedger } from '../../../bindings.js';
import { Ml } from '../../ml/conversion.js';
import { PrivateKey, PublicKey } from '../../provable/crypto/signature.js';
import { Field } from '../../provable/wrapped.js';
import { UInt64, UInt32 } from '../../provable/int.js';
import { Mina, AccountUpdate } from '../../../index.js';
import { ZkappCommand } from './account-update.js';
import type { FieldConst } from '../../provable/core/fieldvar.js';
import type { MlPublicKey } from '../../../bindings.js';

describe('Ledger Parity Tests (TS vs OCaml)', () => {
  // helper to create test public key in ML format
  function createTestPublicKey(x: bigint, isOdd: boolean = false): MlPublicKey {
    const fieldConst: FieldConst = [0, x];
    const mlBool: 0 | 1 = isOdd ? 1 : 0;
    return [0, fieldConst, mlBool];
  }

  function defaultTokenId(): FieldConst {
    return [0, 1n];
  }

  describe('Basic Account Operations', () => {
    it('should create ledgers with same initial state', () => {
      const tsLedger = TSLedger.create();
      const ocamlLedger = OCamlLedger.create();

      expect(tsLedger).toBeDefined();
      expect(ocamlLedger).toBeDefined();
    });

    it('should store and retrieve accounts identically', () => {
      const tsLedger = TSLedger.create();
      const ocamlLedger = OCamlLedger.create();

      const pk = createTestPublicKey(42n);
      const balance = '1000000000';

      tsLedger.addAccount(pk, balance);
      ocamlLedger.addAccount(pk, balance);

      const tsAccount = tsLedger.getAccount(pk, defaultTokenId());
      const ocamlAccount = ocamlLedger.getAccount(pk, defaultTokenId());

      expect(tsAccount).toBeDefined();
      expect(ocamlAccount).toBeDefined();

      // compare critical fields
      expect(tsAccount!.balance).toBe(ocamlAccount!.balance);
      expect(tsAccount!.nonce).toBe(ocamlAccount!.nonce);
      expect(tsAccount!.tokenSymbol).toBe(ocamlAccount!.tokenSymbol);
    });

    it('should handle multiple accounts identically', () => {
      const tsLedger = TSLedger.create();
      const ocamlLedger = OCamlLedger.create();

      const accounts = [
        { pk: createTestPublicKey(1n), balance: '1000' },
        { pk: createTestPublicKey(2n), balance: '2000' },
        { pk: createTestPublicKey(3n), balance: '3000' },
      ];

      for (const { pk, balance } of accounts) {
        tsLedger.addAccount(pk, balance);
        ocamlLedger.addAccount(pk, balance);
      }

      for (const { pk } of accounts) {
        const tsAccount = tsLedger.getAccount(pk, defaultTokenId());
        const ocamlAccount = ocamlLedger.getAccount(pk, defaultTokenId());

        expect(tsAccount!.balance).toBe(ocamlAccount!.balance);
      }
    });
  });

  describe('Transaction Application Parity', () => {
    let tsLedger: TSLedger;
    let ocamlLedger: any;
    let feePayer: Mina.TestPublicKey;
    let contractAccount: Mina.TestPublicKey;

    beforeEach(async () => {
      let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
      Mina.setActiveInstance(Local);
      [feePayer] = Local.testAccounts;
      contractAccount = Mina.TestPublicKey.random();

      tsLedger = TSLedger.create();
      ocamlLedger = OCamlLedger.create();

      const feePayerPk = Ml.fromPublicKey(feePayer);
      tsLedger.addAccount(feePayerPk, '10000000000'); // 10 MINA
      ocamlLedger.addAccount(feePayerPk, '10000000000');

      const contractPk = Ml.fromPublicKey(contractAccount);
      tsLedger.addAccount(contractPk, '1000000000'); // 1 MINA
      ocamlLedger.addAccount(contractPk, '1000000000');
    });

    it('should apply simple nonce increment transaction identically', async () => {
      const tx = await Mina.transaction(feePayer, async () => {
        const accountUpdate = AccountUpdate.create(contractAccount);
        accountUpdate.requireSignature();
        // increment nonce, no balance change
      });

      await tx.sign([feePayer.key, contractAccount.key]);
      const zkappCommandJson = ZkappCommand.toJSON(tx.transaction);
      console.log('Transaction fee:', zkappCommandJson.feePayer.body.fee);
      console.log('Fee payer nonce:', zkappCommandJson.feePayer.body.nonce);
      console.log('Fee payer public key:', zkappCommandJson.feePayer.body.publicKey);
      console.log('Number of account updates:', zkappCommandJson.accountUpdates.length);
      zkappCommandJson.accountUpdates.forEach((au: any, i: number) => {
        console.log(`Account update ${i} public key:`, au.body.publicKey);
      });

      const txJson = JSON.stringify(zkappCommandJson);
      const accountCreationFee = '1000000000';

      const networkState = JSON.stringify({
        snarkedLedgerHash: Field(0).toJSON(),
        blockchainLength: UInt32.from(0).toJSON(),
        minWindowDensity: UInt32.from(0).toJSON(),
        totalCurrency: UInt64.from(0).toJSON(),
        globalSlotSinceGenesis: UInt32.from(0).toJSON(),
        stakingEpochData: {
          ledger: {
            hash: Field(0).toJSON(),
            totalCurrency: UInt64.from(0).toJSON(),
          },
          seed: Field(0).toJSON(),
          startCheckpoint: Field(0).toJSON(),
          lockCheckpoint: Field(0).toJSON(),
          epochLength: UInt32.from(0).toJSON(),
        },
        nextEpochData: {
          ledger: {
            hash: Field(0).toJSON(),
            totalCurrency: UInt64.from(0).toJSON(),
          },
          seed: Field(0).toJSON(),
          startCheckpoint: Field(0).toJSON(),
          lockCheckpoint: Field(0).toJSON(),
          epochLength: UInt32.from(0).toJSON(),
        },
      });

      const feePayerPk = Ml.fromPublicKey(feePayer);
      const contractPk = Ml.fromPublicKey(contractAccount);

      const tsFeePayerBefore = tsLedger.getAccount(feePayerPk, defaultTokenId());
      const ocamlFeePayerBefore = ocamlLedger.getAccount(feePayerPk, defaultTokenId());

      console.log('Before TS fee payer:', tsFeePayerBefore);
      console.log('Before OCaml fee payer:', ocamlFeePayerBefore);

      let tsError: string | null = null;
      let ocamlError: string | null = null;

      try {
        await tsLedger.applyJsonTransaction(txJson, accountCreationFee, networkState);
      } catch (err: any) {
        tsError = err.message;
        console.log('TS Error:', err.message);
      }

      try {
        ocamlLedger.applyJsonTransaction(txJson, accountCreationFee, networkState);
      } catch (err: any) {
        ocamlError = err.message;
        console.log('OCaml Error:', err.message);
      }

      if (tsError || ocamlError) {
        expect(tsError).toBe(ocamlError);
        return;
      }

      const tsFeePayerAccount = tsLedger.getAccount(feePayerPk, defaultTokenId());
      const ocamlFeePayerAccount = ocamlLedger.getAccount(feePayerPk, defaultTokenId());

      const tsContractAccount = tsLedger.getAccount(contractPk, defaultTokenId());
      const ocamlContractAccount = ocamlLedger.getAccount(contractPk, defaultTokenId());

      console.log('After TS fee payer:', tsFeePayerAccount);
      console.log('After OCaml fee payer:', ocamlFeePayerAccount);
      console.log('After TS contract:', tsContractAccount);
      console.log('After OCaml contract:', ocamlContractAccount);

      console.log('\n=== RECEIPT HASH COMPARISON ===');
      console.log('Fee payer receipt hashes:');
      console.log('  TS:    ', tsFeePayerAccount!.receiptChainHash);
      console.log('  OCaml: ', ocamlFeePayerAccount!.receiptChainHash);
      console.log('  Match: ', tsFeePayerAccount!.receiptChainHash === ocamlFeePayerAccount!.receiptChainHash);

      expect(tsFeePayerAccount!.balance).toBe(ocamlFeePayerAccount!.balance);
      expect(tsFeePayerAccount!.nonce).toBe(ocamlFeePayerAccount!.nonce);
      expect(tsFeePayerAccount!.receiptChainHash).toBe(ocamlFeePayerAccount!.receiptChainHash);
      expect(tsFeePayerAccount!.delegate).toBe(ocamlFeePayerAccount!.delegate);

      expect(tsContractAccount!.balance).toBe(ocamlContractAccount!.balance);
      expect(tsContractAccount!.nonce).toBe(ocamlContractAccount!.nonce);
      expect(tsContractAccount!.receiptChainHash).toBe(ocamlContractAccount!.receiptChainHash);
      expect(tsContractAccount!.delegate).toBe(ocamlContractAccount!.delegate);
    });
  });

  describe('Error Handling Parity', () => {
    it.skip('should reject invalid transactions identically', () => {
      // TODO: test that both implementations reject the same invalid transactions with the same error messages
    });

    it.skip('should handle precondition failures identically', () => {
      // TODO: test that precondition failures produce same errors
    });
  });
});
