
let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
let wasm;
const { TextDecoder, TextEncoder } = require(`util`);

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_export_0(addHeapObject(e));
    }
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

module.exports.main = function() {
    wasm.main();
};

let stack_pointer = 128;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
 * @param {string} mode
 * @returns {WasmStateContext}
 */
module.exports.createExplicitStateContext = function(mode) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        wasm.createExplicitStateContext(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return WasmStateContext.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

const BatchResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchresult_free(ptr >>> 0, 1));
/**
 * Batch operation result
 */
class BatchResult {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchresult_free(ptr, 0);
    }
    /**
     * @returns {Array<any>}
     */
    get results() {
        const ret = wasm.batchresult_results(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {number}
     */
    get processing_time_ms() {
        const ret = wasm.batchresult_processing_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get operation_count() {
        const ret = wasm.batchresult_operation_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {Array<any>} results
     * @param {number} processing_time_ms
     * @param {number} operation_count
     */
    constructor(results, processing_time_ms, operation_count) {
        const ret = wasm.batchresult_new(addHeapObject(results), processing_time_ms, operation_count);
        this.__wbg_ptr = ret >>> 0;
        BatchResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
module.exports.BatchResult = BatchResult;

const CircuitResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_circuitresult_free(ptr >>> 0, 1));
/**
 * Circuit compilation result
 */
class CircuitResult {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CircuitResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_circuitresult_free(ptr, 0);
    }
    /**
     * @returns {any}
     */
    get constraint_system() {
        const ret = wasm.circuitresult_constraint_system(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {number}
     */
    get num_constraints() {
        const ret = wasm.batchresult_operation_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get num_variables() {
        const ret = wasm.circuitresult_num_variables(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get compilation_time_ms() {
        const ret = wasm.batchresult_processing_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {any} constraint_system
     * @param {number} num_constraints
     * @param {number} num_variables
     * @param {number} compilation_time_ms
     */
    constructor(constraint_system, num_constraints, num_variables, compilation_time_ms) {
        const ret = wasm.circuitresult_new(addHeapObject(constraint_system), num_constraints, num_variables, compilation_time_ms);
        this.__wbg_ptr = ret >>> 0;
        CircuitResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
module.exports.CircuitResult = CircuitResult;

const ConstraintFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_constraint_free(ptr >>> 0, 1));
/**
 * Constraint representation for JavaScript
 */
class Constraint {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Constraint.prototype);
        obj.__wbg_ptr = ptr;
        ConstraintFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ConstraintFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_constraint_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.constraint_type(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    get left() {
        const ret = wasm.constraint_left(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {any}
     */
    get right() {
        const ret = wasm.constraint_right(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {any}
     */
    get output() {
        const ret = wasm.constraint_output(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {string | undefined}
     */
    get annotation() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.constraint_annotation(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            let v1;
            if (r0 !== 0) {
                v1 = getStringFromWasm0(r0, r1).slice();
                wasm.__wbindgen_export_1(r0, r1 * 1, 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {string} constraint_type
     * @param {any} left
     * @param {any} right
     * @param {any} output
     * @param {string | null} [annotation]
     */
    constructor(constraint_type, left, right, output, annotation) {
        const ptr0 = passStringToWasm0(constraint_type, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(annotation) ? 0 : passStringToWasm0(annotation, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.constraint_new(ptr0, len0, addHeapObject(left), addHeapObject(right), addHeapObject(output), ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        ConstraintFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create an equality constraint
     * @param {any} left
     * @param {any} right
     * @param {string | null} [annotation]
     * @returns {Constraint}
     */
    static equality(left, right, annotation) {
        var ptr0 = isLikeNone(annotation) ? 0 : passStringToWasm0(annotation, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.constraint_equality(addHeapObject(left), addHeapObject(right), ptr0, len0);
        return Constraint.__wrap(ret);
    }
    /**
     * Create a multiplication constraint
     * @param {any} left
     * @param {any} right
     * @param {any} output
     * @param {string | null} [annotation]
     * @returns {Constraint}
     */
    static multiplication(left, right, output, annotation) {
        var ptr0 = isLikeNone(annotation) ? 0 : passStringToWasm0(annotation, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.constraint_multiplication(addHeapObject(left), addHeapObject(right), addHeapObject(output), ptr0, len0);
        return Constraint.__wrap(ret);
    }
    /**
     * Create a boolean constraint
     * @param {any} value
     * @param {string | null} [annotation]
     * @returns {Constraint}
     */
    static boolean(value, annotation) {
        var ptr0 = isLikeNone(annotation) ? 0 : passStringToWasm0(annotation, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.constraint_boolean(addHeapObject(value), ptr0, len0);
        return Constraint.__wrap(ret);
    }
}
module.exports.Constraint = Constraint;

const ECPointFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ecpoint_free(ptr >>> 0, 1));
/**
 * Elliptic curve point representation
 */
class ECPoint {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ECPoint.prototype);
        obj.__wbg_ptr = ptr;
        ECPointFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ECPointFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ecpoint_free(ptr, 0);
    }
    /**
     * @returns {any}
     */
    get x() {
        const ret = wasm.ecpoint_x(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {any}
     */
    get y() {
        const ret = wasm.ecpoint_y(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {boolean}
     */
    get is_infinity() {
        const ret = wasm.ecpoint_is_infinity(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {any} x
     * @param {any} y
     * @param {boolean} is_infinity
     */
    constructor(x, y, is_infinity) {
        const ret = wasm.ecpoint_new(addHeapObject(x), addHeapObject(y), is_infinity);
        this.__wbg_ptr = ret >>> 0;
        ECPointFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create a point at infinity
     * @returns {ECPoint}
     */
    static infinity() {
        const ret = wasm.ecpoint_infinity();
        return ECPoint.__wrap(ret);
    }
    /**
     * Create a finite point
     * @param {any} x
     * @param {any} y
     * @returns {ECPoint}
     */
    static finite(x, y) {
        const ret = wasm.ecpoint_finite(addHeapObject(x), addHeapObject(y));
        return ECPoint.__wrap(ret);
    }
}
module.exports.ECPoint = ECPoint;

const FieldVarFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_fieldvar_free(ptr >>> 0, 1));
/**
 * Field variable representation for JavaScript
 */
class FieldVar {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(FieldVar.prototype);
        obj.__wbg_ptr = ptr;
        FieldVarFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FieldVarFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fieldvar_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.fieldvar_type(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    get value() {
        const ret = wasm.fieldvar_value(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {number | undefined}
     */
    get index() {
        const ret = wasm.fieldvar_index(this.__wbg_ptr);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {string} var_type
     * @param {any} value
     * @param {number | null} [index]
     */
    constructor(var_type, value, index) {
        const ptr0 = passStringToWasm0(var_type, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.fieldvar_new(ptr0, len0, addHeapObject(value), isLikeNone(index) ? 0x100000001 : (index) >>> 0);
        this.__wbg_ptr = ret >>> 0;
        FieldVarFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create a constant field variable
     * @param {any} value
     * @returns {FieldVar}
     */
    static constant(value) {
        const ret = wasm.fieldvar_constant(addHeapObject(value));
        return FieldVar.__wrap(ret);
    }
    /**
     * Create a variable field variable
     * @param {number} index
     * @param {any} value
     * @returns {FieldVar}
     */
    static variable(index, value) {
        const ret = wasm.fieldvar_variable(index, addHeapObject(value));
        return FieldVar.__wrap(ret);
    }
    /**
     * Create a linear combination field variable
     * @param {any} _coeffs
     * @param {any} value
     * @returns {FieldVar}
     */
    static linearCombination(_coeffs, value) {
        const ret = wasm.fieldvar_linearCombination(addHeapObject(_coeffs), addHeapObject(value));
        return FieldVar.__wrap(ret);
    }
}
module.exports.FieldVar = FieldVar;

const MemoryStatsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_memorystats_free(ptr >>> 0, 1));
/**
 * Memory usage statistics
 */
class MemoryStats {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MemoryStatsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_memorystats_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get total_allocated_kb() {
        const ret = wasm.memorystats_total_allocated_kb(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get current_usage_kb() {
        const ret = wasm.memorystats_current_usage_kb(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get peak_usage_kb() {
        const ret = wasm.memorystats_peak_usage_kb(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get constraint_count() {
        const ret = wasm.memorystats_constraint_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get variable_count() {
        const ret = wasm.batchresult_operation_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} total_allocated_kb
     * @param {number} current_usage_kb
     * @param {number} peak_usage_kb
     * @param {number} constraint_count
     * @param {number} variable_count
     */
    constructor(total_allocated_kb, current_usage_kb, peak_usage_kb, constraint_count, variable_count) {
        const ret = wasm.memorystats_new(total_allocated_kb, current_usage_kb, peak_usage_kb, constraint_count, variable_count);
        this.__wbg_ptr = ret >>> 0;
        MemoryStatsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
module.exports.MemoryStats = MemoryStats;

const ModeHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_modehandle_free(ptr >>> 0, 1));

class ModeHandle {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ModeHandle.prototype);
        obj.__wbg_ptr = ptr;
        ModeHandleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ModeHandleFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_modehandle_free(ptr, 0);
    }
    /**
     * Exit the mode (called explicitly or automatically on drop)
     */
    exit() {
        const ptr = this.__destroy_into_raw();
        wasm.modehandle_exit(ptr);
    }
}
module.exports.ModeHandle = ModeHandle;

const OptimizationHintsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_optimizationhints_free(ptr >>> 0, 1));
/**
 * WASM optimization hints
 */
class OptimizationHints {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OptimizationHintsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_optimizationhints_free(ptr, 0);
    }
    /**
     * Hint that a function is hot and should be optimized
     * @param {string} func_name
     */
    static markHot(func_name) {
        const ptr0 = passStringToWasm0(func_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        wasm.optimizationhints_markHot(ptr0, len0);
    }
    /**
     * Hint that memory will be accessed sequentially
     * @param {number} start
     * @param {number} len
     */
    static prefetchSequential(start, len) {
        wasm.optimizationhints_prefetchSequential(start, len);
    }
    /**
     * Hint to optimize for size over speed
     */
    static optimizeForSize() {
        wasm.optimizationhints_optimizeForSize();
    }
}
module.exports.OptimizationHints = OptimizationHints;

const PerformanceMetricsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_performancemetrics_free(ptr >>> 0, 1));
/**
 * Performance metrics for operations
 */
class PerformanceMetrics {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PerformanceMetrics.prototype);
        obj.__wbg_ptr = ptr;
        PerformanceMetricsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PerformanceMetricsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_performancemetrics_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get operation_name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.performancemetrics_operation_name(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get total_time_ms() {
        const ret = wasm.batchresult_processing_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get average_time_ms() {
        const ret = wasm.performancemetrics_average_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get min_time_ms() {
        const ret = wasm.performancemetrics_min_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get max_time_ms() {
        const ret = wasm.performancemetrics_max_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get operation_count() {
        const ret = wasm.performancemetrics_operation_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {string} operation_name
     * @param {number} total_time_ms
     * @param {number} average_time_ms
     * @param {number} min_time_ms
     * @param {number} max_time_ms
     * @param {number} operation_count
     */
    constructor(operation_name, total_time_ms, average_time_ms, min_time_ms, max_time_ms, operation_count) {
        const ptr0 = passStringToWasm0(operation_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.performancemetrics_new(ptr0, len0, total_time_ms, average_time_ms, min_time_ms, max_time_ms, operation_count);
        this.__wbg_ptr = ret >>> 0;
        PerformanceMetricsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create metrics from a single timing
     * @param {string} operation_name
     * @param {number} time_ms
     * @returns {PerformanceMetrics}
     */
    static fromSingle(operation_name, time_ms) {
        const ptr0 = passStringToWasm0(operation_name, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.performancemetrics_fromSingle(ptr0, len0, time_ms);
        return PerformanceMetrics.__wrap(ret);
    }
}
module.exports.PerformanceMetrics = PerformanceMetrics;

const RangeConstraintFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rangeconstraint_free(ptr >>> 0, 1));
/**
 * Range check constraint representation
 */
class RangeConstraint {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RangeConstraint.prototype);
        obj.__wbg_ptr = ptr;
        RangeConstraintFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RangeConstraintFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rangeconstraint_free(ptr, 0);
    }
    /**
     * @returns {any}
     */
    get value() {
        const ret = wasm.rangeconstraint_value(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * @returns {number}
     */
    get num_bits() {
        const ret = wasm.batchresult_operation_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rangeconstraint_type(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {any} value
     * @param {number} num_bits
     * @param {string} constraint_type
     */
    constructor(value, num_bits, constraint_type) {
        const ptr0 = passStringToWasm0(constraint_type, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rangeconstraint_new(addHeapObject(value), num_bits, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        RangeConstraintFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create a standard range check
     * @param {any} value
     * @param {number} num_bits
     * @returns {RangeConstraint}
     */
    static standard(value, num_bits) {
        const ret = wasm.rangeconstraint_standard(addHeapObject(value), num_bits);
        return RangeConstraint.__wrap(ret);
    }
    /**
     * Create a compact range check
     * @param {any} value
     * @param {number} num_bits
     * @returns {RangeConstraint}
     */
    static compact(value, num_bits) {
        const ret = wasm.rangeconstraint_compact(addHeapObject(value), num_bits);
        return RangeConstraint.__wrap(ret);
    }
}
module.exports.RangeConstraint = RangeConstraint;

const RunStateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_runstate_free(ptr >>> 0, 1));
/**
 * OCaml snarky compatible run state object
 */
class RunState {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RunState.prototype);
        obj.__wbg_ptr = ptr;
        RunStateFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RunStateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_runstate_free(ptr, 0);
    }
    /**
     * @returns {RunState}
     */
    static new() {
        const ret = wasm.runstate_new();
        return RunState.__wrap(ret);
    }
    /**
     * Allocate a new variable (OCaml snarky: run.state.allocVar)
     * @returns {number}
     */
    allocVar() {
        const ret = wasm.runstate_allocVar(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Store a field element for a variable (OCaml snarky: run.state.storeFieldElt)
     * @param {number} var_index
     * @param {any} value
     */
    storeFieldElt(var_index, value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.runstate_storeFieldElt(retptr, this.__wbg_ptr, var_index, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get a variable's value (OCaml snarky: run.state.getVariableValue)
     * @param {number} var_index
     * @returns {any}
     */
    getVariableValue(var_index) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.runstate_getVariableValue(retptr, this.__wbg_ptr, var_index);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
module.exports.RunState = RunState;

const SnarkyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_snarky_free(ptr >>> 0, 1));
/**
 * Main Snarky object with all functionality consolidated
 */
class Snarky {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SnarkyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_snarky_free(ptr, 0);
    }
    /**
     * Creates a new Sparky WASM instance with consolidated architecture.
     *
     * This constructor initializes panic hooks for proper error handling in WASM
     * and sets up debug logging. The Sparky struct consolidates all modules
     * (field, gates, constraint system, run state) into a single object to
     * reduce WASM-bindgen overhead and eliminate redundant clones.
     */
    constructor() {
        const ret = wasm.snarky_new();
        this.__wbg_ptr = ret >>> 0;
        SnarkyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get the run module (for compatibility)
     * @returns {SnarkyRunCompat}
     */
    get run() {
        const ret = wasm.snarky_circuit(this.__wbg_ptr);
        return SnarkyRunCompat.__wrap(ret);
    }
    /**
     * Check if we're in prover mode
     * @returns {boolean}
     */
    runInProver() {
        const ret = wasm.snarky_runInProver(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Run code as prover (with witness generation enabled)
     * @param {Function} f
     * @returns {any}
     */
    runAsProver(f) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_runAsProver(retptr, this.__wbg_ptr, addBorrowedObject(f));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * Check if we're in a prover block
     * @returns {boolean}
     */
    runInProverBlock() {
        const ret = wasm.snarky_runInProver(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Control constraint evaluation
     * @param {boolean} enabled
     */
    runSetEvalConstraints(enabled) {
        wasm.snarky_runSetEvalConstraints(this.__wbg_ptr, enabled);
    }
    /**
     * Switch to constraint generation mode
     */
    runConstraintMode() {
        wasm.snarky_runConstraintMode(this.__wbg_ptr);
    }
    /**
     * Switch to witness generation mode
     */
    runWitnessMode() {
        wasm.snarky_runWitnessMode(this.__wbg_ptr);
    }
    /**
     * Reset the run state
     */
    runReset() {
        wasm.snarky_runReset(this.__wbg_ptr);
    }
    /**
     * Get the state object for OCaml snarky compatibility
     * @returns {RunState}
     */
    get runState() {
        const ret = wasm.snarky_circuit(this.__wbg_ptr);
        return RunState.__wrap(ret);
    }
    /**
     * Enter constraint system mode and return exit handle
     * @returns {ModeHandle}
     */
    runEnterConstraintSystem() {
        const ret = wasm.snarky_runEnterConstraintSystem(this.__wbg_ptr);
        return ModeHandle.__wrap(ret);
    }
    /**
     * Enter witness generation mode and return exit handle
     * @returns {ModeHandle}
     */
    runEnterGenerateWitness() {
        const ret = wasm.snarky_runEnterGenerateWitness(this.__wbg_ptr);
        return ModeHandle.__wrap(ret);
    }
    /**
     * Enter prover mode and return exit handle
     * @param {number} size
     * @returns {ModeHandle}
     */
    runEnterAsProver(size) {
        const ret = wasm.snarky_runEnterAsProver(this.__wbg_ptr, size);
        return ModeHandle.__wrap(ret);
    }
    /**
     * Get the constraint system module (for compatibility)
     * @returns {SnarkyConstraintSystemCompat}
     */
    get constraintSystem() {
        const ret = wasm.snarky_circuit(this.__wbg_ptr);
        return SnarkyConstraintSystemCompat.__wrap(ret);
    }
    /**
     * Get number of rows
     * @param {any} _system
     * @returns {number}
     */
    constraintSystemRows(_system) {
        const ret = wasm.snarky_constraintSystemRows(this.__wbg_ptr, addHeapObject(_system));
        return ret >>> 0;
    }
    /**
     * Get digest
     * @param {any} _system
     * @returns {string}
     */
    constraintSystemDigest(_system) {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_constraintSystemDigest(retptr, this.__wbg_ptr, addHeapObject(_system));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Convert to JSON (Kimchi format for o1js compatibility)
     * @param {any} _system
     * @returns {any}
     */
    constraintSystemToJson(_system) {
        const ret = wasm.snarky_constraintSystemToJson(this.__wbg_ptr, addHeapObject(_system));
        return takeObject(ret);
    }
    /**
     * Get the field module (for compatibility)
     * @returns {SnarkyFieldCompat}
     */
    get field() {
        const ret = wasm.snarky_circuit(this.__wbg_ptr);
        return SnarkyFieldCompat.__wrap(ret);
    }
    /**
     * Assert two fields are equal
     * @param {any} x
     * @param {any} y
     */
    fieldAssertEqual(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertEqual(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Assert multiplication
     * @param {any} x
     * @param {any} y
     * @param {any} z
     */
    fieldAssertMul(x, y, z) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertMul(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y), addHeapObject(z));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Assert squaring
     * @param {any} x
     * @param {any} y
     */
    fieldAssertSquare(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertSquare(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Assert boolean
     * @param {any} x
     */
    fieldAssertBoolean(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertBoolean(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Read variable value
     * @param {any} x
     * @returns {any}
     */
    fieldReadVar(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldReadVar(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a new witness variable
     * @param {Function | null} [compute]
     * @returns {any}
     */
    fieldExists(compute) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldExists(retptr, this.__wbg_ptr, isLikeNone(compute) ? 0 : addHeapObject(compute));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a constant
     * @param {any} value
     * @returns {any}
     */
    fieldConstant(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldConstant(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Add two field elements
     * @param {any} x
     * @param {any} y
     * @returns {any}
     */
    fieldAdd(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAdd(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Scale a field element
     * @param {any} scalar
     * @param {any} x
     * @returns {any}
     */
    fieldScale(scalar, x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldScale(retptr, this.__wbg_ptr, addHeapObject(scalar), addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Multiply two field elements
     * @param {any} x
     * @param {any} y
     * @returns {any}
     */
    fieldMul(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldMul(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Subtract two field elements
     * @param {any} x
     * @param {any} y
     * @returns {any}
     */
    fieldSub(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldSub(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Square a field element
     * @param {any} x
     * @returns {any}
     */
    fieldSquare(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldSquare(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Compute field inverse
     * @param {any} x
     * @returns {any}
     */
    fieldInv(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldInv(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get the gates module (for compatibility)
     * @returns {SnarkyGatesCompat}
     */
    get gates() {
        const ret = wasm.snarky_circuit(this.__wbg_ptr);
        return SnarkyGatesCompat.__wrap(ret);
    }
    /**
     * Zero gate
     * @param {any} a
     * @param {any} b
     * @param {any} c
     */
    gatesZero(a, b, c) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesZero(retptr, this.__wbg_ptr, addHeapObject(a), addHeapObject(b), addHeapObject(c));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Generic gate
     * @param {number} a_left
     * @param {any} a
     * @param {number} b_left
     * @param {any} b
     * @param {number} c_left
     * @param {any} c
     * @param {number} a_right
     * @param {number} b_right
     */
    gatesGeneric(a_left, a, b_left, b, c_left, c, a_right, b_right) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesGeneric(retptr, this.__wbg_ptr, a_left, addHeapObject(a), b_left, addHeapObject(b), c_left, addHeapObject(c), a_right, b_right);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * EC point addition: P1 + P2 = P3
     * @param {any} p1
     * @param {any} p2
     * @returns {any}
     */
    gatesEcAdd(p1, p2) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesEcAdd(retptr, this.__wbg_ptr, addHeapObject(p1), addHeapObject(p2));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * EC point doubling: 2P = P + P
     * @param {any} p
     * @returns {any}
     */
    gatesEcDouble(p) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesEcDouble(retptr, this.__wbg_ptr, addHeapObject(p));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * EC scalar multiplication: k * P
     * @param {any} p
     * @param {any} scalar_bits
     * @returns {any}
     */
    gatesEcScalarMult(p, scalar_bits) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesEcScalarMult(retptr, this.__wbg_ptr, addHeapObject(p), addHeapObject(scalar_bits));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Range check 64-bit value
     * @param {any} value
     */
    gatesRangeCheck64(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck64(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Range check 32-bit value
     * @param {any} value
     */
    gatesRangeCheck32(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck32(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Range check 16-bit value
     * @param {any} value
     */
    gatesRangeCheck16(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck16(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Range check n-bit value
     * @param {any} value
     * @param {number} bits
     */
    gatesRangeCheckN(value, bits) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheckN(retptr, this.__wbg_ptr, addHeapObject(value), bits);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Range check that a value is exactly 0
     * @param {any} value
     */
    gatesRangeCheck0(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck0(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Range check implementation for complex multi-variable constraints (range_check1 gate)
     * @param {any} v2
     * @param {any} v12
     * @param {any} v2c0
     * @param {any} v2p0
     * @param {any} v2p1
     * @param {any} v2p2
     * @param {any} v2p3
     * @param {any} v2c1
     * @param {any} v2c2
     * @param {any} v2c3
     * @param {any} v2c4
     * @param {any} v2c5
     * @param {any} v2c6
     * @param {any} v2c7
     * @param {any} v2c8
     * @param {any} v2c9
     * @param {any} v2c10
     * @param {any} v2c11
     * @param {any} v0p0
     * @param {any} v0p1
     * @param {any} v1p0
     * @param {any} v1p1
     * @param {any} v2c12
     * @param {any} v2c13
     * @param {any} v2c14
     * @param {any} v2c15
     * @param {any} v2c16
     * @param {any} v2c17
     * @param {any} v2c18
     * @param {any} v2c19
     */
    gatesRangeCheck1(v2, v12, v2c0, v2p0, v2p1, v2p2, v2p3, v2c1, v2c2, v2c3, v2c4, v2c5, v2c6, v2c7, v2c8, v2c9, v2c10, v2c11, v0p0, v0p1, v1p0, v1p1, v2c12, v2c13, v2c14, v2c15, v2c16, v2c17, v2c18, v2c19) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck1(retptr, this.__wbg_ptr, addHeapObject(v2), addHeapObject(v12), addHeapObject(v2c0), addHeapObject(v2p0), addHeapObject(v2p1), addHeapObject(v2p2), addHeapObject(v2p3), addHeapObject(v2c1), addHeapObject(v2c2), addHeapObject(v2c3), addHeapObject(v2c4), addHeapObject(v2c5), addHeapObject(v2c6), addHeapObject(v2c7), addHeapObject(v2c8), addHeapObject(v2c9), addHeapObject(v2c10), addHeapObject(v2c11), addHeapObject(v0p0), addHeapObject(v0p1), addHeapObject(v1p0), addHeapObject(v1p1), addHeapObject(v2c12), addHeapObject(v2c13), addHeapObject(v2c14), addHeapObject(v2c15), addHeapObject(v2c16), addHeapObject(v2c17), addHeapObject(v2c18), addHeapObject(v2c19));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Raw gate interface matching OCaml snarky
     * @param {number} kind
     * @param {any} values
     * @param {any} coefficients
     */
    gatesRaw(kind, values, coefficients) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRaw(retptr, this.__wbg_ptr, kind, addHeapObject(values), addHeapObject(coefficients));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a foreign field element from a hex string
     * @param {any} hex_str
     * @returns {any}
     */
    foreignFieldFromHex(hex_str) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldFromHex(retptr, this.__wbg_ptr, addHeapObject(hex_str));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a foreign field element from a decimal string
     * @param {any} decimal_str
     * @returns {any}
     */
    foreignFieldFromDecimal(decimal_str) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldFromDecimal(retptr, this.__wbg_ptr, addHeapObject(decimal_str));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Range check a foreign field element
     * @param {any} foreign_field
     */
    foreignFieldRangeCheck(foreign_field) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldRangeCheck(retptr, this.__wbg_ptr, addHeapObject(foreign_field));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Foreign field addition
     * @param {any} left
     * @param {any} right
     * @param {any} overflow
     * @param {any} carry
     * @param {number} modulus_limb0
     * @param {number} modulus_limb1
     * @param {number} modulus_limb2
     * @param {number} sign
     */
    foreignFieldAdd(left, right, overflow, carry, modulus_limb0, modulus_limb1, modulus_limb2, sign) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldAdd(retptr, this.__wbg_ptr, addHeapObject(left), addHeapObject(right), addHeapObject(overflow), addHeapObject(carry), modulus_limb0, modulus_limb1, modulus_limb2, sign);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Foreign field multiplication
     * @param {any} left
     * @param {any} right
     * @param {any} quotient_limb0
     * @param {any} quotient_limb1
     * @param {any} remainder
     * @param {any} carry0
     * @param {any} carry1_bounds_limb0
     * @param {any} carry1_bounds_limb1
     * @param {any} carry1_bounds_limb2
     * @param {any} carry1_12
     * @param {any} product1_lo_bounds
     * @param {any} quotient_hi_bound_limb0
     * @param {any} quotient_hi_bound_limb1
     * @param {any} quotient_hi_bound_limb2
     * @param {any} quotient_hi_bound_limb3
     * @param {number} product_hi_shift
     * @param {number} modulus_limb0
     * @param {number} modulus_limb1
     * @param {number} modulus_limb2
     */
    foreignFieldMul(left, right, quotient_limb0, quotient_limb1, remainder, carry0, carry1_bounds_limb0, carry1_bounds_limb1, carry1_bounds_limb2, carry1_12, product1_lo_bounds, quotient_hi_bound_limb0, quotient_hi_bound_limb1, quotient_hi_bound_limb2, quotient_hi_bound_limb3, product_hi_shift, modulus_limb0, modulus_limb1, modulus_limb2) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldMul(retptr, this.__wbg_ptr, addHeapObject(left), addHeapObject(right), addHeapObject(quotient_limb0), addHeapObject(quotient_limb1), addHeapObject(remainder), addHeapObject(carry0), addHeapObject(carry1_bounds_limb0), addHeapObject(carry1_bounds_limb1), addHeapObject(carry1_bounds_limb2), addHeapObject(carry1_12), addHeapObject(product1_lo_bounds), addHeapObject(quotient_hi_bound_limb0), addHeapObject(quotient_hi_bound_limb1), addHeapObject(quotient_hi_bound_limb2), addHeapObject(quotient_hi_bound_limb3), product_hi_shift, modulus_limb0, modulus_limb1, modulus_limb2);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Test secp256k1 field operations
     */
    testSecp256k1Field() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_testSecp256k1Field(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get the circuit module (for compatibility)
     * @returns {SnarkyCircuitCompat}
     */
    get circuit() {
        const ret = wasm.snarky_circuit(this.__wbg_ptr);
        return SnarkyCircuitCompat.__wrap(ret);
    }
    /**
     * Create witness variables (at top level like OCaml Snarky)
     * @param {number} size
     * @param {Function | null} [compute]
     * @returns {Array<any>}
     */
    exists(size, compute) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_exists(retptr, this.__wbg_ptr, size, isLikeNone(compute) ? 0 : addHeapObject(compute));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a single witness variable (at top level like OCaml Snarky)
     * @param {Function | null} [compute]
     * @returns {any}
     */
    existsOne(compute) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_existsOne(retptr, this.__wbg_ptr, isLikeNone(compute) ? 0 : addHeapObject(compute));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
module.exports.Snarky = Snarky;

const SnarkyCircuitCompatFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_snarkycircuitcompat_free(ptr >>> 0, 1));

class SnarkyCircuitCompat {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SnarkyCircuitCompat.prototype);
        obj.__wbg_ptr = ptr;
        SnarkyCircuitCompatFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SnarkyCircuitCompatFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_snarkycircuitcompat_free(ptr, 0);
    }
}
module.exports.SnarkyCircuitCompat = SnarkyCircuitCompat;

const SnarkyConstraintSystemCompatFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_snarkyconstraintsystemcompat_free(ptr >>> 0, 1));

class SnarkyConstraintSystemCompat {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SnarkyConstraintSystemCompat.prototype);
        obj.__wbg_ptr = ptr;
        SnarkyConstraintSystemCompatFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SnarkyConstraintSystemCompatFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_snarkyconstraintsystemcompat_free(ptr, 0);
    }
    /**
     * @param {any} _system
     * @returns {number}
     */
    rows(_system) {
        const ret = wasm.snarky_constraintSystemRows(this.__wbg_ptr, addHeapObject(_system));
        return ret >>> 0;
    }
    /**
     * @param {any} _system
     * @returns {string}
     */
    digest(_system) {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_constraintSystemDigest(retptr, this.__wbg_ptr, addHeapObject(_system));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {any} _system
     * @returns {any}
     */
    toJson(_system) {
        const ret = wasm.snarkyconstraintsystemcompat_toJson(this.__wbg_ptr, addHeapObject(_system));
        return takeObject(ret);
    }
}
module.exports.SnarkyConstraintSystemCompat = SnarkyConstraintSystemCompat;

const SnarkyFieldCompatFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_snarkyfieldcompat_free(ptr >>> 0, 1));

class SnarkyFieldCompat {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SnarkyFieldCompat.prototype);
        obj.__wbg_ptr = ptr;
        SnarkyFieldCompatFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SnarkyFieldCompatFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_snarkyfieldcompat_free(ptr, 0);
    }
    /**
     * @param {any} x
     * @param {any} y
     */
    assertEqual(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertEqual(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @param {any} y
     * @param {any} z
     */
    assertMul(x, y, z) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertMul(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y), addHeapObject(z));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @param {any} y
     */
    assertSquare(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertSquare(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     */
    assertBoolean(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAssertBoolean(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @returns {any}
     */
    readVar(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldReadVar(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {Function | null} [compute]
     * @returns {any}
     */
    exists(compute) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldExists(retptr, this.__wbg_ptr, isLikeNone(compute) ? 0 : addHeapObject(compute));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} value
     * @returns {any}
     */
    constant(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldConstant(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @param {any} y
     * @returns {any}
     */
    add(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldAdd(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} scalar
     * @param {any} x
     * @returns {any}
     */
    scale(scalar, x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldScale(retptr, this.__wbg_ptr, addHeapObject(scalar), addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @param {any} y
     * @returns {any}
     */
    mul(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldMul(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @param {any} y
     * @returns {any}
     */
    sub(x, y) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldSub(retptr, this.__wbg_ptr, addHeapObject(x), addHeapObject(y));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @returns {any}
     */
    square(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldSquare(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} x
     * @returns {any}
     */
    inv(x) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_fieldInv(retptr, this.__wbg_ptr, addHeapObject(x));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
module.exports.SnarkyFieldCompat = SnarkyFieldCompat;

const SnarkyGatesCompatFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_snarkygatescompat_free(ptr >>> 0, 1));

class SnarkyGatesCompat {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SnarkyGatesCompat.prototype);
        obj.__wbg_ptr = ptr;
        SnarkyGatesCompatFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SnarkyGatesCompatFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_snarkygatescompat_free(ptr, 0);
    }
    /**
     * @param {any} a
     * @param {any} b
     * @param {any} c
     */
    zero(a, b, c) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesZero(retptr, this.__wbg_ptr, addHeapObject(a), addHeapObject(b), addHeapObject(c));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {number} a_left
     * @param {any} a
     * @param {number} b_left
     * @param {any} b
     * @param {number} c_left
     * @param {any} c
     * @param {number} a_right
     * @param {number} b_right
     */
    generic(a_left, a, b_left, b, c_left, c, a_right, b_right) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesGeneric(retptr, this.__wbg_ptr, a_left, addHeapObject(a), b_left, addHeapObject(b), c_left, addHeapObject(c), a_right, b_right);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} p1
     * @param {any} p2
     * @returns {any}
     */
    ecAdd(p1, p2) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesEcAdd(retptr, this.__wbg_ptr, addHeapObject(p1), addHeapObject(p2));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} p
     * @returns {any}
     */
    ecDouble(p) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesEcDouble(retptr, this.__wbg_ptr, addHeapObject(p));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} p
     * @param {any} scalar_bits
     * @returns {any}
     */
    ecScalarMult(p, scalar_bits) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesEcScalarMult(retptr, this.__wbg_ptr, addHeapObject(p), addHeapObject(scalar_bits));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} value
     */
    rangeCheck64(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck64(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} value
     */
    rangeCheck32(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck32(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} value
     */
    rangeCheck16(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck16(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} value
     * @param {number} bits
     */
    rangeCheckN(value, bits) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheckN(retptr, this.__wbg_ptr, addHeapObject(value), bits);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} value
     */
    rangeCheck0(value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck0(retptr, this.__wbg_ptr, addHeapObject(value));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} v2
     * @param {any} v12
     * @param {any} v2c0
     * @param {any} v2p0
     * @param {any} v2p1
     * @param {any} v2p2
     * @param {any} v2p3
     * @param {any} v2c1
     * @param {any} v2c2
     * @param {any} v2c3
     * @param {any} v2c4
     * @param {any} v2c5
     * @param {any} v2c6
     * @param {any} v2c7
     * @param {any} v2c8
     * @param {any} v2c9
     * @param {any} v2c10
     * @param {any} v2c11
     * @param {any} v0p0
     * @param {any} v0p1
     * @param {any} v1p0
     * @param {any} v1p1
     * @param {any} v2c12
     * @param {any} v2c13
     * @param {any} v2c14
     * @param {any} v2c15
     * @param {any} v2c16
     * @param {any} v2c17
     * @param {any} v2c18
     * @param {any} v2c19
     */
    rangeCheck1(v2, v12, v2c0, v2p0, v2p1, v2p2, v2p3, v2c1, v2c2, v2c3, v2c4, v2c5, v2c6, v2c7, v2c8, v2c9, v2c10, v2c11, v0p0, v0p1, v1p0, v1p1, v2c12, v2c13, v2c14, v2c15, v2c16, v2c17, v2c18, v2c19) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRangeCheck1(retptr, this.__wbg_ptr, addHeapObject(v2), addHeapObject(v12), addHeapObject(v2c0), addHeapObject(v2p0), addHeapObject(v2p1), addHeapObject(v2p2), addHeapObject(v2p3), addHeapObject(v2c1), addHeapObject(v2c2), addHeapObject(v2c3), addHeapObject(v2c4), addHeapObject(v2c5), addHeapObject(v2c6), addHeapObject(v2c7), addHeapObject(v2c8), addHeapObject(v2c9), addHeapObject(v2c10), addHeapObject(v2c11), addHeapObject(v0p0), addHeapObject(v0p1), addHeapObject(v1p0), addHeapObject(v1p1), addHeapObject(v2c12), addHeapObject(v2c13), addHeapObject(v2c14), addHeapObject(v2c15), addHeapObject(v2c16), addHeapObject(v2c17), addHeapObject(v2c18), addHeapObject(v2c19));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {number} kind
     * @param {any} values
     * @param {any} coefficients
     */
    raw(kind, values, coefficients) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_gatesRaw(retptr, this.__wbg_ptr, kind, addHeapObject(values), addHeapObject(coefficients));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} hex_str
     * @returns {any}
     */
    foreignFieldFromHex(hex_str) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldFromHex(retptr, this.__wbg_ptr, addHeapObject(hex_str));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} decimal_str
     * @returns {any}
     */
    foreignFieldFromDecimal(decimal_str) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldFromDecimal(retptr, this.__wbg_ptr, addHeapObject(decimal_str));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} foreign_field
     */
    foreignFieldRangeCheck(foreign_field) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldRangeCheck(retptr, this.__wbg_ptr, addHeapObject(foreign_field));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} left
     * @param {any} right
     * @param {any} overflow
     * @param {any} carry
     * @param {number} modulus_limb0
     * @param {number} modulus_limb1
     * @param {number} modulus_limb2
     * @param {number} sign
     */
    foreignFieldAdd(left, right, overflow, carry, modulus_limb0, modulus_limb1, modulus_limb2, sign) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldAdd(retptr, this.__wbg_ptr, addHeapObject(left), addHeapObject(right), addHeapObject(overflow), addHeapObject(carry), modulus_limb0, modulus_limb1, modulus_limb2, sign);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {any} left
     * @param {any} right
     * @param {any} quotient_limb0
     * @param {any} quotient_limb1
     * @param {any} remainder
     * @param {any} carry0
     * @param {any} carry1_bounds_limb0
     * @param {any} carry1_bounds_limb1
     * @param {any} carry1_bounds_limb2
     * @param {any} carry1_12
     * @param {any} product1_lo_bounds
     * @param {any} quotient_hi_bound_limb0
     * @param {any} quotient_hi_bound_limb1
     * @param {any} quotient_hi_bound_limb2
     * @param {any} quotient_hi_bound_limb3
     * @param {number} product_hi_shift
     * @param {number} modulus_limb0
     * @param {number} modulus_limb1
     * @param {number} modulus_limb2
     */
    foreignFieldMul(left, right, quotient_limb0, quotient_limb1, remainder, carry0, carry1_bounds_limb0, carry1_bounds_limb1, carry1_bounds_limb2, carry1_12, product1_lo_bounds, quotient_hi_bound_limb0, quotient_hi_bound_limb1, quotient_hi_bound_limb2, quotient_hi_bound_limb3, product_hi_shift, modulus_limb0, modulus_limb1, modulus_limb2) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_foreignFieldMul(retptr, this.__wbg_ptr, addHeapObject(left), addHeapObject(right), addHeapObject(quotient_limb0), addHeapObject(quotient_limb1), addHeapObject(remainder), addHeapObject(carry0), addHeapObject(carry1_bounds_limb0), addHeapObject(carry1_bounds_limb1), addHeapObject(carry1_bounds_limb2), addHeapObject(carry1_12), addHeapObject(product1_lo_bounds), addHeapObject(quotient_hi_bound_limb0), addHeapObject(quotient_hi_bound_limb1), addHeapObject(quotient_hi_bound_limb2), addHeapObject(quotient_hi_bound_limb3), product_hi_shift, modulus_limb0, modulus_limb1, modulus_limb2);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    testSecp256k1Field() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_testSecp256k1Field(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
module.exports.SnarkyGatesCompat = SnarkyGatesCompat;

const SnarkyRunCompatFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_snarkyruncompat_free(ptr >>> 0, 1));

class SnarkyRunCompat {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SnarkyRunCompat.prototype);
        obj.__wbg_ptr = ptr;
        SnarkyRunCompatFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SnarkyRunCompatFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_snarkyruncompat_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get inProver() {
        const ret = wasm.snarky_runInProver(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {Function} f
     * @returns {any}
     */
    asProver(f) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_runAsProver(retptr, this.__wbg_ptr, addBorrowedObject(f));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
        }
    }
    /**
     * @returns {boolean}
     */
    get inProverBlock() {
        const ret = wasm.snarky_runInProver(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} enabled
     */
    setEvalConstraints(enabled) {
        wasm.snarky_runSetEvalConstraints(this.__wbg_ptr, enabled);
    }
    constraintMode() {
        wasm.snarky_runConstraintMode(this.__wbg_ptr);
    }
    witnessMode() {
        wasm.snarky_runWitnessMode(this.__wbg_ptr);
    }
    reset() {
        wasm.snarky_runReset(this.__wbg_ptr);
    }
    /**
     * @returns {RunState}
     */
    get state() {
        const ret = wasm.snarky_circuit(this.__wbg_ptr);
        return RunState.__wrap(ret);
    }
    /**
     * @returns {ModeHandle}
     */
    enterConstraintSystem() {
        const ret = wasm.snarky_runEnterConstraintSystem(this.__wbg_ptr);
        return ModeHandle.__wrap(ret);
    }
    /**
     * @returns {ModeHandle}
     */
    enterGenerateWitness() {
        const ret = wasm.snarky_runEnterGenerateWitness(this.__wbg_ptr);
        return ModeHandle.__wrap(ret);
    }
    /**
     * @param {number} size
     * @returns {ModeHandle}
     */
    enterAsProver(size) {
        const ret = wasm.snarky_runEnterAsProver(this.__wbg_ptr, size);
        return ModeHandle.__wrap(ret);
    }
    /**
     * Get the current constraint system
     * @returns {any}
     */
    getConstraintSystem() {
        const ret = wasm.snarkyruncompat_getConstraintSystem(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
     * Create witness variables (OCaml: Run.exists)
     * @param {number} size
     * @param {Function | null} [compute]
     * @returns {Array<any>}
     */
    exists(size, compute) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_exists(retptr, this.__wbg_ptr, size, isLikeNone(compute) ? 0 : addHeapObject(compute));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Create a single witness variable (OCaml: Run.exists_one)
     * @param {Function | null} [compute]
     * @returns {any}
     */
    existsOne(compute) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.snarky_existsOne(retptr, this.__wbg_ptr, isLikeNone(compute) ? 0 : addHeapObject(compute));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return takeObject(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
module.exports.SnarkyRunCompat = SnarkyRunCompat;

const WasmFeaturesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmfeatures_free(ptr >>> 0, 1));
/**
 * Check which WASM features are available in the current environment
 */
class WasmFeatures {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmFeaturesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfeatures_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get bulk_memory() {
        const ret = wasm.__wbg_get_wasmfeatures_bulk_memory(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set bulk_memory(arg0) {
        wasm.__wbg_set_wasmfeatures_bulk_memory(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get multi_value() {
        const ret = wasm.__wbg_get_wasmfeatures_multi_value(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set multi_value(arg0) {
        wasm.__wbg_set_wasmfeatures_multi_value(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get reference_types() {
        const ret = wasm.__wbg_get_wasmfeatures_reference_types(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set reference_types(arg0) {
        wasm.__wbg_set_wasmfeatures_reference_types(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get simd() {
        const ret = wasm.__wbg_get_wasmfeatures_simd(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set simd(arg0) {
        wasm.__wbg_set_wasmfeatures_simd(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get threads() {
        const ret = wasm.__wbg_get_wasmfeatures_threads(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set threads(arg0) {
        wasm.__wbg_set_wasmfeatures_threads(this.__wbg_ptr, arg0);
    }
    /**
     * Detect available WASM features at runtime
     */
    constructor() {
        const ret = wasm.wasmfeatures_detect();
        this.__wbg_ptr = ret >>> 0;
        WasmFeaturesFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
module.exports.WasmFeatures = WasmFeatures;

const WasmMigrationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmmigration_free(ptr >>> 0, 1));
/**
 * Migration utilities for the WASM interface
 */
class WasmMigration {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmMigrationFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmmigration_free(ptr, 0);
    }
    /**
     * Initialize global context for migration purposes
     * WARNING: This is unsafe and should only be used during migration
     * @param {string} mode
     */
    static initGlobalContext(mode) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmmigration_initGlobalContext(retptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Reset the global context
     * WARNING: This is unsafe and should only be used for testing
     */
    static resetGlobalContext() {
        wasm.wasmmigration_resetGlobalContext();
    }
    /**
     * Drop the global context
     * WARNING: This is unsafe and should only be called during shutdown
     */
    static dropGlobalContext() {
        wasm.wasmmigration_dropGlobalContext();
    }
}
module.exports.WasmMigration = WasmMigration;

const WasmStateContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmstatecontext_free(ptr >>> 0, 1));
/**
 * WASM-compatible wrapper for StateContext
 */
class WasmStateContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmStateContext.prototype);
        obj.__wbg_ptr = ptr;
        WasmStateContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmStateContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmstatecontext_free(ptr, 0);
    }
    /**
     * Create a new state context in constraint generation mode
     */
    constructor() {
        const ret = wasm.wasmstatecontext_new();
        this.__wbg_ptr = ret >>> 0;
        WasmStateContextFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create a new state context in constraint generation mode
     * @returns {WasmStateContext}
     */
    static newConstraintGeneration() {
        const ret = wasm.wasmstatecontext_new();
        return WasmStateContext.__wrap(ret);
    }
    /**
     * Create a new state context in witness generation mode
     * @returns {WasmStateContext}
     */
    static newWitnessGeneration() {
        const ret = wasm.wasmstatecontext_newWitnessGeneration();
        return WasmStateContext.__wrap(ret);
    }
    /**
     * Create a new state context in prover mode
     * @returns {WasmStateContext}
     */
    static newProver() {
        const ret = wasm.wasmstatecontext_newProver();
        return WasmStateContext.__wrap(ret);
    }
    /**
     * Get the current run mode (returns string for JS compatibility)
     * @returns {string}
     */
    getMode() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmstatecontext_getMode(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Set the run mode (accepts string for JS compatibility)
     * @param {string} mode
     */
    setMode(mode) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmstatecontext_setMode(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Reset the state to initial values
     */
    reset() {
        wasm.wasmstatecontext_reset(this.__wbg_ptr);
    }
    /**
     * Fork the context (create a new one with same mode)
     * @returns {WasmStateContext}
     */
    fork() {
        const ret = wasm.wasmstatecontext_fork(this.__wbg_ptr);
        return WasmStateContext.__wrap(ret);
    }
    /**
     * Fork the context with a different mode
     * @param {string} mode
     * @returns {WasmStateContext}
     */
    forkWithMode(mode) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmstatecontext_forkWithMode(retptr, this.__wbg_ptr, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            if (r2) {
                throw takeObject(r1);
            }
            return WasmStateContext.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Allocate a new variable
     * @returns {number}
     */
    allocVar() {
        const ret = wasm.wasmstatecontext_allocVar(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Set a variable's value (only works in witness/prover mode)
     * @param {number} var_id
     * @param {string} value
     */
    setVariableValue(var_id, value) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(value, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
            const len0 = WASM_VECTOR_LEN;
            wasm.wasmstatecontext_setVariableValue(retptr, this.__wbg_ptr, var_id, ptr0, len0);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * Get a variable's value (only works in witness/prover mode)
     * @param {number} var_id
     * @returns {string}
     */
    getVariableValue(var_id) {
        let deferred2_0;
        let deferred2_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmstatecontext_getVariableValue(retptr, this.__wbg_ptr, var_id);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr1 = r0;
            var len1 = r1;
            if (r3) {
                ptr1 = 0; len1 = 0;
                throw takeObject(r2);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Check if we should generate constraints
     * @returns {boolean}
     */
    shouldGenerateConstraints() {
        const ret = wasm.wasmstatecontext_shouldGenerateConstraints(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if we should compute witness values
     * @returns {boolean}
     */
    shouldComputeWitness() {
        const ret = wasm.wasmstatecontext_shouldComputeWitness(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if we're in constraint generation mode
     * @returns {boolean}
     */
    inConstraintMode() {
        const ret = wasm.wasmstatecontext_inConstraintMode(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if we're in witness generation mode
     * @returns {boolean}
     */
    inWitnessMode() {
        const ret = wasm.wasmstatecontext_inWitnessMode(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if we're in prover mode
     * @returns {boolean}
     */
    inProverMode() {
        const ret = wasm.wasmstatecontext_inProverMode(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get the number of constraints in the current system
     * @returns {number}
     */
    getConstraintCount() {
        const ret = wasm.wasmstatecontext_getConstraintCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the constraint system as JSON
     * @returns {string}
     */
    getConstraintSystemJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmstatecontext_getConstraintSystemJson(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            var ptr1 = r0;
            var len1 = r1;
            if (r3) {
                ptr1 = 0; len1 = 0;
                throw takeObject(r2);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export_1(deferred2_0, deferred2_1, 1);
        }
    }
}
module.exports.WasmStateContext = WasmStateContext;

module.exports.__wbg_call_672a4d21634d4a24 = function() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_debug_e17b51583ca6a632 = function(arg0, arg1, arg2, arg3) {
    console.debug(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
};

module.exports.__wbg_deleteProperty_96363d4a1d977c97 = function() { return handleError(function (arg0, arg1) {
    const ret = Reflect.deleteProperty(getObject(arg0), getObject(arg1));
    return ret;
}, arguments) };

module.exports.__wbg_error_524f506f44df1645 = function(arg0) {
    console.error(getObject(arg0));
};

module.exports.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_export_1(deferred0_0, deferred0_1, 1);
    }
};

module.exports.__wbg_error_80de38b3f7cc3c3c = function(arg0, arg1, arg2, arg3) {
    console.error(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
};

module.exports.__wbg_eval_e10dc02e9547f640 = function() { return handleError(function (arg0, arg1) {
    const ret = eval(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_from_2a5d3e218e67aa85 = function(arg0) {
    const ret = Array.from(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_get_67b2ba62fc30de12 = function() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(getObject(arg0), getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_get_b9b93047fe3cf45b = function(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
};

module.exports.__wbg_info_033d8b8a0838f1d3 = function(arg0, arg1, arg2, arg3) {
    console.info(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
};

module.exports.__wbg_instanceof_Object_7f2dcef8f78644a4 = function(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Object;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_isArray_a1eab7e0d067391b = function(arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
};

module.exports.__wbg_length_e2d2a49132c1b256 = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_log_c222819a41e063d3 = function(arg0) {
    console.log(getObject(arg0));
};

module.exports.__wbg_log_cad59bb680daec67 = function(arg0, arg1, arg2, arg3) {
    console.log(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
};

module.exports.__wbg_new_405e22f390576ce2 = function() {
    const ret = new Object();
    return addHeapObject(ret);
};

module.exports.__wbg_new_78feb108b6472713 = function() {
    const ret = new Array();
    return addHeapObject(ret);
};

module.exports.__wbg_new_8a6f238a6ece86ea = function() {
    const ret = new Error();
    return addHeapObject(ret);
};

module.exports.__wbg_newnoargs_105ed471475aaf50 = function(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_parse_def2e24ef1252aff = function() { return handleError(function (arg0, arg1) {
    const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_push_737cfc8c1432c2c6 = function(arg0, arg1) {
    const ret = getObject(arg0).push(getObject(arg1));
    return ret;
};

module.exports.__wbg_set_37837023f3d740e8 = function(arg0, arg1, arg2) {
    getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
};

module.exports.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
};

module.exports.__wbg_set_bb8cecf6a62b9f46 = function() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
    return ret;
}, arguments) };

module.exports.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

module.exports.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

module.exports.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

module.exports.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

module.exports.__wbg_warn_aaf1f4664a035bd6 = function(arg0, arg1, arg2, arg3) {
    console.warn(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
};

module.exports.__wbindgen_bigint_from_u64 = function(arg0) {
    const ret = BigInt.asUintN(64, arg0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_debug_string = function(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbindgen_error_new = function(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbindgen_is_array = function(arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
};

module.exports.__wbindgen_is_bigint = function(arg0) {
    const ret = typeof(getObject(arg0)) === 'bigint';
    return ret;
};

module.exports.__wbindgen_is_null = function(arg0) {
    const ret = getObject(arg0) === null;
    return ret;
};

module.exports.__wbindgen_is_object = function(arg0) {
    const val = getObject(arg0);
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

module.exports.__wbindgen_is_string = function(arg0) {
    const ret = typeof(getObject(arg0)) === 'string';
    return ret;
};

module.exports.__wbindgen_is_undefined = function(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

module.exports.__wbindgen_number_get = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
};

module.exports.__wbindgen_number_new = function(arg0) {
    const ret = arg0;
    return addHeapObject(ret);
};

module.exports.__wbindgen_object_clone_ref = function(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
};

module.exports.__wbindgen_string_get = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export_2, wasm.__wbindgen_export_3);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

const path = require('path').join(__dirname, 'sparky_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

wasm.__wbindgen_start();

