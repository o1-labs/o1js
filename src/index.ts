export * from './snarky'
export * from './signature'
export * from './circuit_value'
export * from './merkle_proof'

import { Bool, Group, Field } from './snarky'
// Hangs
// const x0 = new Field('37')
// const x1 = new Field(37)
// console.assert(x0.equals(x1).toBoolean())

// Does not hang
const b0 = new Bool(false)
const b1 = new Bool(true)
const b3 = b0.and(b1.not()).or(b1)
console.log(b3.toString())

// Does not hang
let g0 = new Group(-1, 2)
let g1 = new Group({ x: -2, y: 2 })
let g2 = Group.generator
let g3 = g0.add(g1).neg().sub(g2)
console.log(g3.toJSON())
