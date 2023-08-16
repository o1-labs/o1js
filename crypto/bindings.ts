(globalThis as any).__snarkyTsBindings = {
  dummy,
};

let i = 0;

function dummy() {
  console.log('called', ++i);
}
