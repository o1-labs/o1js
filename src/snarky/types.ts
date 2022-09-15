import * as Helpers from './transaction-helpers.js';
import { customTypes } from './gen/transaction.js';

export * as Types from './gen/transaction.js';
export { jsLayout } from './gen/js-layout.js';

export { asFieldsAndAux };

function asFieldsAndAux<T, JsonT>(layout: any) {
  return Helpers.asFieldsAndAux<T, JsonT>(layout, customTypes);
}
