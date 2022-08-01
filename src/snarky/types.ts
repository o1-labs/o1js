import * as Helpers from './parties-helpers';
import { customTypes } from './gen/parties';

export * as Types from './gen/parties';
export { jsLayout } from './gen/js-layout';
export { AsFieldsAndAux } from './parties-helpers';

export { asFieldsAndAux };

function asFieldsAndAux<T, JsonT>(layout: any) {
  return Helpers.asFieldsAndAux<T, JsonT>(layout, customTypes);
}
