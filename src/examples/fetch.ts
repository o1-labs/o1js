import { fetchAccount, setGraphqlEndpoints, fetchLastBlock, PublicKey, Types } from 'o1js';

setGraphqlEndpoints([
  'https://proxy.devnet.minaexplorer.com/graphql',
  'https://api.minascan.io/node/devnet/v1/graphql',
]);

let zkappAddress = PublicKey.fromBase58('B62qpRzFVjd56FiHnNfxokVbcHMQLT119My1FEdSq8ss7KomLiSZcan');
let { account, error } = await fetchAccount({
  publicKey: zkappAddress,
});
console.log('error', error);
console.log('account', Types.Account.toJSON(account!));

let block = await fetchLastBlock();
console.log('last block', JSON.stringify(block, null, 2));
