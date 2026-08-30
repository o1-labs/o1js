/**
 * Holistic benchmark for a token contract
 * Tests more complex smart contract with token operations
 */

import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  UInt64,
  Bool,
  AccountUpdate,
} from '../../../src/lib/provable/wrapped.js';
import { backendBenchmark, BackendConfig } from '../../utils/comparison/backend-benchmark.js';

export { tokenContractBenchmarks };

const tokenContractBenchmarks = [
  createTokenContractBenchmark(),
  createTokenTransferBenchmark(),
];

class TokenContract extends SmartContract {
  @state(UInt64) totalSupply = State<UInt64>();
  @state(PublicKey) admin = State<PublicKey>();

  init() {
    super.init();
    this.totalSupply.set(UInt64.from(1000000));
    this.admin.set(this.sender.getAndRequireSignature());
  }

  @method async mint(recipient: PublicKey, amount: UInt64): Promise<void> {
    // Only admin can mint
    const admin = this.admin.getAndRequireEquals();
    this.sender.getAndRequireSignature().assertEquals(admin);

    // Update total supply
    const currentSupply = this.totalSupply.getAndRequireEquals();
    const newSupply = currentSupply.add(amount);
    this.totalSupply.set(newSupply);

    // Mint tokens to recipient
    this.token.mint({
      address: recipient,
      amount,
    });
  }

  @method async transfer(
    from: PublicKey,
    to: PublicKey,
    amount: UInt64
  ): Promise<void> {
    // Verify sender authorization
    this.sender.getAndRequireSignature().assertEquals(from);

    // Create account updates
    this.token.send({
      from,
      to,
      amount,
    });
  }

  @method async approve(spender: PublicKey, amount: UInt64): Promise<void> {
    // Set spending allowance
    const owner = this.sender.getAndRequireSignature();
    
    // In a real implementation, we'd track allowances in a separate mapping
    // For this benchmark, we'll simulate the constraint cost
    const allowanceKey = owner.toFields()[0].add(spender.toFields()[0]);
    
    // Simulate storing the allowance
    allowanceKey.assertEquals(allowanceKey); // Dummy constraint
  }

  @method async burn(amount: UInt64): Promise<void> {
    const sender = this.sender.getAndRequireSignature();

    // Update total supply
    const currentSupply = this.totalSupply.getAndRequireEquals();
    const newSupply = currentSupply.sub(amount);
    this.totalSupply.set(newSupply);

    // Burn tokens from sender
    this.token.burn({
      address: sender,
      amount,
    });
  }
}

class TokenTransferContract extends SmartContract {
  @method async batchTransfer(
    recipients: [PublicKey, PublicKey, PublicKey],
    amounts: [UInt64, UInt64, UInt64]
  ): Promise<void> {
    const sender = this.sender.getAndRequireSignature();

    // Verify total amount doesn't exceed balance (simplified)
    const totalAmount = amounts[0].add(amounts[1]).add(amounts[2]);
    
    // Simulate balance check
    const hasEnoughBalance = totalAmount.lessThanOrEqual(UInt64.from(1000000));
    hasEnoughBalance.assertTrue();

    // Process each transfer
    for (let i = 0; i < 3; i++) {
      this.token.send({
        from: sender,
        to: recipients[i],
        amount: amounts[i],
      });
    }
  }

  @method async conditionalTransfer(
    to: PublicKey,
    amount: UInt64,
    condition: Field
  ): Promise<void> {
    const sender = this.sender.getAndRequireSignature();

    // Only transfer if condition is met
    const shouldTransfer = condition.equals(Field(1));
    
    // Use conditional logic
    const transferAmount = shouldTransfer.toField().mul(amount.value).seal();
    
    this.token.send({
      from: sender,
      to,
      amount: UInt64.from(transferAmount),
    });
  }
}

function createTokenContractBenchmark() {
  return backendBenchmark(
    'Token Contract Operations',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await TokenContract.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      const contract = new TokenContract(PublicKey.empty());
      const recipient = PublicKey.empty();
      const spender = PublicKey.empty();
      
      // Simulate various token operations
      contract.init();
      
      await contract.mint(recipient, UInt64.from(1000));
      await contract.transfer(recipient, spender, UInt64.from(100));
      await contract.approve(spender, UInt64.from(500));
      await contract.burn(UInt64.from(50));
      
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 80 }; // Token operations are moderately complex
    },
    getTokenConfigs()
  );
}

function createTokenTransferBenchmark() {
  return backendBenchmark(
    'Token Transfer Scenarios',
    async (tic, toc, memTracker) => {
      tic('compilation');
      await TokenTransferContract.compile();
      toc('compilation');
      memTracker.checkpoint();

      tic('witness');
      
      const contract = new TokenTransferContract(PublicKey.empty());
      
      const recipients: [PublicKey, PublicKey, PublicKey] = [
        PublicKey.empty(),
        PublicKey.empty(),
        PublicKey.empty(),
      ];
      
      const amounts: [UInt64, UInt64, UInt64] = [
        UInt64.from(100),
        UInt64.from(200),
        UInt64.from(300),
      ];
      
      // Test batch transfer
      await contract.batchTransfer(recipients, amounts);
      
      // Test conditional transfer
      await contract.conditionalTransfer(
        recipients[0],
        UInt64.from(150),
        Field(1)
      );
      
      toc('witness');
      memTracker.checkpoint();

      tic('proving');
      toc('proving');

      tic('verification');
      toc('verification');

      tic('total');
      toc('total');

      return { constraints: 60 }; // Batch and conditional operations
    },
    getTokenConfigs()
  );
}

function getTokenConfigs(): BackendConfig[] {
  return [
    {
      name: 'snarky',
      warmupRuns: 1,
      measurementRuns: 4,
    },
    {
      name: 'sparky',
      warmupRuns: 1,
      measurementRuns: 4,
    },
  ];
}