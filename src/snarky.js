// To build for node: Uncomment this export and comment the chrome exports
export * from './node_bindings/snarky_js_node.bc.js'

// To build for web: Uncomment this section and comment the node exports
// export let Field
// export let Bool
// export let Circuit
// export let Poseidon
// export let Group
// export let Scalar

// import * as _snarky from './chrome_bindings/snarky_js_chrome.bc.js'
// ;(async () => {
//   if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
//     Field = window.__snarky.Field
//     Bool = window.__snarky.Bool
//     Circuit = window.__snarky.Circuit
//     Poseidon = window.__snarky.Poseidon
//     Group = window.__snarky.Group
//     Scalar = window.__snarky.Scalar
//   }
// })()
