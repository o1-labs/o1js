/**
 * Global type augmentations for sparky-adapter
 */

import type { ConstraintFlowStats } from './types.js';

declare global {
  var constraintFlowStats: ConstraintFlowStats | undefined;
  var __currentBackend: string | undefined;
  var currentBackend: string | undefined;
  var __sparkyActive: boolean | undefined;
  var __snarky: { Snarky?: any } | undefined;
  var sparkyConstraintBridge: {
    setActiveBackend?: (backend: string) => void;
    prepareConstraintAccumulation: () => void;
    getAccumulatedConstraints: () => any[];
    getFullConstraintSystem: () => any;
    cleanupConstraintAccumulation: () => void;
    isActiveSparkyBackend: () => boolean;
    testFieldVarConstant: (fieldVar: any) => boolean;
    emitIfConstraint: (condition: any, thenVal: any, elseVal: any) => any;
    emitBooleanAnd: (a: any, b: any) => any;
  } | undefined;
  var __sparkyConstraintHandle: (() => any) | null | undefined;
  var ocamlBackendBridge: any;
  var sparkyModuleCache: any;
  var __sparkyWasm: any;
  var __sparkyInstance: any;
}

export {};