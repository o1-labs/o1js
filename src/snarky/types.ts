import {
  provableFromLayout as provable,
  toJSONEssential,
  customTypes,
} from './gen/transaction.js';

export * as Types from './gen/transaction.js';

export { provableFromLayout, toJSONEssential };

function provableFromLayout<T, JsonT>(layout: any) {
  return provable<T, JsonT>(layout, customTypes);
}
