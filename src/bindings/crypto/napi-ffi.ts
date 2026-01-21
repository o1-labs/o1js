export type Ctor<Args extends unknown[], T> = new (...args: Args) => T;

export function castCtor<C>(value: unknown): C {
  return value as C;
}

export function arrayFrom<T>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  return Array.from(value as ArrayLike<T>);
}

export function readNapiProp<T>(value: unknown, ...keys: string[]): T | undefined {
  if (value == null) return undefined;
  const record = value as Record<string, T>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

export type NapiPointEvaluationsObject = {
  zeta: Uint8Array[];
  zetaOmega?: Uint8Array[];
  zeta_omega?: Uint8Array[];
};

export type NapiPointEvaluationsObjectOption = NapiPointEvaluationsObject | undefined;

export type NapiProofEvaluationsObject = {
  public?: NapiPointEvaluationsObject;
  w: NapiPointEvaluationsObject[];
  z: NapiPointEvaluationsObject;
  s: NapiPointEvaluationsObject[];
  coefficients: NapiPointEvaluationsObject[];
  genericSelector?: NapiPointEvaluationsObject;
  generic_selector?: NapiPointEvaluationsObject;
  poseidonSelector?: NapiPointEvaluationsObject;
  poseidon_selector?: NapiPointEvaluationsObject;
  completeAddSelector?: NapiPointEvaluationsObject;
  complete_add_selector?: NapiPointEvaluationsObject;
  mulSelector?: NapiPointEvaluationsObject;
  mul_selector?: NapiPointEvaluationsObject;
  emulSelector?: NapiPointEvaluationsObject;
  emul_selector?: NapiPointEvaluationsObject;
  endomulScalarSelector?: NapiPointEvaluationsObject;
  endomul_scalar_selector?: NapiPointEvaluationsObject;
  rangeCheck0Selector?: NapiPointEvaluationsObjectOption;
  range_check0_selector?: NapiPointEvaluationsObjectOption;
  rangeCheck1Selector?: NapiPointEvaluationsObjectOption;
  range_check1_selector?: NapiPointEvaluationsObjectOption;
  foreignFieldAddSelector?: NapiPointEvaluationsObjectOption;
  foreign_field_add_selector?: NapiPointEvaluationsObjectOption;
  foreignFieldMulSelector?: NapiPointEvaluationsObjectOption;
  foreign_field_mul_selector?: NapiPointEvaluationsObjectOption;
  xorSelector?: NapiPointEvaluationsObjectOption;
  xor_selector?: NapiPointEvaluationsObjectOption;
  rotSelector?: NapiPointEvaluationsObjectOption;
  rot_selector?: NapiPointEvaluationsObjectOption;
  lookupAggregation?: NapiPointEvaluationsObjectOption;
  lookup_aggregation?: NapiPointEvaluationsObjectOption;
  lookupTable?: NapiPointEvaluationsObjectOption;
  lookup_table?: NapiPointEvaluationsObjectOption;
  lookupSorted?: NapiPointEvaluationsObjectOption[];
  lookup_sorted?: NapiPointEvaluationsObjectOption[];
  runtimeLookupTable?: NapiPointEvaluationsObjectOption;
  runtime_lookup_table?: NapiPointEvaluationsObjectOption;
  runtimeLookupTableSelector?: NapiPointEvaluationsObjectOption;
  runtime_lookup_table_selector?: NapiPointEvaluationsObjectOption;
  xorLookupSelector?: NapiPointEvaluationsObjectOption;
  xor_lookup_selector?: NapiPointEvaluationsObjectOption;
  lookupGateLookupSelector?: NapiPointEvaluationsObjectOption;
  lookup_gate_lookup_selector?: NapiPointEvaluationsObjectOption;
  rangeCheckLookupSelector?: NapiPointEvaluationsObjectOption;
  range_check_lookup_selector?: NapiPointEvaluationsObjectOption;
  foreignFieldMulLookupSelector?: NapiPointEvaluationsObjectOption;
  foreign_field_mul_lookup_selector?: NapiPointEvaluationsObjectOption;
};
