import {
  AccountUpdate,
  addCachedAccount,
  Bool,
  fetchAccount,
  Field,
  isReady,
  Mina,
  PrivateKey,
  PublicKey,
  Reducer,
  shutdown,
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
await isReady;

const Berkeley = Mina.Network({
  mina: 'https://proxy.berkeley.minaexplorer.com/graphql',
  archive: 'https://archive.berkeley.minaexplorer.com/',
});
Mina.setActiveInstance(Berkeley);

let feePayerKey = PrivateKey.fromBase58(
  'EKDyCXhknP36aznsLXL1R2C4tZnpd1jB8XZDo2MNiph6adTiKcA9'
);
let feePayerAddress = feePayerKey.toPublicKey();
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
  /*   voterKey: PrivateKey.fromBase58(
    'EKEtaYw2bhVZo3LsKCmHRyXboDVnnNS1ugtDTjtGD9fStmNWHcbn'
  ),
  candidateKey: PrivateKey.fromBase58(
    'EKDmEuckbfpJjcQqKBnCjwjY3FKvSFG1MqtjBZWQWRTtMsi8N6Zi'
  ),
  votingKey: PrivateKey.fromBase58(
    'EKEoGQ2c3TUUECy5kzyZGxDYeCugc4chATBmPmFhDgW7ZvkuyV4D'
  ), */
  voterKey: PrivateKey.random(),
  candidateKey: PrivateKey.random(),
  votingKey: PrivateKey.random(),
  doProofs: false,
};

const members = [
  {
    privateKey: PrivateKey.fromBase58(
      'EKErBVQQQTtpAV2byz8M3vnemjYM46PN31NYGHE1RuiS2qSCFjaH'
    ),
    publicKey: PublicKey.fromBase58(
      'B62qqzhd5U54JafhR4CB8NLWQM8PRfiCZ4TuoTT5UQHzGwdR2f5RLnK'
    ),
  },
  {
    privateKey: PrivateKey.fromBase58(
      'EKFVSYMz5QTptLGtMi5xQLxFgMiD3RBC2kHi1vp6233awxzzVSTY'
    ),
    publicKey: PublicKey.fromBase58(
      'B62qnScMYfgSUWwtzB1r6fB8i23YFXgA25rzcSXVCtYVfUxLHkMLr3G'
    ),
  },
  {
    privateKey: PrivateKey.fromBase58(
      'EKFchpmPzRp713h3k3WmQo9pRctw9Jbwe9jsw5cpU45FNM4cXpmS'
    ),
    publicKey: PublicKey.fromBase58(
      'B62qmGxWmoFJpsy3FJbHhYQr4YATVSwAcsMAa2e3MiSVTatig6jZHYo'
    ),
  },
  {
    privateKey: PrivateKey.fromBase58(
      'EKECsQiRVnpUBFi3UbiNKWk8HW7xDogXP5o9MzYFgoiGVbjxYuRY'
    ),
    publicKey: PublicKey.fromBase58(
      'B62qjsBtcM8FHN54ycLAVQgJwAx88eobdEHDbuSWoKjbo1WKSmLxUce'
    ),
  },
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
let id = await tx.sign([feePayerKey]).send();
console.log(id.hash());
await id.wait();

console.log('successfully deployed contracts');

console.log('Fetching updated accounts..');
await fetchAllAccounts();

console.log('registering one voter');

let m = Member.empty();
tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Registering a voter',
  },
  () => {
    m = registerMember(
      0n,
      Member.from(members[0].publicKey, UInt64.from(150)),
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

m = Member.empty();
tx = await Mina.transaction(
  {
    sender: feePayerAddress,
    fee: 10_000_000,
    memo: 'Registering a candidate',
  },
  () => {
    m = registerMember(
      0n,
      Member.from(members[1].publicKey, UInt64.from(150)),
      storage.candidatesStore
    );
    contracts.voting.candidateRegistration(m);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();

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

console.log('voting for a candidate');

tx = await Mina.transaction(
  { sender: feePayerAddress, fee: 10_000_000, memo: 'Approving registrations' },
  () => {
    let c = storage.candidatesStore.get(0n)!;
    c.witness = new MyMerkleWitness(storage.candidatesStore.getWitness(0n));
    c.votesWitness = new MyMerkleWitness(storage.votesStore.getWitness(0n));

    contracts.voting.vote(c, storage.votersStore.get(0n)!);
  }
);
await tx.prove();
await (await tx.sign([feePayerKey]).send()).wait();
console.log('voted for a candidate');

async function fetchAllAccounts() {
  await Promise.all(
    [
      /*       feePayerAddress,
      params.voterKey.toPublicKey(),
      params.candidateKey.toPublicKey(),
      params.votingKey.toPublicKey(), */
      ...members.map((m) => m.publicKey),
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
  return m;
}

async function fundAccounts(n: number) {
  let accounts: { privateKey: PrivateKey; publicKey: PublicKey }[] = [];

  await Promise.all(
    Array(n).map(() => {
      let privateKey = PrivateKey.random();
      let publicKey = privateKey.toPublicKey();
      accounts.push({
        privateKey,
        publicKey,
      });
      return Mina.faucet(publicKey);
    })
  );

  return accounts;
}

shutdown();
