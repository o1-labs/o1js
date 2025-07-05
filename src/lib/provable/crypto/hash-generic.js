import { prefixToField } from '../../../bindings/lib/binable.js';
export { createHashHelpers };
function createHashHelpers(Field, Hash) {
    function salt(prefix) {
        return Hash.update(Hash.initialState(), [prefixToField(Field, prefix)]);
    }
    function emptyHashWithPrefix(prefix) {
        return salt(prefix)[0];
    }
    function hashWithPrefix(prefix, input) {
        let init = salt(prefix);
        return Hash.update(init, input)[0];
    }
    return { salt, emptyHashWithPrefix, hashWithPrefix };
}
