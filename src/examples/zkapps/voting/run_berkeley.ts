import {
  AccountUpdate,
  addCachedAccount,
  Bool,
  fetchAccount,
  fetchLastBlock,
  Field,
  isReady,
  Mina,
  PrivateKey,
  PublicKey,
  Reducer,
  shutdown,
  SmartContract,
  UInt32,
  UInt64,
} from 'snarkyjs';
import { Main } from 'src/examples/schnorr_sign.js';
import { VotingApp, VotingAppParams } from './factory.js';
import { Member, MyMerkleWitness } from './member.js';
import { OffchainStorage } from './off_chain_storage.js';
import {
  ParticipantPreconditions,
  ElectionPreconditions,
} from './preconditions.js';
import { getResults, vote } from './voting_lib.js';
await isReady;

const Berkeley = Mina.Network({
  mina: 'https://proxy.berkeley.minaexplorer.com/graphql',
  archive: 'https://archive-node-api.p42.xyz/',
});
Mina.setActiveInstance(Berkeley);

let feePayerKey = PrivateKey.fromBase58(
  'EKEaW7BFADc2C6NqemHGBqi2yK9C8qkSEudDs7x8BAnmw5mT4VWB'
);
let feePayerAddress = PublicKey.fromBase58(
  'B62qmHN4KwLyQwEhqmXA9BT9UpbKhDFXxRsjHHyaTnoFQnD2kAcExzd'
);
let params: VotingAppParams = {
  candidatePreconditions: new ParticipantPreconditions(
    UInt64.from(0),
    UInt64.from(100_000_000_000)
  ),
  voterPreconditions: new ParticipantPreconditions(
    UInt64.from(0),
    UInt64.from(100_000_000_000)
  ),
  electionPreconditions: new ElectionPreconditions(
    UInt32.from(0),
    UInt32.MAXINT(),
    Bool(false)
  ),
  voterKey: PrivateKey.random(),
  candidateKey: PrivateKey.random(),
  votingKey: PrivateKey.random(),
  doProofs: false,
};

const members = [
  PublicKey.fromBase58(
    'B62qqzhd5U54JafhR4CB8NLWQM8PRfiCZ4TuoTT5UQHzGwdR2f5RLnK'
  ),
  PublicKey.fromBase58(
    'B62qnScMYfgSUWwtzB1r6fB8i23YFXgA25rzcSXVCtYVfUxLHkMLr3G'
  ),
];

let storage = {
  votesStore: new OffchainStorage<Member>(3),
  candidatesStore: new OffchainStorage<Member>(3),
  votersStore: new OffchainStorage<Member>(3),
};

console.log('Building contracts');
let contracts = await VotingApp(params);

console.log('deploying set of 3 contracts');
let tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Deploying contracts',
  },
  () => {
    AccountUpdate.fundNewAccount(feePayerAddress, 3);

    contracts.voting.deploy({ zkappKey: params.votingKey });
    contracts.voting.committedVotes.set(storage.votesStore.getRoot());
    contracts.voting.accumulatedVotes.set(Reducer.initialActionsHash);

    contracts.candidateContract.deploy({ zkappKey: params.candidateKey });
    contracts.candidateContract.committedMembers.set(
      storage.candidatesStore.getRoot()
    );
    contracts.candidateContract.accumulatedMembers.set(
      Reducer.initialActionsHash
    );

    contracts.voterContract.deploy({ zkappKey: params.voterKey });
    contracts.voterContract.committedMembers.set(storage.votersStore.getRoot());
    contracts.voterContract.accumulatedMembers.set(Reducer.initialActionsHash);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();

console.log('successfully deployed contracts');

await fetchAllAccounts();

console.log('registering one voter');
tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Registering a voter',
  },
  () => {
    let m = registerMember(
      0n,
      Member.from(members[0], UInt64.from(150)),
      storage.votersStore
    );
    contracts.voting.voterRegistration(m);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('voter registered');

await fetchAllAccounts();

console.log('registering one candidate');
tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Registering a candidate',
  },
  () => {
    let m = registerMember(
      0n,
      Member.from(members[1], UInt64.from(150)),
      storage.candidatesStore
    );
    contracts.voting.candidateRegistration(m);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('candidate registered');

console.log('approving registrations');
tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Approving registrations',
  },
  () => {
    contracts.voting.approveRegistrations();
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('registrations approved');

await fetchAllAccounts();

console.log('voting for a candidate');
tx = await Mina.transaction(
  { sender: feePayerAddress, fee: 10_000_000, memo: 'Casting vote' },
  () => {
    let currentCandidate = storage.candidatesStore.get(0n)!;

    currentCandidate.witness = new MyMerkleWitness(
      storage.candidatesStore.getWitness(0n)
    );
    currentCandidate.votesWitness = new MyMerkleWitness(
      storage.votesStore.getWitness(0n)
    );

    let v = storage.votersStore.get(0n)!;

    v.witness = new MyMerkleWitness(storage.votersStore.getWitness(0n));

    contracts.voting.vote(currentCandidate, v);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
vote(0n, storage.votesStore, storage.candidatesStore);
console.log('voted for a candidate');

await fetchAllAccounts();

console.log('counting votes');
tx = await Mina.transaction(
  { sender: feePayerAddress, fee: 10_000_000, memo: 'Counting votes' },
  () => {
    contracts.voting.countVotes();
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('votes counted');

await fetchAllAccounts();
let results = getResults(contracts.voting, storage.votesStore);

if (results[members[1].toBase58()] !== 1) {
  throw Error(
    `Candidate ${members[1].toBase58()} should have one vote, but has ${
      results[members[1].toBase58()]
    } `
  );
}
console.log('final result', results);

console.log('The following events were emitted during the voting process:');

await displayEvents(contracts.voting);
await displayEvents(contracts.candidateContract);
await displayEvents(contracts.voterContract);

async function displayEvents(contract: SmartContract) {
  let events = await contract.fetchEvents();
  console.log(
    `events on ${contract.address.toBase58()}`,
    events.map((e) => {
      return { type: e.type, data: JSON.stringify(e.event) };
    })
  );
}

async function fetchAllAccounts() {
  await Promise.all(
    [
      feePayerAddress,
      params.voterKey.toPublicKey(),
      params.candidateKey.toPublicKey(),
      params.votingKey.toPublicKey(),
      ...members,
    ].map((publicKey) => fetchAccount({ publicKey }))
  );
}

function registerMember(
  i: bigint,
  m: Member,
  store: OffchainStorage<Member>
): Member {
  // we will also have to keep track of new voters and candidates within our off-chain merkle tree
  store.set(i, m); // setting voter 0n
  // setting the merkle witness
  m.witness = new MyMerkleWitness(store.getWitness(i));
  console.log('storeRoot', store.getRoot().toString());
  return m;
}

shutdown();
