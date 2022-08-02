import { Members } from './members';
import { Mina, PrivateKey, Party, Field } from 'snarkyjs';

console.log('Running script...');

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);
