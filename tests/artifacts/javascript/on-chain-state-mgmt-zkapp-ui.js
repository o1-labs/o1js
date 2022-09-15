import {
  Mina,
  PrivateKey,
  AccountUpdate,
  Field,
  isReady,
  SmartContract,
  state,
  State,
  method,
  Permissions,
} from './index.js';
import {
  HelloWorld,
  adminPrivateKey,
} from './examples/zkapps/hello_world/hello_world.js';
import { logEvents } from './e2eTestsHelpers.js';

await isReady;

const deployButton = document.querySelector('#deployButton');
const updateButton = document.querySelector('#updateButton');
const clearEventsButton = document.querySelector('#clearEventsButton');
const eventsContainer = document.querySelector('#eventsContainer');
const zkAppStateContainer = document.querySelector('#zkAppStateContainer');

logEvents(
  `SnarkyJS initialized after ${performance.now().toFixed(2)}ms`,
  eventsContainer
);

// Setup local ledger
let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
// Test account that pays all the fees
const feePayer = Local.testAccounts[0].privateKey;
// zkApp account
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const zkAppInstance = new HelloWorld(zkAppAddress);

deployButton.addEventListener('click', async () => {
  deployButton.disabled = true;

  logEvents('Deploying zkApp...', eventsContainer);

  try {
    const { verificationKey } = await HelloWorld.compile(zkAppAddress);
    const deploymentTransaction = await Mina.transaction(feePayer, () => {
      if (!eventsContainer.innerHTML.includes('zkApp Deployed successfully')) {
        AccountUpdate.fundNewAccount(feePayer);
      }

      zkAppInstance.deploy({
        verificationKey,
        zkappKey: zkAppPrivateKey,
      });
    });

    await deploymentTransaction.send();
    const initialState = Mina.getAccount(zkAppAddress).appState?.[0].toString();
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
    const currentState = Mina.getAccount(zkAppAddress).appState?.[0].toString();
    logEvents(
      `Updating zkApp State from ${currentState} to ${zkAppStateValue.value} with Admin Private Key and using form data: ${formData}...`,
      eventsContainer
    );
    const transaction = await Mina.transaction(feePayer, () => {
      zkAppInstance.update(
        Field(parseInt(zkAppStateValue.value)),
        adminPrivateKey
      );
      zkAppInstance.sign(zkAppPrivateKey);
    });

    await transaction.prove();
    await transaction.send();

    const newState = Mina.getAccount(zkAppAddress).appState?.[0].toString();
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
