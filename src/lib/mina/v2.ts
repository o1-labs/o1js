// import { Types } from  '../../bindings/mina-transaction/types.js';
import { Provable, ProvablePure } from '../provable/types/provable-intf.js';
import { UInt32, UInt64, Int64 } from '../provable/int.js';
// import { Poseidon } from '../provable/crypto/poseidon.js';
import { PublicKey } from '../provable/crypto/signature.js';
import { Bool, Field } from '../provable/wrapped.js';
import { PrivateInput, Tuple, TupleToInstances, VerificationKey, ZkProgram } from '../proof-system/zkprogram.js';

// TODO: consider struct support (FlexibleProvablePure)

// TODO: ZkContract

// TODO: Expirmental.{ZkPromise, HistoricalPreconditions}

// temprorary rename
export const ZkCircuit = ZkProgram;

export type ProvableInstance<P> = P extends Provable<infer T> ? T : never;

const MAX_ZKAPP_STATE_FIELDS = 8;

// TODO: make a nice class abstraction from this that can fill in default values for T (when Keep is selected)
type SetOrKeep<T> = { isSome: Bool, value: T };

export class Range<T> {
	readonly lower: T;
	readonly upper: T;

	constructor(lower: T, upper: T) {
		this.lower = lower;
		this.upper = upper;
	}

	static scalar<T>(value: T): Range<T> {
		return new Range(value, value);
	}
}

export type ZkProcessorStateSpec = {
	[name in string]: ProvablePure<any>
};

export type ZkProcessorState<State extends ZkProcessorStateSpec> = {
	[name in keyof State]: State[name] extends ProvablePure<infer T> ? T : never
};

export type ZkProcessorStateView<State extends ZkProcessorStateSpec> = {
	[name in keyof State]?: State[name] extends ProvablePure<infer T> ? T : never
};

/* lord forgive for my sins */
// TODO: constructors, any container, etc...
export function ZkEnum
	<Types extends {[Enum in string]: {[name in string]: Provable<any>}}>
	(_spec: {[Enum in keyof Types]: {[name in keyof Types[Enum]]: Types[Enum][name]}}):
	{
		[Enum in keyof Types]: Provable<{
			tag: Field,
			body: {[name in keyof Types[Enum]]: Types[Enum][name] extends Provable<infer T> ? T : never}
		}>
	}
{
	throw new Error('unimplemented');
}

// function renderZkProcessorState<State extends ZkProcessorStateSpec>(stateSpec: State): SetOrKeep<Field>[] {
// }

// export interface ZkProcessorStateIntf<State extends ZkProcessorStateSpec> {
// 	render(state: ZkProcessorStateView<State>): SetOrKeep<Field>[];
// };
// 
// // TODO: state packing
// export function ZkProcessorState<State extends ZkProcessorStateSpec>(stateSpec: State): ZkProcessorStateIntf<State> {
// 	const stateKeys = Object.keys(stateSpec);
// 	stateKeys.sort((a, b) => a > b ? -1 : 1);
// 
// 	const totalSizeInFields = stateKeys.reduce((sizeSum, stateKey) => {
// 		const type = stateSpec[stateKey];
// 		return sizeSum + type.sizeInFields();
// 	}, 0);
// 
// 	if(totalSizeInFields > MAX_ZKAPP_STATE_FIELDS) {
// 		throw new Error(`defined ZkProcessorState is too large to fit into a single Mina account (current limit is ${MAX_ZKAPP_STATE_FIELDS}, this definition requires ${totalSizeInFields})`);
// 	}
// 
// 	return {
// 		render(state: ZkProcessorStateView<State>): SetOrKeep<Field>[] {
// 			const renderedState: SetOrKeep<Field>[] = [];
// 
// 			stateKeys.forEach((stateKey) => {
// 				// WRONG WRONG WRONG -- we only want to set states that are defined, but they won't all be defined here, and then we need an index map
// 				const type = stateSpec[stateKey];
// 				type.toFields(state[stateKey]).forEach((field) => renderedState.push({ isSome: new Bool(true), value: field }));
// 			});
// 
// 			// always set the remaining states (instead of keeping them) so that isProven works
// 			for(let i = 0; i < MAX_ZKAPP_STATE_FIELDS - totalSizeInFields; i++) {
// 				renderedState.push({ isSome: new Bool(true), value: new Field(0) });
// 			}
// 
// 			if(renderedState.length != MAX_ZKAPP_STATE_FIELDS) {
// 				throw new Error('INTERNAL ERROR: malformed zkapp state while rendering');
// 			}
// 
// 			return renderedState;
// 		}
// 	}
// }

// TODO: constructors from Mina and NanoMina
export type MinaAmount = UInt64;

export type EpochDataPreconditions = {
	ledger?: {
		hash?: Field,
		totalCurrency?: MinaAmount | Range<MinaAmount>,
	},
	seed?: Field,
	startCheckpoint?: Field,
	lockCheckpoint?: Field,
	epochLength?: UInt32 | Range<UInt32>
};

export type Preconditions<StateRepr> = {
	network?: {
		snarkedLedgerHash?: Field,
		blockchainLength?: UInt32 | Range<UInt32>,
		minWindowDensity?: UInt32 | Range<UInt32>,
		totalCurrency?: MinaAmount | Range<MinaAmount>,
		globalSlotSinceGenesis?: UInt32 | Range<UInt32>,
		stakingEpochData?: EpochDataPreconditions,
		nextEpochData?: EpochDataPreconditions,
	},
	account?: {
		balance?: MinaAmount | Range<MinaAmount>,
		nonce?: UInt32 | Range<UInt32>,
		receiptChainHash?: Field,
		delegate?: PublicKey,
		state?: StateRepr,
		actionState?: Field,
		isProven?: Bool,
		isNew?: Bool
	},
	validWhile?: UInt32 | Range<UInt32>
};

// TODO: authorization
export type ContextFreeUpdateRepr<StateRepr> = {
	preconditions?: Preconditions<StateRepr>,
	balanceChange?: Int64,
	incrementNonce?: Bool,
	callData?: Field,
	callDepth?: number,
	useFullCommitment?: Bool,
	implicitAccountCreationFee?: Bool,
	mayUseToken?: {
		parentsOwnToken: Bool,
		inheritFromParent: Bool
	},
	pushEvents?: Field[][],
	pushActions?: Field[][],
	setState?: StateRepr,
	setPermissions?: Permissions,
	setDelegate?: PublicKey,
	setVerificationKey?: VerificationKey,
	setZkappUri?: string,
	setTokenSymbol?: Field,
};

export type AccountUpdateRepr<StateRepr> = ContextFreeUpdateRepr<StateRepr> & {
	publicKey: PublicKey;
	tokenId: Field; /* TODO: TokenId */
};

export type ContextFreeUpdate<State extends ZkProcessorStateSpec> = ContextFreeUpdateRepr<ZkProcessorStateView<State>>;
// export type AccountUpdate<State extends ZkProcessorStateSpec> = AccountUpdateRepr<ZkProcessorStateView<State>>;
export type RenderedAccountUpdate = AccountUpdateRepr<SetOrKeep<Field>[]>;

export interface ZkProcessorEnv<State extends ZkProcessorStateSpec> {
	readonly publicKey: PublicKey;
	readonly tokenId: Field; /* TODO: TokenId */
	readonly state: ZkProcessorState<State>;

	call(f: () => Promise<RenderedAccountUpdate>): Promise<undefined>;
}

export type ZkProcessorMethod<State extends ZkProcessorStateSpec, PrivateInputs extends Tuple<PrivateInput>> = (env: ZkProcessorEnv<State>, ...privateInputs: TupleToInstances<PrivateInputs>) => Promise<ContextFreeUpdate<State>>;

export type MethodInputs = { [method: string]: Tuple<PrivateInput> };

export type ZkProcessorDescription<State extends ZkProcessorStateSpec, Inputs extends MethodInputs> = {
	name: string,
	autoFillCallData?: boolean,
	State: State,
	methods: {
		[method in keyof Inputs]: {
			privateInputs: Inputs[method],
			method: ZkProcessorMethod<State, Inputs[method]>
		}
	}
};

export type ZkProcessor<State extends ZkProcessorStateSpec, Inputs extends MethodInputs> = {
	[method in keyof Inputs]: ZkProcessorMethod<State, Inputs[method]>;
};

export function ZkProcessor<State extends ZkProcessorStateSpec, Inputs extends MethodInputs>(_descr: ZkProcessorDescription<State, Inputs>): ZkProcessor<State, Inputs> {
	// this code translates into a call to ZkCircuit
	throw new Error('unimplemented');
}
