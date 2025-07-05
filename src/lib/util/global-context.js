export { Context };
const Context = { create };
function create(options = {
    allowsNesting: true,
    default: undefined,
}) {
    let t = Object.assign(function () {
        return t.data[t.data.length - 1]?.context;
    }, {
        data: [],
        allowsNesting: options.allowsNesting ?? true,
        get: () => get(t),
        has: () => t.data.length !== 0,
        runWith(context, func) {
            let id = enter(t, context);
            let result;
            let resultContext;
            try {
                result = func(context);
            }
            finally {
                resultContext = leave(t, id);
            }
            return [resultContext, result];
        },
        async runWithAsync(context, func) {
            let id = enter(t, context);
            let result;
            let resultContext;
            try {
                result = await func(context);
            }
            finally {
                resultContext = leave(t, id);
            }
            return [resultContext, result];
        },
        enter: (context) => enter(t, context),
        leave: (id) => leave(t, id),
        id: () => {
            if (t.data.length === 0)
                throw Error(contextConflictMessage);
            return t.data[t.data.length - 1].id;
        },
    });
    if (options.default !== undefined)
        enter(t, options.default);
    return t;
}
function enter(t, context) {
    if (t.data.length > 0 && !t.allowsNesting) {
        throw Error(contextConflictMessage);
    }
    let id = Math.random();
    let trace = Error().stack?.slice(5);
    t.data.push({ context, id, trace });
    return id;
}
function leave(t, id) {
    let current = t.data.pop();
    if (current === undefined)
        throw Error(contextConflictMessage);
    if (current.id !== id) {
        let message = contextConflictMessage;
        let expected = t.data.find((c) => c.id === id);
        if (expected?.trace) {
            message += `\n\nWe wanted to leave the global context entered here:${expected.trace}`;
            if (current.trace) {
                message += `\n\nBut we actually would have left the global context entered here:${current.trace}`;
                message += `\n\nOur first recommendation is to check for a missing 'await' in the second stack trace.`;
            }
            message += `\n\n`;
        }
        throw Error(message);
    }
    return current.context;
}
function get(t) {
    if (t.data.length === 0)
        throw Error(contextConflictMessage);
    let current = t.data[t.data.length - 1];
    return current.context;
}
// FIXME there are many common scenarios where this error occurs, which weren't expected when this was written
// it should list them and help to resolve them
let contextConflictMessage = `The global context managed by o1js reached an inconsistent state. This could be caused by one of the following reasons:

- You are missing an 'await' somewhere, which causes a new global context to be entered before we finished the last one.

- You are importing two different instances of o1js, which leads to inconsistent tracking of the global context in one of those instances.
  - This is a common problem in projects that use o1js as part of a UI!

- You are running multiple async operations concurrently, which conflict in using the global context.
  - Running async o1js operations (like proving) in parallel is not supported! Try running everything serially.
  
Investigate the stack traces below for more hints about the problem.`;
