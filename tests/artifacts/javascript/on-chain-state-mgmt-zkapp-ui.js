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
const zkAppStateContainer = document.querySelector('#zkAppStateContainer');

logEvents(
  `o1js initialized after ${performance.now().toFixed(2)}ms`,
  eventsContainer
);

// Setup local ledger
let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
// Test account that pays all the fees
const [feePayer] = Local.testAccounts
// zkApp account
const zkAppAccount = Mina.TestAccount.random()
const zkApp = new HelloWorld(zkAppAccount);
let verificationKey = null;

deployButton.addEventListener('click', async () => {
  deployButton.disabled = true;

  logEvents('Deploying zkApp...', eventsContainer);

  try {
    await HelloWorld.compile();
    const deploymentTransaction = await Mina.transaction(feePayer, async () => {
      if (!eventsContainer.innerHTML.includes('zkApp Deployed successfully')) {
        AccountUpdate.fundNewAccount(feePayer);
      }
      await zkApp.deploy();
    });

    await deploymentTransaction.sign([feePayer.key, zkAppAccount.key]).send();
    const initialState =
      Mina.getAccount(zkAppAccount).zkapp?.appState?.[0].toString();
    zkAppStateContainer.innerHTML = initialState;
    logEvents(`Initial zkApp State: ${initialState}`, eventsContainer);
    logEvents('zkApp Deployed successfully!', eventsContainer);
  } catch (exception) {
    logEvents(
      `zkApp Deployment failure: ${exception.message}`,
      eventsContainer
    );
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
  const zkAppStateValue = document.querySelector('#zkAppStateValue');

  try {
    const currentState =
      Mina.getAccount(zkAppAccount).zkapp?.appState?.[0].toString();
    logEvents(
      `Updating zkApp State from ${currentState} to ${zkAppStateValue.value} with Admin Private Key and using form data: ${formData}...`,
      eventsContainer
    );
    const transaction = await Mina.transaction(feePayer, async () => {
      await zkApp.update(
        Field(parseInt(zkAppStateValue.value)),
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
      Mina.getAccount(zkAppAccount).zkapp?.appState?.[0].toString();
    zkAppStateContainer.innerHTML = newState;
    logEvents(
      `zkApp State successfully updated to: ${newState}!`,
      eventsContainer
    );
  } catch (exception) {
    logEvents(
      `zkApp State Update failure: ${exception.message}`,
      eventsContainer
    );
    console.log(exception);
  }

  updateButton.disabled = false;
  return false;
});

clearEventsButton.addEventListener('click', async () => {
  eventsContainer.innerHTML = 'No data available yet.';
});
