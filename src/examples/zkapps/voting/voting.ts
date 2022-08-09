import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
} from 'snarkyjs';

export class Voting extends SmartContract {
  // TODO: Add state variables

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    // TODO: Add account state initilaztion here
  }
  
  voterRegistration(member) {
  // Invokes addEntry method on Voter Membership contract with member passed as an argument.  
  }

  candidateRegistration(member) {
  // Invokes addEntry method on Candidate Membership contract with member passed as an argument.  
  }

  authorizeRegistrations() {
  // Invokes the publish method of both Voter and Candidate Membership contracts.
  }

}
