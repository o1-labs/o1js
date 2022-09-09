export { Context };

namespace Context {
  export type id = number;

  export type t<Context> = (() => Context | undefined) & {
    data: { context: Context; id: id }[];
    allowsNesting: boolean;

    get(): Context;
    has(): boolean;
    runWith<Result>(
      context: Context,
      func: (context: Context) => Result
    ): [Context, Result];
    runWithAsync<Result>(
      context: Context,
      func: (context: Context) => Promise<Result>
    ): Promise<[Context, Result]>;
    enter(context: Context): id;
    leave(id: id): Context;
    id: () => id;
  };
}
const Context = { create };

function create<C>(
  options = {
    allowsNesting: true,
    default: undefined,
  } as { allowsNesting?: boolean; default?: C }
): Context.t<C> {
  let t: Context.t<C> = Object.assign(
    function (): C | undefined {
      return t.data[t.data.length - 1]?.context;
    },
    {
      data: [],
      allowsNesting: options.allowsNesting ?? true,
      get: () => get(t),
      has: () => t.data.length !== 0,
      runWith: <R>(context: C, func: (context: C) => R) =>
        runWith(t, context, func),
      runWithAsync: <R>(context: C, func: (context: C) => Promise<R>) =>
        runWithAsync(t, context, func),
      enter: (context: C) => enter(t, context),
      leave: (id: Context.id) => leave(t, id),
      id: () => {
        if (t.data.length === 0) throw Error(contextConflictMessage);
        return t.data[t.data.length - 1].id;
      },
    }
  );
  if (options.default !== undefined) enter(t, options.default);
  return t;
}

function enter<C>(t: Context.t<C>, context: C): Context.id {
  if (t.data.length > 0 && !t.allowsNesting) {
    throw Error(contextConflictMessage);
  }
  let id = Math.random();
  t.data.push({ context, id });
  return id;
}

function leave<C>(t: Context.t<C>, id: Context.id): C {
  let current = t.data.pop();
  if (current === undefined) throw Error(contextConflictMessage);
  if (current.id !== id) throw Error(contextConflictMessage);
  return current.context;
}

function get<C>(t: Context.t<C>): C {
  if (t.data.length === 0) throw Error(contextConflictMessage);
  let current = t.data[t.data.length - 1];
  return current.context;
}

function runWith<C, Result>(
  t: Context.t<C>,
  context: C,
  func: (context: C) => Result
): [C, Result] {
  let id = enter(t, context);
  let result: Result;
  let resultContext: C;
  try {
    result = func(context);
  } finally {
    resultContext = leave(t, id);
  }
  return [resultContext, result];
}

async function runWithAsync<C, Result>(
  t: Context.t<C>,
  context: C,
  func: (context: C) => Promise<Result>
): Promise<[C, Result]> {
  let id = enter(t, context);
  let result: Result;
  let resultContext: C;
  try {
    result = await func(context);
  } finally {
    resultContext = leave(t, id);
  }
  return [resultContext, result];
}

let contextConflictMessage =
  "It seems you're running multiple provers concurrently within" +
  ' the same JavaScript thread, which, at the moment, is not supported and would lead to bugs.';
