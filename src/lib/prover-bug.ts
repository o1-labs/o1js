import {
  Authorization,
  Body,
  CallForest,
  smartContractContext,
  zkAppProver,
} from './account_update.js';
import {
  getPreviousProofsForProver,
  inProver,
  methodArgumentsToConstant,
  methodArgumentTypesAndValues,
  MethodInterface,
} from './proof_system.js';
import {
  isReady,
  method,
  Mina,
  AccountUpdate,
  PrivateKey,
  SmartContract,
  Circuit,
  provable,
  Bool,
  Field,
  Encoding,
  Poseidon,
} from '../index.js';
import {
  getBlindingValue,
  memoizationContext,
  toConstant,
} from './circuit_value.js';
import { assertStatePrecondition } from './state.js';
import { Poseidon as Poseidon_ } from '../snarky.js';

await isReady;

class Approver extends SmartContract {
  @method approveX(update: AccountUpdate) {
    Circuit.log('previousParent', update.parent);
    console.log('previousParent undefined', update.parent === undefined);

    this.approve(update, AccountUpdate.Layout.NoChildren);
  }
}

class Caller extends SmartContract {
  @method call() {
    let accountUpdate = AccountUpdate.defaultAccountUpdate(otherAddress);
    // Mina.currentTransaction.get().accountUpdates.push(accountUpdate);
    this.self.children.accountUpdates.push(accountUpdate);
    accountUpdate.parent = this.self;

    let adder = new Approver(approverAddress);

    // adder.approveX(accountUpdate);

    let methodIntf: MethodInterface = (Approver as any)._internalMethods![0];
    let methodName = methodIntf.methodName;
    let method = (methodIntf as any).method as typeof adder.approveX;
    callApprove(accountUpdate);

    function callApprove(...actualArgs: any[]) {
      // if we're here, this method was called inside _another_ smart contract method
      let parentAccountUpdate = smartContractContext.get().this.self;
      let methodCallDepth = smartContractContext.get().methodCallDepth;
      let [, result] = smartContractContext.runWith(
        {
          this: adder,
          methodCallDepth: methodCallDepth + 1,
          isCallback: false,
          selfUpdate: selfAccountUpdate(adder, methodName),
        },
        () => {
          // if the call result is not undefined but there's no known returnType, the returnType was probably not annotated properly,
          // so we have to explain to the user how to do that
          let { returnType } = methodIntf;
          let noReturnTypeError =
            `To return a result from ${methodIntf.methodName}() inside another zkApp, you need to declare the return type.\n` +
            `This can be done by annotating the type at the end of the function signature. For example:\n\n` +
            `@method ${methodIntf.methodName}(): Field {\n` +
            `  // ...\n` +
            `}\n\n` +
            `Note: Only types built out of \`Field\` are valid return types. This includes snarkyjs primitive types and custom CircuitValues.`;
          // if we're lucky, analyzeMethods was already run on the callee smart contract, and we can catch this error early
          if (
            (Approver as any)._methodMetadata[methodIntf.methodName]
              ?.hasReturn &&
            returnType === undefined
          ) {
            throw Error(noReturnTypeError);
          }
          // we just reuse the blinding value of the caller for the callee
          let blindingValue = getBlindingValue();

          let runCalledContract = () => {
            let constantArgs = methodArgumentsToConstant(
              methodIntf,
              actualArgs
            );
            let constantBlindingValue = blindingValue.toConstant();
            let accountUpdate = adder.self;
            accountUpdate.body.callDepth =
              parentAccountUpdate.body.callDepth + 1;
            accountUpdate.parent = parentAccountUpdate;

            let [{ memoized }, result] = memoizationContext.runWith(
              {
                memoized: [],
                currentIndex: 0,
                blindingValue: constantBlindingValue,
              },
              () => method.apply(adder, constantArgs as [any])
            );
            assertStatePrecondition(adder);

            if (result !== undefined) {
              if (returnType === undefined) {
                throw Error(noReturnTypeError);
              } else {
                result = toConstant(returnType, result);
              }
            }

            // store inputs + result in callData
            let callDataFields = computeCallData(
              methodIntf,
              constantArgs,
              result,
              constantBlindingValue
            );
            accountUpdate.body.callData = Poseidon_.hash(callDataFields, false);

            if (!Authorization.hasAny(accountUpdate)) {
              Authorization.setLazyProof(accountUpdate, {
                methodName: methodIntf.methodName,
                args: constantArgs,
                previousProofs: getPreviousProofsForProver(
                  constantArgs,
                  methodIntf
                ),
                ZkappClass: Approver,
                memoized,
                blindingValue: constantBlindingValue,
              });
            }
            return { accountUpdate, result: null };
          };

          // we have to run the called contract inside a witness block, to not affect the caller's circuit
          // however, if this is a nested call -- the caller is already called by another contract --,
          // then we're already in a witness block, and shouldn't open another one
          let { accountUpdate, result } =
            methodCallDepth === 0
              ? AccountUpdate.witness<any>(
                  returnType ?? provable(null),
                  runCalledContract,
                  { skipCheck: true }
                )
              : runCalledContract();

          // we're back in the _caller's_ circuit now, where we assert stuff about the method call

          // connect accountUpdate to our own. outside Circuit.witness so compile knows the right structure when hashing children
          accountUpdate.body.callDepth = parentAccountUpdate.body.callDepth + 1;
          accountUpdate.parent = parentAccountUpdate;
          // beware: we don't include the callee's children in the caller circuit
          // nothing is asserted about them -- it's the callee's task to check their children
          accountUpdate.children.callsType = { type: 'Witness' };
          parentAccountUpdate.children.accountUpdates.push(accountUpdate);

          // assert that we really called the right zkapp
          accountUpdate.body.publicKey.assertEquals(adder.address);
          accountUpdate.body.tokenId.assertEquals(adder.self.body.tokenId);

          // assert that the inputs & outputs we have match what the callee put on its callData
          let callDataFields = computeCallData(
            methodIntf,
            actualArgs,
            result,
            blindingValue
          );
          let callData = Poseidon.hash(callDataFields);
          accountUpdate.body.callData.assertEquals(callData);

          // caller circuits should be Delegate_call by default, except if they're called at the top level
          let isTopLevel = Circuit.witness(Bool, () => {
            // TODO: this logic is fragile.. need better way of finding out if parent is the prover account update or not
            let isProverUpdate =
              inProver() &&
              zkAppProver
                .getData()
                .accountUpdate.body.publicKey.equals(
                  parentAccountUpdate.body.publicKey
                )
                .toBoolean();
            let parentCallDepth = isProverUpdate
              ? zkAppProver.getData().accountUpdate.body.callDepth
              : CallForest.computeCallDepth(parentAccountUpdate);
            console.log({ parentCallDepth });
            return Bool(parentCallDepth === 0);
          });
          console.log(isTopLevel);
          parentAccountUpdate.isDelegateCall = isTopLevel.not();

          return result;
        }
      );
    }
  }
}

// script to deploy zkapps and do interactions

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let feePayer = Local.testAccounts[0].privateKey;

let approverKey = PrivateKey.random();
let approverAddress = approverKey.toPublicKey();
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();
let otherKey = PrivateKey.random();
let otherAddress = otherKey.toPublicKey();

let zkapp = new Caller(zkappAddress);
let adderZkapp = new Approver(approverAddress);
console.log('compile (approver)');
await Approver.compile();
console.log('compile (caller)');
await Caller.compile();

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer, {
    initialBalance: Mina.accountCreationFee().mul(2),
  });
  zkapp.deploy({ zkappKey });
  adderZkapp.deploy({ zkappKey: approverKey });
  AccountUpdate.create(otherAddress); // this is like "touch", to create an account
});
await tx.send();

console.log('call interaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.call();
});
await tx.prove();
await tx.send();

/**
 * compute fields to be hashed as callData, in a way that the hash & circuit changes whenever
 * the method signature changes, i.e., the argument / return types represented as lists of field elements and the methodName.
 * see https://github.com/o1-labs/snarkyjs/issues/303#issuecomment-1196441140
 */
function computeCallData(
  methodIntf: MethodInterface,
  argumentValues: any[],
  returnValue: any,
  blindingValue: Field
) {
  let { returnType, methodName } = methodIntf;
  let args = methodArgumentTypesAndValues(methodIntf, argumentValues);
  let argSizesAndFields: Field[][] = args.map(({ type, value }) => [
    Field(type.sizeInFields()),
    ...type.toFields(value),
  ]);
  let totalArgSize = Field(
    args.map(({ type }) => type.sizeInFields()).reduce((s, t) => s + t, 0)
  );
  let totalArgFields = argSizesAndFields.flat();
  let returnSize = Field(returnType?.sizeInFields() ?? 0);
  let returnFields = returnType?.toFields(returnValue) ?? [];
  let methodNameFields = Encoding.stringToFields(methodName);
  return [
    // we have to encode the sizes of arguments / return value, so that fields can't accidentally shift
    // from one argument to another, or from arguments to the return value, or from the return value to the method name
    totalArgSize,
    ...totalArgFields,
    returnSize,
    ...returnFields,
    // we don't have to encode the method name size because the blinding value is fixed to one field element,
    // so method name fields can't accidentally become the blinding value and vice versa
    ...methodNameFields,
    blindingValue,
  ];
}

function selfAccountUpdate(zkapp: SmartContract, methodName?: string) {
  let body = Body.keepAll(zkapp.address);
  if (zkapp.tokenId) {
    body.tokenId = zkapp.tokenId;
    body.caller = zkapp.tokenId;
  }
  let update = new (AccountUpdate as any)(body, {}, true) as AccountUpdate;
  update.label = methodName
    ? `${zkapp.constructor.name}.${methodName}()`
    : `${zkapp.constructor.name}, no method`;
  return update;
}
