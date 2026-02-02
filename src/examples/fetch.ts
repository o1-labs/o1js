import { PublicKey, Types, fetchAccount, fetchLastBlock, setGraphqlEndpoints } from 'o1js';

setGraphqlEndpoints(['https://plain-1-graphql.mina-mesa-network.gcp.o1test.net/graphql']);

let zkappAddress = PublicKey.fromBase58('B62qpfgnUm7zVqi8MJHNB2m37rtgMNDbFNhC2DpMmmVpQt8x6gKv9Ww');
let { account, error } = await fetchAccount({
  publicKey: zkappAddress,
});
console.log('error', error);
console.log('account', Types.Account.toJSON(account!));

let block = await fetchLastBlock();
console.log('last block', JSON.stringify(block, null, 2));
