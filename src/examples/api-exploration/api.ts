import { Struct, Field, Poseidon, PrivateKey } from "o1js";

class MerkleList extends Struct({
	commit: Field
}) {}

class MerkleListNode extends Struct({
	tail: MerkleList,
	head: Field
}) {
	toList() {
		return new MerkleList(Poseidon.hash(this.toFields()));
	}

	identifier() {
		return this.toList().commit;
	}
}

// LAYER 1 (fka: ZkProgram)
const ZkList = ZkCircuit({
	publicOutput: MerkleList,

	methods: {
		push: {
			privateInputs: [ZkListProof, Field],
			async method(listProof: ZkListProof, element: Field) {
				listProof.verify();
				const list = listProof.publicOutput;
				return new MerkleListNode(list, element).toList();
			}
		}

		pop: {
			privateInputs: [ZkListProof, Field, MerkleList],
			async method(listProof: ZkListProof, head: Field, tail: MerkleList) {
				listProof.verify();
				const list = listProof.publicOutput;
				new MerkleListNode(tail, head).assertEquals(list);
				return tail;
			}
		}
	}
});

// LAYER 2
class MerkleListState extends ZkProcessorState({
	list: MerkleList
}) {}

const MinaList = ZkProcessor({
	state: MerkleListState,

	methods: {
		push: {
			privateInputs: [Field],
			async method(env: ZkProcessorEnv<MerkleListState>, element: Field) {
				const newList = new MerkleListNode(env.list, element).toList();

				// new AccountUpdate
				return new ZkProcessorStatement({
					preconditions: {
						state: {
							list: env.list
						}
					},
					setState: {
						list: newList
					}
				});
			}
		},

		pop: {
			privateInputs: [Field, MerkleList],
			async method(env: ZkProcessorEnv<MerkleListState>, head: Field, tail: MerkleList) {
				new MerkleListNode(tail, head).assertEquals(list);

				return new ZkProcessorStatement({
					preconditions: {
						state: {
							list: env.list
						}
					},
					setState: {
						list: tail
					}
				});
			}
		}
	}
});

// LAYER 3
class ListActions extends ZkContractActions({
	Push: [Field],
	Pop: [],
}) {}

class ListStorage extends MerkleStorage(MerkleListNode) {}

const ListApp = ZkContract({
	state: MerkleListState,

	actions: ListActions,

	components: {
		listStorage: ListStorage,
	},

	init: {
		privateInputs: [],
		async init(env: ZkProcessorEnv<MerkleListState>) {
			env.state.list.set(MerkleList.empty());
		}
	}

	// in requests, we can apply rules for when actions can be pushed
	// note that actions don't need to be 1-1 with requests (multiple requests could build actions in different ways)
	requests: {
		Push: {
			privateInputs: [PrivateKey, Field],
			async request(env: ZkRequestEnv, privateKey: PrivateKey, element: Field) {
				// example of what this would actually do is elided
				hasPermissionToPush(privateKey).assertTrue();

				return new ZkContractRequest({
					pushActions: [ListActions.Push(element)]
				});
			}
		},

		Pop: {
			privateInputs: [PrivateKey],
			async request(env: ZkRequestEnv, privateKey: PrivateKey) {
				// example of what this would actually do is elided
				hasPermissionToPop(privateKey).assertTrue();

				return new ZkContractRequest({
					pushActions: [ListActions.Pop()]
				});
			}
		}
	},

	actionHandlers: {
		Push: {
			privateInputs: [],
			// NOTE: ZkActionHandlerEnv and ZkActionHandlerStatement can probably just be ZkProcessorEnv and ZkProcessorStatment
			async handle(env: ZkActionHandlerEnv<MerkleListState>, action: ListActions.Push) {
				const list = env.state.list.get();
				const newListNode = new MerkleListNode(list, action.element);
				await env.components.listStorage.write(newListNode);
				env.state.list.set(newListNode.toList());
			}
		},

		Pop: {
			privateInputs: [],
			async handle(env: ZkActionHandlerEnv<MerkleListState>, action: ListActions.Pop) {
				const list = env.state.list.get();
				const listNode = await env.components.listStorage.read(list);
				env.state.list.set(listNode.tail);
			}
		}
	}

	// ALSO: can specify additional methods here outside of this regular lifecycle, which are just regular ZkProcessor methods
	// extraMethods: {
	//   ...
	// }
});

// now we can instantiated the list app with different components
const listAppPrivateKey = new PrivateKey();
const MyListApp = new ListApp({
	publicKey: myListAppPrivateKey.toPublicKey(),
	components: {
		listStorage: OffChainStorage
		// set to InMemoryStorage for tests, or SqliteStorage for local (unshared) persistence
	}
});

// interact with the list app
const userPrivateKey = new PrivateKey();
MyListApp.deploy();
MyListApp.requests.Push(userPrivateKey, new Field(1));
MyListApp.requests.Push(userPrivateKey, new Field(2));
MyListApp.requests.Push(userPrivateKey, new Field(3));
MyListApp.requests.Pop(userPrivateKey);

MyListApp.reduceActions({
	// here we parameterize the private inputs for each action reducer (in this case we have none)
	Push: (_action) => [],
	Pop: (_action) => []
});