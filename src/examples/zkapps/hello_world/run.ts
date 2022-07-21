import { HelloWorld } from './hello_world';
import { isReady, Mina, PrivateKey, Party } from '../../../../dist/server';

// setup local ledger
let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let deployerAccount = Local.testAccounts[0].privateKey;

// zkapp account
let zkAppPrivateKey = PrivateKey.random();
let zkAppAddress = zkAppPrivateKey.toPublicKey();
let zkAppInstance = new HelloWorld(zkAppAddress);
