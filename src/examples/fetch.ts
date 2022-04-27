import { getAccount, isReady, shutdown } from 'snarkyjs';

await isReady;

let { account } = await getAccount(
  'B62qmQDtbNTymWXdZAcp4JHjfhmWmuqHjwc6BamUEvD8KhFpMui2K1Z',
  'https://proxy.berkeley.minaexplorer.com/graphql'
);
console.dir(account, { depth: 20 });
await shutdown();
