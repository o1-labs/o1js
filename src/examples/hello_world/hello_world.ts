import {
  Field,
  SmartContract,
  method,
  PrivateKey,
  Bool,
  State,
  Party,
  DeployArgs,
  state,
  Permissions,
  isReady,
} from '../../../dist/server/index.mjs';

class HelloWorld extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(input: DeployArgs) {
    super.deploy(input);
    this.x.set(3);
  }
}
