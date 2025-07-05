import { Bool, Field } from '../../provable/wrapped.js';
import { circuitValueEquals, cloneCircuitValue } from '../../provable/types/struct.js';
import { Provable } from '../../provable/provable.js';
import { activeInstance as Mina } from './mina-instance.js';
import { Int64, UInt32, UInt64 } from '../../provable/int.js';
import { jsLayout } from '../../../bindings/mina-transaction/gen/v1/js-layout.js';
import { emptyReceiptChainHash, TokenSymbol } from '../../provable/crypto/poseidon.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { ActionState, Actions, ZkappUri, } from '../../../bindings/mina-transaction/v1/transaction-leaves.js';
import { ZkappStateLength } from './mina-instance.js';
import { assertInternal } from '../../util/errors.js';
export { preconditions, Account, Network, CurrentSlot, assertPreconditionInvariants, cleanPreconditionsCache, ensureConsistentPrecondition, getAccountPreconditions, Preconditions, };
let NetworkPrecondition = {
    ignoreAll() {
        let stakingEpochData = {
            ledger: { hash: ignore(Field(0)), totalCurrency: ignore(uint64()) },
            seed: ignore(Field(0)),
            startCheckpoint: ignore(Field(0)),
            lockCheckpoint: ignore(Field(0)),
            epochLength: ignore(uint32()),
        };
        let nextEpochData = cloneCircuitValue(stakingEpochData);
        return {
            snarkedLedgerHash: ignore(Field(0)),
            blockchainLength: ignore(uint32()),
            minWindowDensity: ignore(uint32()),
            totalCurrency: ignore(uint64()),
            globalSlotSinceGenesis: ignore(uint32()),
            stakingEpochData,
            nextEpochData,
        };
    },
};
/**
 * Ignores a `dummy`
 *
 * @param dummy The value to ignore
 * @returns Always an ignored value regardless of the input.
 */
function ignore(dummy) {
    return { isSome: Bool(false), value: dummy };
}
/**
 * Ranges between all uint32 values
 */
const uint32 = () => ({ lower: UInt32.from(0), upper: UInt32.MAXINT() });
/**
 * Ranges between all uint64 values
 */
const uint64 = () => ({ lower: UInt64.from(0), upper: UInt64.MAXINT() });
const AccountPrecondition = {
    ignoreAll() {
        let appState = [];
        for (let i = 0; i < ZkappStateLength; ++i) {
            appState.push(ignore(Field(0)));
        }
        return {
            balance: ignore(uint64()),
            nonce: ignore(uint32()),
            receiptChainHash: ignore(Field(0)),
            delegate: ignore(PublicKey.empty()),
            state: appState,
            actionState: ignore(Actions.emptyActionState()),
            provedState: ignore(Bool(false)),
            isNew: ignore(Bool(false)),
        };
    },
};
const GlobalSlotPrecondition = {
    ignoreAll() {
        return ignore(uint32());
    },
};
const Preconditions = {
    ignoreAll() {
        return {
            account: AccountPrecondition.ignoreAll(),
            network: NetworkPrecondition.ignoreAll(),
            validWhile: GlobalSlotPrecondition.ignoreAll(),
        };
    },
};
function preconditions(accountUpdate, isSelf) {
    initializePreconditions(accountUpdate, isSelf);
    return {
        account: Account(accountUpdate),
        network: Network(accountUpdate),
        currentSlot: CurrentSlot(accountUpdate),
    };
}
// note: please keep the two precondition implementations separate
// so we can add customized fields easily
function Network(accountUpdate) {
    let layout = jsLayout.AccountUpdate.entries.body.entries.preconditions.entries.network;
    let context = getPreconditionContextExn(accountUpdate);
    let network = preconditionClass(layout, 'network', accountUpdate, context);
    let timestamp = {
        get() {
            let slot = network.globalSlotSinceGenesis.get();
            return globalSlotToTimestamp(slot);
        },
        getAndRequireEquals() {
            let slot = network.globalSlotSinceGenesis.getAndRequireEquals();
            return globalSlotToTimestamp(slot);
        },
        requireEquals(value) {
            let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
            let slot = timestampToGlobalSlot(value, `Timestamp precondition unsatisfied: the timestamp can only equal numbers of the form ${genesisTimestamp} + k*${slotTime},\n` +
                `i.e., the genesis timestamp plus an integer number of slots.`);
            return network.globalSlotSinceGenesis.requireEquals(slot);
        },
        requireEqualsIf(condition, value) {
            let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
            let slot = timestampToGlobalSlot(value, `Timestamp precondition unsatisfied: the timestamp can only equal numbers of the form ${genesisTimestamp} + k*${slotTime},\n` +
                `i.e., the genesis timestamp plus an integer number of slots.`);
            return network.globalSlotSinceGenesis.requireEqualsIf(condition, slot);
        },
        requireBetween(lower, upper) {
            let [slotLower, slotUpper] = timestampToGlobalSlotRange(lower, upper);
            return network.globalSlotSinceGenesis.requireBetween(slotLower, slotUpper);
        },
        requireNothing() {
            return network.globalSlotSinceGenesis.requireNothing();
        },
    };
    return { ...network, timestamp };
}
function Account(accountUpdate) {
    let layout = jsLayout.AccountUpdate.entries.body.entries.preconditions.entries.account;
    let context = getPreconditionContextExn(accountUpdate);
    let identity = (x) => x;
    let update = {
        delegate: {
            ...preconditionSubclass(accountUpdate, 'account.delegate', PublicKey, context),
            ...updateSubclass(accountUpdate, 'delegate', identity),
        },
        verificationKey: updateSubclass(accountUpdate, 'verificationKey', identity),
        permissions: updateSubclass(accountUpdate, 'permissions', identity),
        zkappUri: updateSubclass(accountUpdate, 'zkappUri', ZkappUri.fromJSON),
        tokenSymbol: updateSubclass(accountUpdate, 'tokenSymbol', TokenSymbol.from),
        timing: updateSubclass(accountUpdate, 'timing', identity),
        votingFor: updateSubclass(accountUpdate, 'votingFor', identity),
    };
    return {
        ...preconditionClass(layout, 'account', accountUpdate, context),
        ...update,
    };
}
function updateSubclass(accountUpdate, key, transform) {
    return {
        set(value) {
            accountUpdate.body.update[key].isSome = Bool(true);
            accountUpdate.body.update[key].value = transform(value);
        },
    };
}
function CurrentSlot(accountUpdate) {
    let context = getPreconditionContextExn(accountUpdate);
    return {
        requireBetween(lower, upper) {
            context.constrained.add('validWhile');
            let property = accountUpdate.body.preconditions.validWhile;
            ensureConsistentPrecondition(property, Bool(true), { lower, upper }, 'validWhile');
            property.isSome = Bool(true);
            property.value.lower = lower;
            property.value.upper = upper;
        },
    };
}
let unimplementedPreconditions = [
    // unimplemented because its not checked in the protocol
    'network.stakingEpochData.seed',
    'network.nextEpochData.seed',
];
let baseMap = { UInt64, UInt32, Field, Bool, PublicKey, ActionState };
function getProvableType(layout) {
    let typeName = layout.checkedTypeName ?? layout.type;
    let type = baseMap[typeName];
    assertInternal(type !== undefined, `Unknown precondition base type ${typeName}`);
    return type;
}
function preconditionClass(layout, baseKey, accountUpdate, context) {
    if (layout.type === 'option') {
        // range condition
        if (layout.optionType === 'closedInterval') {
            let baseType = getProvableType(layout.inner.entries.lower);
            return preconditionSubClassWithRange(accountUpdate, baseKey, baseType, context);
        }
        // value condition
        else if (layout.optionType === 'flaggedOption') {
            let baseType = getProvableType(layout.inner);
            return preconditionSubclass(accountUpdate, baseKey, baseType, context);
        }
    }
    else if (layout.type === 'array') {
        return {}; // not applicable yet, TODO if we implement state
    }
    else if (layout.type === 'object') {
        // for each field, create a recursive object
        return Object.fromEntries(layout.keys.map((key) => {
            let value = layout.entries[key];
            return [key, preconditionClass(value, `${baseKey}.${key}`, accountUpdate, context)];
        }));
    }
    else
        throw Error('bug');
}
function preconditionSubClassWithRange(accountUpdate, longKey, fieldType, context) {
    return {
        ...preconditionSubclass(accountUpdate, longKey, fieldType, context),
        requireBetween(lower, upper) {
            context.constrained.add(longKey);
            let property = getPath(accountUpdate.body.preconditions, longKey);
            let newValue = { lower, upper };
            ensureConsistentPrecondition(property, Bool(true), newValue, longKey);
            property.isSome = Bool(true);
            property.value = newValue;
        },
    };
}
function defaultLower(fieldType) {
    assertInternal(fieldType === UInt32 || fieldType === UInt64);
    return fieldType.zero;
}
function defaultUpper(fieldType) {
    assertInternal(fieldType === UInt32 || fieldType === UInt64);
    return fieldType.MAXINT();
}
function preconditionSubclass(accountUpdate, longKey, fieldType, context) {
    if (fieldType === undefined) {
        throw Error(`this.${longKey}: fieldType undefined`);
    }
    let obj = {
        get() {
            if (unimplementedPreconditions.includes(longKey)) {
                let self = context.isSelf ? 'this' : 'accountUpdate';
                throw Error(`${self}.${longKey}.get() is not implemented yet.`);
            }
            let { read, vars } = context;
            read.add(longKey);
            return (vars[longKey] ?? (vars[longKey] = getVariable(accountUpdate, longKey, fieldType)));
        },
        getAndRequireEquals() {
            let value = obj.get();
            obj.requireEquals(value);
            return value;
        },
        requireEquals(value) {
            context.constrained.add(longKey);
            let property = getPath(accountUpdate.body.preconditions, longKey);
            if ('isSome' in property) {
                let isInterval = 'lower' in property.value && 'upper' in property.value;
                let newValue = isInterval ? { lower: value, upper: value } : value;
                ensureConsistentPrecondition(property, Bool(true), newValue, longKey);
                property.isSome = Bool(true);
                property.value = newValue;
            }
            else {
                setPath(accountUpdate.body.preconditions, longKey, value);
            }
        },
        requireEqualsIf(condition, value) {
            context.constrained.add(longKey);
            let property = getPath(accountUpdate.body.preconditions, longKey);
            assertInternal('isSome' in property);
            if ('lower' in property.value && 'upper' in property.value) {
                let lower = Provable.if(condition, fieldType, value, defaultLower(fieldType));
                let upper = Provable.if(condition, fieldType, value, defaultUpper(fieldType));
                ensureConsistentPrecondition(property, condition, { lower, upper }, longKey);
                property.isSome = condition;
                property.value.lower = lower;
                property.value.upper = upper;
            }
            else {
                let newValue = Provable.if(condition, fieldType, value, fieldType.empty());
                ensureConsistentPrecondition(property, condition, newValue, longKey);
                property.isSome = condition;
                property.value = newValue;
            }
        },
        requireNothing() {
            let property = getPath(accountUpdate.body.preconditions, longKey);
            if ('isSome' in property) {
                property.isSome = Bool(false);
                if ('lower' in property.value && 'upper' in property.value) {
                    property.value.lower = defaultLower(fieldType);
                    property.value.upper = defaultUpper(fieldType);
                }
                else {
                    property.value = fieldType.empty();
                }
            }
            context.constrained.add(longKey);
        },
    };
    return obj;
}
function getVariable(accountUpdate, longKey, fieldType) {
    return Provable.witness(fieldType, () => {
        let [accountOrNetwork, ...rest] = longKey.split('.');
        let key = rest.join('.');
        let value;
        if (accountOrNetwork === 'account') {
            let account = getAccountPreconditions(accountUpdate.body);
            value = account[key];
        }
        else if (accountOrNetwork === 'network') {
            let networkState = Mina.getNetworkState();
            value = getPath(networkState, key);
        }
        else if (accountOrNetwork === 'validWhile') {
            let networkState = Mina.getNetworkState();
            value = networkState.globalSlotSinceGenesis;
        }
        else {
            throw Error('impossible');
        }
        return value;
    });
}
function globalSlotToTimestamp(slot) {
    let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
    return UInt64.from(slot).mul(slotTime).add(genesisTimestamp);
}
function timestampToGlobalSlot(timestamp, message) {
    let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
    let { quotient: slot, rest } = timestamp.sub(genesisTimestamp).divMod(slotTime);
    rest.value.assertEquals(Field(0), message);
    return slot.toUInt32();
}
function timestampToGlobalSlotRange(tsLower, tsUpper) {
    // we need `slotLower <= current slot <= slotUpper` to imply `tsLower <= current timestamp <= tsUpper`
    // so we have to make the range smaller -- round up `tsLower` and round down `tsUpper`
    // also, we should clamp to the UInt32 max range [0, 2**32-1]
    let { genesisTimestamp, slotTime } = Mina.getNetworkConstants();
    let tsLowerInt = Int64.from(tsLower).sub(genesisTimestamp).add(slotTime).sub(1);
    let lowerCapped = Provable.if(tsLowerInt.isPositive(), UInt64, tsLowerInt.magnitude, UInt64.from(0));
    let slotLower = lowerCapped.div(slotTime).toUInt32Clamped();
    // unsafe `sub` means the error in case tsUpper underflows slot 0 is ugly, but should not be relevant in practice
    let slotUpper = tsUpper.sub(genesisTimestamp).div(slotTime).toUInt32Clamped();
    return [slotLower, slotUpper];
}
function getAccountPreconditions(body) {
    let { publicKey, tokenId } = body;
    let hasAccount = Mina.hasAccount(publicKey, tokenId);
    if (!hasAccount) {
        return {
            balance: UInt64.zero,
            nonce: UInt32.zero,
            receiptChainHash: emptyReceiptChainHash(),
            actionState: Actions.emptyActionState(),
            delegate: publicKey,
            provedState: Bool(false),
            isNew: Bool(true),
        };
    }
    let account = Mina.getAccount(publicKey, tokenId);
    return {
        balance: account.balance,
        nonce: account.nonce,
        receiptChainHash: account.receiptChainHash,
        actionState: account.zkapp?.actionState?.[0] ?? Actions.emptyActionState(),
        delegate: account.delegate ?? account.publicKey,
        provedState: account.zkapp?.provedState ?? Bool(false),
        isNew: Bool(false),
    };
}
function initializePreconditions(accountUpdate, isSelf) {
    preconditionContexts.set(accountUpdate, {
        read: new Set(),
        constrained: new Set(),
        vars: {},
        isSelf,
    });
}
function cleanPreconditionsCache(accountUpdate) {
    let context = preconditionContexts.get(accountUpdate);
    if (context !== undefined)
        context.vars = {};
}
function assertPreconditionInvariants(accountUpdate) {
    let context = getPreconditionContextExn(accountUpdate);
    let self = context.isSelf ? 'this' : 'accountUpdate';
    let dummyPreconditions = Preconditions.ignoreAll();
    for (let preconditionPath of context.read) {
        // check if every precondition that was read was also constrained
        if (context.constrained.has(preconditionPath))
            continue;
        // check if the precondition was modified manually, which is also a valid way of avoiding an error
        let precondition = getPath(accountUpdate.body.preconditions, preconditionPath);
        let dummy = getPath(dummyPreconditions, preconditionPath);
        if (!circuitValueEquals(precondition, dummy))
            continue;
        // we accessed a precondition field but not constrained it explicitly - throw an error
        let hasRequireBetween = isRangeCondition(precondition);
        let shortPath = preconditionPath.split('.').pop();
        let errorMessage = `You used \`${self}.${preconditionPath}.get()\` without adding a precondition that links it to the actual ${shortPath}.
Consider adding this line to your code:
${self}.${preconditionPath}.requireEquals(${self}.${preconditionPath}.get());${hasRequireBetween
            ? `
You can also add more flexible preconditions with \`${self}.${preconditionPath}.requireBetween(...)\`.`
            : ''}`;
        throw Error(errorMessage);
    }
}
function getPreconditionContextExn(accountUpdate) {
    let c = preconditionContexts.get(accountUpdate);
    if (c === undefined)
        throw Error('bug: precondition context not found');
    return c;
}
/**
 * Asserts that a precondition is not already set or that it matches the new values.
 *
 * This function checks if a precondition is already set for a given property and compares it
 * with new values. If the precondition is not set, it allows the new values. If it's already set,
 * it ensures consistency with the existing precondition.
 *
 * @param property - The property object containing the precondition information.
 * @param newIsSome - A boolean or CircuitValue indicating whether the new precondition should exist.
 * @param value - The new value for the precondition. Can be a simple value or an object with 'lower' and 'upper' properties for range preconditions.
 * @param name - The name of the precondition for error messages.
 *
 * @throws {Error} Throws an error with a detailed message if attempting to set an inconsistent precondition.
 * @todo It would be nice to have the input parameter types more specific, but it's hard to do with the current implementation.
 */
function ensureConsistentPrecondition(property, newIsSome, value, name) {
    if (!property.isSome.isConstant() || property.isSome.toBoolean()) {
        let errorMessage = `
Precondition Error: Precondition Error: Attempting to set a precondition that is already set for '${name}'.
'${name}' represents the field or value you're trying to set a precondition for.
Preconditions must be set only once to avoid overwriting previous assertions. 
For example, do not use 'requireBetween()' or 'requireEquals()' multiple times on the same field.

Recommendation:
Ensure that preconditions for '${name}' are set in a single place and are not overwritten. If you need to update a precondition,
consider refactoring your code to consolidate all assertions for '${name}' before setting the precondition.

Example of Correct Usage:
// Incorrect Usage:
timestamp.requireBetween(newUInt32(0n), newUInt32(2n));
timestamp.requireBetween(newUInt32(1n), newUInt32(3n));

// Correct Usage:
timestamp.requireBetween(new UInt32(1n), new UInt32(2n));
`;
        property.isSome.assertEquals(newIsSome, errorMessage);
        if ('lower' in property.value && 'upper' in property.value) {
            property.value.lower.assertEquals(value.lower, errorMessage);
            property.value.upper.assertEquals(value.lower, errorMessage);
        }
        else {
            property.value.assertEquals(value, errorMessage);
        }
    }
}
const preconditionContexts = new WeakMap();
function isRangeCondition(condition) {
    return 'isSome' in condition && 'lower' in condition.value;
}
// helper. getPath({a: {b: 'x'}}, 'a.b') === 'x'
// TODO: would be awesome to type this
function getPath(obj, path) {
    let pathArray = path.split('.').reverse();
    while (pathArray.length > 0) {
        let key = pathArray.pop();
        obj = obj[key];
    }
    return obj;
}
function setPath(obj, path, value) {
    let pathArray = path.split('.');
    let key = pathArray.pop();
    getPath(obj, pathArray.join('.'))[key] = value;
}
