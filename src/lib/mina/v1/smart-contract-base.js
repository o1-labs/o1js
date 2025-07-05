export { isSmartContract, SmartContractBase };
class SmartContractBase {
}
function isSmartContract(object) {
    return object instanceof SmartContractBase;
}
