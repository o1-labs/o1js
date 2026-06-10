/**
 * Example zkApp demonstrating maximum on-chain state usage (32 field elements)
 * using composite data structures with Struct.
 */
import {
  AccountUpdate,
  Field,
  Mina,
  Provable,
  SmartContract,
  State,
  Struct,
  method,
  state,
} from 'o1js';

// composite structure representing a 2D point (2 field elements)
class Point extends Struct({
  x: Field,
  y: Field,
}) {
  static zero() {
    return new Point({ x: Field(0), y: Field(0) });
  }

  add(other: Point): Point {
    return new Point({
      x: this.x.add(other.x),
      y: this.y.add(other.y),
    });
  }
}

// larger composite structure representing game state (8 field elements)
class GameState extends Struct({
  score: Field,
  level: Field,
  health: Field,
  mana: Field,
  position: Point, // 2 fields
  velocity: Point, // 2 fields
}) {
  static initial() {
    return new GameState({
      score: Field(0),
      level: Field(1),
      health: Field(100),
      mana: Field(50),
      position: Point.zero(),
      velocity: Point.zero(),
    });
  }
}

// struct for storing multiple field elements
class DataBlock extends Struct({
  values: Provable.Array(Field, 8),
}) {
  static empty() {
    return new DataBlock({ values: Array(8).fill(Field(0)) });
  }

  static fromSeed(seed: Field) {
    const values = [];
    let current = seed;
    for (let i = 0; i < 8; i++) {
      values.push(current);
      current = current.add(Field(1));
    }
    return new DataBlock({ values });
  }
}

class BigStateZkapp extends SmartContract {
  @state(GameState) gameState = State<GameState>();
  @state(DataBlock) dataBlock1 = State<DataBlock>();
  @state(DataBlock) dataBlock2 = State<DataBlock>();
  @state(DataBlock) dataBlock3 = State<DataBlock>();

  @method async initializeState() {
    this.gameState.set(GameState.initial());
    this.dataBlock1.set(DataBlock.empty());
    this.dataBlock2.set(DataBlock.empty());
    this.dataBlock3.set(DataBlock.empty());
  }

  @method async updateGameState(newPosition: Point, newVelocity: Point) {
    const current = this.gameState.getAndRequireEquals();

    const updated = new GameState({
      score: current.score.add(Field(10)),
      level: current.level,
      health: current.health,
      mana: current.mana,
      position: current.position.add(newPosition),
      velocity: newVelocity,
    });

    this.gameState.set(updated);
  }

  @method async setDataBlocks(seed1: Field, seed2: Field, seed3: Field) {
    this.dataBlock1.set(DataBlock.fromSeed(seed1));
    this.dataBlock2.set(DataBlock.fromSeed(seed2));
    this.dataBlock3.set(DataBlock.fromSeed(seed3));
  }

  @method async levelUp() {
    const current = this.gameState.getAndRequireEquals();

    const updated = new GameState({
      score: current.score,
      level: current.level.add(Field(1)),
      health: Field(100),
      mana: Field(50),
      position: current.position,
      velocity: current.velocity,
    });

    this.gameState.set(updated);
  }
}
const doProofs = true;

console.log('BigStateZkapp Example - using 32 on-chain state fields\n');

let Local = await Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);

const [sender] = Local.testAccounts;
const zkappAccount = Mina.TestPublicKey.random();
const zkapp = new BigStateZkapp(zkappAccount);

if (doProofs) {
  console.log('Compiling...');
  console.time('compile');
  await BigStateZkapp.compile();
  console.timeEnd('compile');
}

console.log('\nDeploying zkApp...');
let tx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender);
  await zkapp.deploy();
});
await tx.prove();
await tx.sign([sender.key, zkappAccount.key]).send();

console.log('Initializing state...');
tx = await Mina.transaction(sender, async () => {
  await zkapp.initializeState();
});
await tx.prove();
await tx.sign([sender.key]).send();

// read initial state
let gameState = zkapp.gameState.get();
console.log('\nInitial game state:');
console.log(`  Score: ${gameState.score}`);
console.log(`  Level: ${gameState.level}`);
console.log(`  Health: ${gameState.health}`);
console.log(`  Position: (${gameState.position.x}, ${gameState.position.y})`);

console.log('\nUpdating game state...');
tx = await Mina.transaction(sender, async () => {
  await zkapp.updateGameState(
    new Point({ x: Field(10), y: Field(20) }),
    new Point({ x: Field(1), y: Field(2) })
  );
});
await tx.prove();
await tx.sign([sender.key]).send();

gameState = zkapp.gameState.get();
console.log('Updated game state:');
console.log(`  Score: ${gameState.score}`);
console.log(`  Position: (${gameState.position.x}, ${gameState.position.y})`);
console.log(`  Velocity: (${gameState.velocity.x}, ${gameState.velocity.y})`);

console.log('\nSetting data blocks with seeds...');
tx = await Mina.transaction(sender, async () => {
  await zkapp.setDataBlocks(Field(100), Field(200), Field(300));
});
await tx.prove();
await tx.sign([sender.key]).send();

const dataBlock1 = zkapp.dataBlock1.get();
console.log(`DataBlock1 values: [${dataBlock1.values.join(', ')}]`);

console.log('\nLeveling up...');
tx = await Mina.transaction(sender, async () => {
  await zkapp.levelUp();
});
await tx.prove();
await tx.sign([sender.key]).send();

gameState = zkapp.gameState.get();
console.log('After level up:');
console.log(`  Level: ${gameState.level}`);
console.log(`  Health: ${gameState.health} (restored)`);
console.log(`  Mana: ${gameState.mana} (restored)`);

// verify all 32 state fields are used
const account = Mina.getAccount(zkappAccount);
console.log('\nOn-chain state (all 32 fields):');
account.zkapp!.appState.forEach((field, i) => {
  console.log(`  appState[${i}]: ${field}`);
});

console.log('\nBigStateZkapp example completed successfully!');
