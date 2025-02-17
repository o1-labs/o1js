import {
  AccountUpdate,
  Bool,
  fetchAccount,
  Mina,
  PrivateKey,
  PublicKey,
  Reducer,
  SmartContract,
  UInt32,
  UInt64,
} from 'o1js';
import { VotingApp, VotingAppParams } from './factory.js';
import { Member, MyMerkleWitness } from './member.js';
import { OffchainStorage } from './off-chain-storage.js';
import { ParticipantPreconditions, ElectionPreconditions } from './preconditions.js';
import { getResults, vote } from './voting-lib.js';

const Berkeley = Mina.Network({
  mina: 'https://api.minascan.io/node/devnet/v1/graphql',
  archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
});
Mina.setActiveInstance(Berkeley);

let feePayerKey = PrivateKey.random();
let feePayerAddress = feePayerKey.toPublicKey();

let voterKey = PrivateKey.random();
let candidateKey = PrivateKey.random();
let votingKey = PrivateKey.random();

console.log('waiting for accounts to receive funds...');
await Mina.faucet(feePayerAddress);
console.log('funds received');

console.log(`using the following addressed:
feePayer: ${feePayerAddress.toBase58()}
voting manager contract: ${votingKey.toPublicKey().toBase58()}
candidate membership contract: ${candidateKey.toPublicKey().toBase58()}
voter membership contract: ${voterKey.toPublicKey().toBase58()}`);

let params: VotingAppParams = {
  candidatePreconditions: new ParticipantPreconditions(
    UInt64.from(0),
    UInt64.from(100_000_000_000)
  ),
  voterPreconditions: new ParticipantPreconditions(UInt64.from(0), UInt64.from(100_000_000_000)),
  electionPreconditions: new ElectionPreconditions(UInt32.from(0), UInt32.MAXINT(), Bool(false)),
  voterKey,
  candidateKey,
  votingKey,
  doProofs: false,
};

// we are using pre-funded voters here
const members = [
  PublicKey.fromBase58('B62qqzhd5U54JafhR4CB8NLWQM8PRfiCZ4TuoTT5UQHzGwdR2f5RLnK'),
  PublicKey.fromBase58('B62qnScMYfgSUWwtzB1r6fB8i23YFXgA25rzcSXVCtYVfUxLHkMLr3G'),
];

let storage = {
  votesStore: new OffchainStorage<Member>(3),
  candidatesStore: new OffchainStorage<Member>(3),
  votersStore: new OffchainStorage<Member>(3),
};

console.log('building contracts');
let contracts = await VotingApp(params);

console.log('deploying set of 3 contracts');
let tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Deploying contracts',
  },
  async () => {
    AccountUpdate.fundNewAccount(feePayerAddress, 3);

    await contracts.voting.deploy();
    contracts.voting.committedVotes.set(storage.votesStore.getRoot());
    contracts.voting.accumulatedVotes.set(Reducer.initialActionState);

    await contracts.candidateContract.deploy();
    contracts.candidateContract.committedMembers.set(storage.candidatesStore.getRoot());
    contracts.candidateContract.accumulatedMembers.set(Reducer.initialActionState);

    await contracts.voterContract.deploy();
    contracts.voterContract.committedMembers.set(storage.votersStore.getRoot());
    contracts.voterContract.accumulatedMembers.set(Reducer.initialActionState);
  }
);
await tx.prove();
await (
  await tx.sign([feePayerKey, params.votingKey, params.candidateKey, params.voterKey]).send()
).wait();

console.log('successfully deployed contracts');

await fetchAllAccounts();

console.log('registering one voter');
tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Registering a voter',
  },
  async () => {
    let m = registerMember(0n, Member.from(members[0], UInt64.from(150)), storage.votersStore);
    await contracts.voting.voterRegistration(m);
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
  async () => {
    let m = registerMember(0n, Member.from(members[1], UInt64.from(150)), storage.candidatesStore);
    await contracts.voting.candidateRegistration(m);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('candidate registered');
// we have to wait a few seconds before continuing, otherwise we might not get the actions from the archive, we if continue too fast
await new Promise((resolve) => setTimeout(resolve, 20000));

await fetchAllAccounts();

console.log('approving registrations');
tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Approving registrations',
  },
  async () => {
    await contracts.voting.approveRegistrations();
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('registrations approved');

await fetchAllAccounts();

console.log('voting for a candidate');
tx = await Mina.transaction(
  { sender: feePayerAddress, fee: 10_000_000, memo: 'Casting vote' },
  async () => {
    let currentCandidate = storage.candidatesStore.get(0n)!;

    currentCandidate.witness = new MyMerkleWitness(storage.candidatesStore.getWitness(0n));
    currentCandidate.votesWitness = new MyMerkleWitness(storage.votesStore.getWitness(0n));

    let v = storage.votersStore.get(0n)!;
    v.witness = new MyMerkleWitness(storage.votersStore.getWitness(0n));
    console.log(v.witness.calculateRoot(v.getHash()).toString());
    console.log(contracts.voting.committedVotes.get().toString());
    await contracts.voting.vote(currentCandidate, v);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
vote(0n, storage.votesStore, storage.candidatesStore);
console.log('voted for a candidate');
await new Promise((resolve) => setTimeout(resolve, 20000));

await fetchAllAccounts();

console.log('counting votes');
tx = await Mina.transaction(
  { sender: feePayerAddress, fee: 10_000_000, memo: 'Counting votes' },
  async () => {
    await contracts.voting.countVotes();
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('votes counted');
await new Promise((resolve) => setTimeout(resolve, 20000));

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

function registerMember(i: bigint, m: Member, store: OffchainStorage<Member>): Member {
  // we will also have to keep track of new voters and candidates within our off-chain merkle tree
  store.set(i, m); // setting voter 0n
  // setting the merkle witness
  m.witness = new MyMerkleWitness(store.getWitness(i));
  return m;
}
