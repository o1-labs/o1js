import { Context } from '../../util/global-context.js';
export { currentTransaction };
let currentTransaction = Context.create();
