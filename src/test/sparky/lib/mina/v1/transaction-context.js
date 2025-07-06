"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentTransaction = void 0;
const global_context_js_1 = require("../../util/global-context.js");
let currentTransaction = global_context_js_1.Context.create();
exports.currentTransaction = currentTransaction;
