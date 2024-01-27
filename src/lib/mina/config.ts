import { NetworkId } from '../../mina-signer/src/TSTypes.js';

let networkId: NetworkId = 'testnet';

export function setNetworkId(id: NetworkId) {
  networkId = id;
}

export function getNetworkId() {
  return networkId;
}
