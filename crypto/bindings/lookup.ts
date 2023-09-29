import { MlArray, MlBool, MlOption } from '../../../lib/ml/base.js';

export { Lookup, LookupInfo, LookupPatterns, LookupFeatures, LookupSelectors };

type LookupPatterns = [
  _: 0,
  xor: MlBool,
  lookup: MlBool,
  range_check: MlBool,
  foreign_field_mul: MlBool
];
type LookupFeatures = [
  _: 0,
  patterns: LookupPatterns,
  joint_lookup_used: MlBool,
  uses_runtime_tables: MlBool
];
type LookupInfo = [
  _: 0,
  max_per_row: number,
  max_joint_size: number,
  features: LookupFeatures
];
type LookupSelectors<PolyComm> = [
  _: 0,
  lookup: MlOption<PolyComm>,
  xor: MlOption<PolyComm>,
  range_check: MlOption<PolyComm>,
  ffmul: MlOption<PolyComm>
];
type Lookup<PolyComm> = [
  _: 0,
  joint_lookup_used: MlBool,
  lookup_table: MlArray<PolyComm>,
  selectors: LookupSelectors<PolyComm>,
  table_ids: MlOption<PolyComm>,
  lookup_info: LookupInfo,
  runtime_tables_selector: MlOption<PolyComm>
];
