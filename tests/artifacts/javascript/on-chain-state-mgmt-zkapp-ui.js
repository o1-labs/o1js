import { logEvents } from './e2e-tests-helpers.js';
import {
  adminPrivateKey,
  HelloWorld,
} from './examples/zkapps/hello-world/hello-world.js';
import { AccountUpdate, Field, Mina, PrivateKey, verify } from './index.js';

const deployButton = document.querySelector('#deployButton');
const updateButton = document.querySelector('#updateButton');
const clearEventsButton = document.querySelector('#clearEventsButton');
const eventsContainer = document.querySelector('#eventsContainer');
const stateContainer = document.querySelector('#zkAppStateContainer');

logEvents(
  `o1js initialized after ${performance.now().toFixed(2)}ms`,
  eventsContainer
);

// Setup local ledger
let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
// Test account that pays all the fees
const [feePayer] = Local.testAccounts;
const contractAccount = Mina.TestPublicKey.random();
const contract = new HelloWorld(contractAccount);
let verificationKey = null;

deployButton.addEventListener('click', async () => {
  deployButton.disabled = true;

  logEvents('Deploying...', eventsContainer);

  try {
    await HelloWorld.compile();
    const deploymentTransaction = await Mina.transaction(feePayer, async () => {
      if (!eventsContainer.innerHTML.includes('Deployed successfully')) {
        AccountUpdate.fundNewAccount(feePayer);
      }
      await contract.deploy();
    });

    await deploymentTransaction
      .sign([feePayer.key, contractAccount.key])
      .send();
    const initialState =
      Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();
    stateContainer.innerHTML = initialState;
    logEvents(`Initial zkApp State: ${initialState}`, eventsContainer);
    logEvents('Deployed successfully!', eventsContainer);
  } catch (exception) {
    logEvents(`Deployment failure: ${exception.message}`, eventsContainer);
    console.log(exception);
  }

  deployButton.disabled = false;
});

updateButton.addEventListener('click', async (event) => {
  event.preventDefault();
  updateButton.disabled = true;

  const formData = JSON.stringify(
    Object.fromEntries(new FormData(document.querySelector('#zkAppUpdateForm')))
  );
  const appStateValue = document.querySelector('#zkAppStateValue');

  try {
    const currentState =
      Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();
    logEvents(
      `Updating zkApp State from ${currentState} to ${appStateValue.value} with Admin Private Key and using form data: ${formData}...`,
      eventsContainer
    );
    const transaction = await Mina.transaction(feePayer, async () => {
      await contract.update(
        Field(parseInt(appStateValue.value)),
        adminPrivateKey
      );
    });

    const [proof] = await transaction.prove();

    if (verificationKey) {
      let isVerified = await verify(proof, verificationKey.data);
      if (!isVerified) throw Error('Proof verification failed');
    }

    await transaction.sign([feePayer.key]).send();

    const newState =
      Mina.getAccount(contractAccount).zkapp?.appState?.[0].toString();
    stateContainer.innerHTML = newState;
    logEvents(`State successfully updated to: ${newState}!`, eventsContainer);
  } catch (exception) {
    logEvents(`State Update failure: ${exception.message}`, eventsContainer);
    console.log(exception);
  }

  updateButton.disabled = false;
  return false;
});

clearEventsButton.addEventListener('click', async () => {
  eventsContainer.innerHTML = 'No data available yet.';
});
