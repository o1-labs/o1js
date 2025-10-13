import { Field, verify } from 'o1js';
import { Performance } from '../../../lib/testing/perf-regression.js';
import { PayrollRuntimeTableZkProgram } from './payroll.js';

const cs = await PayrollRuntimeTableZkProgram.analyzeMethods();
const perfPayroll = Performance.create(PayrollRuntimeTableZkProgram.name, cs);

perfPayroll.start('compile');
let { verificationKey } = await PayrollRuntimeTableZkProgram.compile({ withRuntimeTables: true });
perfPayroll.end();

export const examplePayrollPublicInput = Field(1600_00); // total withheld (cents)
export const examplePayrollPrivateInputs = [
  Field(1000_00), // Alice gross pay
  Field(2000_00), // Bob gross pay
  Field(3000_00), // Charlie gross pay
  Field(2_000), // Alice rate
  Field(2_500), // Bob rate
  Field(3_000), // Charlie rate
] as const;

perfPayroll.start('prove', 'verifyPayroll');
let { proof } = await PayrollRuntimeTableZkProgram.verifyPayroll(
  examplePayrollPublicInput,
  ...examplePayrollPrivateInputs
);
perfPayroll.end();

perfPayroll.start('verify', 'verifyPayroll');
await verify(proof, verificationKey);
perfPayroll.end();
