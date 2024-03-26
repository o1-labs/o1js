import type { AccountUpdateLayout } from './account-update.js';
import type { PublicKey } from '../provable/crypto/signature.js';
import { Context } from '../util/global-context.js';

export { currentTransaction, CurrentTransaction, FetchMode };

type FetchMode = 'fetch' | 'cached' | 'test';
type CurrentTransaction = {
  sender?: PublicKey;
  layout: AccountUpdateLayout;
  fetchMode: FetchMode;
  isFinalRunOutsideCircuit: boolean;
  numberOfRuns: 0 | 1 | undefined;
};

let currentTransaction = Context.create<CurrentTransaction>();
