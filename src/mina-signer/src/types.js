export const NetworkId = {
    toString(network) {
        return typeof network === 'string' ? network : network.custom;
    },
};
