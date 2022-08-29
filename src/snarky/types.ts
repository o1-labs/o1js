import * as Helpers from './parties-helpers.js';
import { customTypes } from './gen/parties.js';

export * as Types from './gen/parties.js';
export { jsLayout } from './gen/js-layout.js';

export { asFieldsAndAux };

function asFieldsAndAux<T, JsonT>(layout: any) {
  return Helpers.asFieldsAndAux<T, JsonT>(layout, customTypes);
}
