import { fetchAccount, isReady, setGraphqlEndpoint, shutdown } from 'snarkyjs';

await isReady;

setGraphqlEndpoint('https://proxy.berkeley.minaexplorer.com/graphql');
let { account } = await fetchAccount(
  'B62qmQDtbNTymWXdZAcp4JHjfhmWmuqHjwc6BamUEvD8KhFpMui2K1Z'
);
console.dir(account, { depth: 20 });
await shutdown();
