import { getAccount, isReady, shutdown } from 'snarkyjs';

await isReady;

let { account } = await getAccount(
  'B62qmQDtbNTymWXdZAcp4JHjfhmWmuqHjwc6BamUEvD8KhFpMui2K1Z'
);

if (account) {
  console.dir(account, { depth: 20 });
}
shutdown();
