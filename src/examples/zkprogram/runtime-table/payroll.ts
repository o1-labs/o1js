/**
 * Example zkProgram that demonstrates how to use RuntimeTable to model payroll tax withholding.
 *
 * Alice, Bob, and Charlie are contractors with dynamic withholding rates (in basis points).
 * The employer wants to prove that the public `totalWithheld` amount matches
 * the confidential salaries and the per-employee rates registered in the runtime table.
 */

import { Field, RuntimeTable, ZkProgram } from 'o1js';

export { PayrollRuntimeTableZkProgram };

const PAYROLL_TABLE_ID = 2; // runtime table identifiers must avoid the reserved ids 0 and 1
const EMPLOYEE_INDICES = [1001n, 2002n, 3003n] as const;
const BPS_SCALE = Field(100_00); // 100% expressed in basis points

const PayrollRuntimeTableZkProgram = ZkProgram({
  name: 'payroll-runtime-table',
  publicInput: Field, // total tax withheld across all employees
  methods: {
    verifyPayroll: {
      privateInputs: [Field, Field, Field, Field, Field, Field],
      async method(
        totalWithheld: Field,
        aliceGross: Field,
        bobGross: Field,
        charlieGross: Field,
        aliceRateBps: Field,
        bobRateBps: Field,
        charlieRateBps: Field
      ) {
        const payrollTable = new RuntimeTable(PAYROLL_TABLE_ID, [...EMPLOYEE_INDICES]);

        // register bps for each employee
        payrollTable.insert([
          [EMPLOYEE_INDICES[0], aliceRateBps],
          [EMPLOYEE_INDICES[1], bobRateBps],
          [EMPLOYEE_INDICES[2], charlieRateBps],
        ]);

        // look up each employees bps rate
        payrollTable.lookup(EMPLOYEE_INDICES[0], aliceRateBps);
        payrollTable.lookup(EMPLOYEE_INDICES[1], bobRateBps);
        payrollTable.lookup(EMPLOYEE_INDICES[2], charlieRateBps);
        payrollTable.check();

        // sanity checks on inputs
        aliceRateBps.lessThanOrEqual(BPS_SCALE).assertTrue('Alice rate exceeds 100%');
        bobRateBps.lessThanOrEqual(BPS_SCALE).assertTrue('Bob rate exceeds 100%');
        charlieRateBps.lessThanOrEqual(BPS_SCALE).assertTrue('Charlie rate exceeds 100%');

        const withheldAlice = aliceGross.mul(aliceRateBps).div(BPS_SCALE);
        const withheldBob = bobGross.mul(bobRateBps).div(BPS_SCALE);
        const withheldCharlie = charlieGross.mul(charlieRateBps).div(BPS_SCALE);

        withheldAlice.lessThanOrEqual(aliceGross).assertTrue('Alice withholding > gross pay');
        withheldBob.lessThanOrEqual(bobGross).assertTrue('Bob withholding > gross pay');
        withheldCharlie.lessThanOrEqual(charlieGross).assertTrue('Charlie withholding > gross pay');

        const totalWithheldWitness = withheldAlice.add(withheldBob).add(withheldCharlie);
        totalWithheldWitness.assertEquals(totalWithheld);
      },
    },
  },
});
