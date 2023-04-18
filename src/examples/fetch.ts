import {
  fetchAccount,
  isReady,
  setGraphqlEndpoint,
  shutdown,
  fetchLastBlock,
  PublicKey,
  Types,
} from 'snarkyjs';

await isReady;
setGraphqlEndpoint('https://proxy.berkeley.minaexplorer.com/graphql');

let zkappAddress = PublicKey.fromBase58(
  'B62qpRzFVjd56FiHnNfxokVbcHMQLT119My1FEdSq8ss7KomLiSZcan'
);
let { account, error } = await fetchAccount({
  publicKey: zkappAddress,
});
console.log('account', Types.Account.toJSON(account!));
console.log('error', error);

let block = await fetchLastBlock();
console.log('last block', JSON.stringify(block, null, 2));

await shutdown();
