import { createEcdsa } from './foreign-ecdsa.js';
import { vestaParams } from './foreign-curve-params.js';

class VestaSignature extends createEcdsa(vestaParams) {}

console.log(VestaSignature.toJSON(VestaSignature.dummy));
