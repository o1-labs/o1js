import type { Field } from '../field.js';

export { Provable, ProvablePure };

/**
 * `Provable<T>` is the general circuit type interface in o1js. `Provable<T>` interface describes how a type `T` is made up of {@link Field} elements and "auxiliary" (non-provable) data.
 *
 * `Provable<T>` is the required input type in a few places in o1js. One convenient way to create a `Provable<T>` is using `Struct`.
 *
 * The properties and methods on the provable type exist in all base o1js types as well (aka. {@link Field}, {@link Bool}, etc.). In most cases, a zkApp developer does not need these functions to create zkApps.
 */
interface Provable<T> {
  /**
   * A function that takes `value`, an element of type `T`, as argument and returns an array of {@link Field} elements that make up the provable data of `value`.
   *
   * @param value - the element of type `T` to generate the {@link Field} array from.
   *
   * @return A {@link Field} array describing how this `T` element is made up of {@link Field} elements.
   */
  toFields: (value: T) => Field[];

  /**
   * A function that takes `value` (optional), an element of type `T`, as argument and returns an array of any type that make up the "auxiliary" (non-provable) data of `value`.
   *
   * @param value - the element of type `T` to generate the auxiliary data array from, optional. If not provided, a default value for auxiliary data is returned.
   *
   * @return An array of any type describing how this `T` element is made up of "auxiliary" (non-provable) data.
   */
  toAuxiliary: (value?: T) => any[];

  /**
   * A function that returns an element of type `T` from the given provable and "auxiliary" data.
   *
   * **Important**: For any element of type `T`, this function is the reverse operation of calling {@link toFields} and {@link toAuxilary} methods on an element of type `T`.
   *
   * @param fields - an array of {@link Field} elements describing the provable data of the new `T` element.
   * @param aux - an array of any type describing the "auxiliary" data of the new `T` element, optional.
   *
   * @return An element of type `T` generated from the given provable and "auxiliary" data.
   */
  fromFields: (fields: Field[], aux: any[]) => T;

  /**
   * Return the size of the `T` type in terms of {@link Field} type, as {@link Field} is the primitive type.
   *
   * **Warning**: This function returns a `number`, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   *
   * @return A `number` representing the size of the `T` type in terms of {@link Field} type.
   */
  sizeInFields(): number;

  /**
   * Add assertions to the proof to check if `value` is a valid member of type `T`.
   * This function does not return anything, instead it creates any number of assertions to prove that `value` is a valid member of the type `T`.
   *
   * For instance, calling check function on the type {@link Bool} asserts that the value of the element is either 1 or 0.
   *
   * @param value - the element of type `T` to put assertions on.
   */
  check: (value: T) => void;
}

/**
 * `ProvablePure<T>` is a special kind of {@link Provable} interface, where the "auxiliary" (non-provable) data is empty. This means the type consists only of field elements, in that sense it is "pure".
 * Any element on the interface `ProvablePure<T>` is also an element of the interface `Provable<T>` where the "auxiliary" data is empty.
 *
 * Examples where `ProvablePure<T>` is required are types of on-chain state, events and actions.
 *
 * It includes the same properties and methods as the {@link Provable} interface.
 */
interface ProvablePure<T> extends Provable<T> {
  /**
   * A function that takes `value`, an element of type `T`, as argument and returns an array of {@link Field} elements that make up the provable data of `value`.
   *
   * @param value - the element of type `T` to generate the {@link Field} array from.
   *
   * @return A {@link Field} array describing how this `T` element is made up of {@link Field} elements.
   */
  toFields: (value: T) => Field[];

  /**
   * A function that takes `value` (optional), an element of type `T`, as argument and returns an array of any type that make up the "auxiliary" (non-provable) data of `value`.
   * As any element of the interface `ProvablePure<T>` includes no "auxiliary" data by definition, this function always returns a default value.
   *
   * @param value - the element of type `T` to generate the auxiliary data array from, optional. If not provided, a default value for auxiliary data is returned.
   *
   * @return An empty array, as any element of the interface `ProvablePure<T>` includes no "auxiliary" data by definition.
   */
  toAuxiliary: (value?: T) => any[];

  /**
   * A function that returns an element of type `T` from the given provable data.
   *
   * **Important**: For any element of type `T`, this function is the reverse operation of calling {@link toFields} method on an element of type `T`.
   *
   * @param fields - an array of {@link Field} elements describing the provable data of the new `T` element.
   *
   * @return An element of type `T` generated from the given provable data.
   */
  fromFields: (fields: Field[]) => T;

  /**
   * Return the size of the `T` type in terms of {@link Field} type, as {@link Field} is the primitive type.
   *
   * **Warning**: This function returns a `number`, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   *
   * @return A `number` representing the size of the `T` type in terms of {@link Field} type.
   */
  sizeInFields(): number;

  /**
   * Add assertions to the proof to check if `value` is a valid member of type `T`.
   * This function does not return anything, rather creates any number of assertions on the proof to prove `value` is a valid member of the type `T`.
   *
   * For instance, calling check function on the type {@link Bool} asserts that the value of the element is either 1 or 0.
   *
   * @param value - the element of type `T` to put assertions on.
   */
  check: (value: T) => void;
}
