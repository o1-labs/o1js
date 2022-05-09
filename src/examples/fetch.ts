import { fetchAccount, isReady, setGraphqlEndpoint, shutdown } from 'snarkyjs';

await isReady;
setGraphqlEndpoint('https://proxy.berkeley.minaexplorer.com/graphql');

let zkappAddress = 'B62qpRzFVjd56FiHnNfxokVbcHMQLT119My1FEdSq8ss7KomLiSZcan';
let { account, error } = await fetchAccount(zkappAddress);
console.log('account', JSON.stringify(account, null, 2));
console.log('error', error);

await shutdown();
