import { Circuit, AsFieldElements } from '../snarky';
import { PublicKey } from './signature';
import * as Mina from './mina';
import { Account } from './fetch';
import * as GlobalContext from './global-context';

function getAccountFieldExn<K extends keyof Account>(
  address: PublicKey,
  key: K,
  fieldType: AsFieldElements<Account[K]>
): Account[K] {
  let inProver = GlobalContext.inProver();
  if (!GlobalContext.inCompile()) {
    let account = Mina.getAccount(address);
    let field = account[key];
    // in prover, create a new witness with the state values
    // outside, just return the state values
    return inProver ? Circuit.witness(fieldType, () => field) : field;
  } else {
    // in compile, we don't need the witness values
    return Circuit.witness(fieldType, (): Account[K] => {
      throw Error('Accessed witness in compile - this is a bug.');
    });
  }
}
