import { Mina, Party } from 'dist/server';
import { VotingAppParams } from './factory';
import { Member } from './member';
import { Membership_ } from './membership';
import { OffchainStorage } from './off_chain_storage';
import { Voting_ } from './voting';

type Votes = OffchainStorage<Member>;
type Candidates = OffchainStorage<Member>;
type Voters = OffchainStorage<Member>;

/**
 * Function used to test a set of contracts and precondition
 * @param set A set of contracts
 * @param params A set of preconditions and parameters
 * @param storage A set of off-chain storage
 */
export async function testSet(
  set: {
    voterContract: Membership_;
    candidateContract: Membership_;
    voting: Voting_;
  },
  params: VotingAppParams,
  storage: {
    votesStore: Votes;
    candidatesStore: Candidates;
    votersStore: Voters;
  }
) {
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  let feePayer = Local.testAccounts[0].privateKey;
  let tx;

  console.log('deploying set of 3 contracts');
  tx = await Mina.transaction(feePayer, () => {
    Party.fundNewAccount(feePayer);
    set.voterContract.deploy({ zkappKey: params.voterKey });
    set.candidateContract.deploy({ zkappKey: params.candidateKey });
    set.voting.deploy({ zkappKey: params.votingKey });
  });
  tx.send();

  // TODO: do our testing here
  throw new Error('Not implemented');
}
