import { AccountUpdate, AccountUpdateTree, Authorized } from './account-update.js';
import { PrivateKey, PublicKey } from "src/lib/provable/crypto/signature.ts";
import { Signature } from '../../../mina-signer/src/signature.js'
import { NetworkId } from '../../../mina-signer/src/types.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/v2/js-layout.js';

export type { Mina };
/**
 * Mina blockchain types
 */
declare namespace Mina {
    interface SignatureAuthorizationEnvironment {
      networkId: NetworkId;
      privateKey: PrivateKey;
      fullTransactionCommitment: BigInt; // TODO: Field
    }
    interface ProofAuthorizationEnvironment {
        networkId: NetworkId;
        getPrivateKey(publicKey: PublicKey): Promise<PrivateKey>;
    }

    interface Transaction<T extends Transaction<T>> {
        readonly __type: ['FeeTransfer', 'SignedCommand', 'ZkAppCommand'][number];
        
        /**
         * Short string (max length 32) that can be used to describe the transaction.
         * This is not used in the protocol, but it is public on chain and can be used
         * for indexing or in application logic.
         */
        memo?: string;

        /**
         * The public key of the account, the amount, and the metadata associated with the fee for this transaction.
         */
        feePayer: BindingsLayout.FeePayerBody;

        /**
         * List of trees of {@link AccountUpdate}s included in this transaction
         */
        accountUpdateForest?: AccountUpdateTree<AccountUpdate>[];
        
        authorizedAccountUpdateForest?: AccountUpdateTree<Authorized>[];

        authorization?: Signature;

        /**
         * Signs the transaction, authorizing any included account updates
         * that require the signer's signature.
         * 
         * @param authorizationEnvironment - The private key of the siger, and the relevant commitments to be signed
         * @returns An authorized {@link Transaction}
         */
        authorizeSignature?({
            networkId,
            privateKey,
            fullTransactionCommitment,
        }: SignatureAuthorizationEnvironment): T

        /**
         * Proves the transaction, authorizing any included account updates
         * that require proof.
         * 
         * @param authorizationEnvironment - The fee payer signature authorization environment (this is required on top of the proof authorization in any case)
         * @returns An authorized {@link Transaction}
         */
        authorizeProof?({
            networkId,
            getPrivateKey
        }: ProofAuthorizationEnvironment): Promise<T>

        /**
         * Converts the transaction to a JSON object.
         * 
         * @returns A JSON object representing the transaction
         */
        toJSON(): any;
            
    }
}
