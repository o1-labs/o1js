import {
  AuthorizationLevel,
  AuthorizationLevelIdentifier,
} from './authorization.js';
import {
  testV1V2ClassEquivalence,
  testV1V2ValueEquivalence,
  testV2Encoding,
  v1FetchLayout,
} from './bindings-test-utils.js';
import { Bool } from '../../provable/bool.js';
import * as TypesV1 from '../../../bindings/mina-transaction/gen/transaction.js';
import * as ValuesV1 from '../../../bindings/mina-transaction/gen/transaction-bigint.js';
import * as JsonV1 from '../../../bindings/mina-transaction/gen/transaction-json.js';
import { jsLayout as layoutV1 } from '../../../bindings/mina-transaction/gen/js-layout.js';
import * as BindingsLeaves from '../../../bindings/mina-transaction/v2/leaves.js';
import { expect } from 'expect';

{
  const identityPredicates: {
    [key in AuthorizationLevelIdentifier]: (x: AuthorizationLevel) => Bool;
  } = {
    Impossible: (x) => x.isImpossible(),
    None: (x) => x.isNone(),
    Proof: (x) => x.isProof(),
    Signature: (x) => x.isSignature(),
    Either: (x) => x.isProofOrSignature(),
  };

  function testExclusiveIdentity(
    authLevel: AuthorizationLevel,
    expectedIdentity: AuthorizationLevelIdentifier
  ) {
    Object.entries(identityPredicates).forEach(([identifier, predicate]) => {
      expect(predicate(authLevel).toBoolean()).toBe(
        identifier === expectedIdentity
      );
    });
  }

  testExclusiveIdentity(AuthorizationLevel.Impossible(), 'Impossible');
  testExclusiveIdentity(AuthorizationLevel.None(), 'None');
  testExclusiveIdentity(AuthorizationLevel.Proof(), 'Proof');
  testExclusiveIdentity(AuthorizationLevel.Signature(), 'Signature');
  testExclusiveIdentity(AuthorizationLevel.ProofOrSignature(), 'Either');
}

const V1AuthorizationLevel = TypesV1.provableFromLayout<
  TypesV1.AccountUpdate['body']['update']['permissions']['value']['editState'],
  ValuesV1.AccountUpdate['body']['update']['permissions']['value']['editState'],
  BindingsLeaves.AuthRequiredIdentifier
>(
  v1FetchLayout(layoutV1.AccountUpdate, [
    'body',
    'update',
    'permissions',
    'inner',
    'editState',
  ])
);

const v1AuthorizationLevel = {
  constant: new Bool(true),
  signatureNecessary: new Bool(false),
  signatureSufficient: new Bool(true),
};

const v2AuthorizationLevel = new AuthorizationLevel({
  constant: new Bool(true),
  signatureNecessary: new Bool(false),
  signatureSufficient: new Bool(true),
});

{
  testV2Encoding(AuthorizationLevel, v2AuthorizationLevel);
  testV1V2ClassEquivalence(V1AuthorizationLevel, AuthorizationLevel, undefined);
  testV1V2ValueEquivalence(
    V1AuthorizationLevel,
    AuthorizationLevel,
    v1AuthorizationLevel,
    v2AuthorizationLevel,
    undefined
  );
}

console.log('\n:)');
