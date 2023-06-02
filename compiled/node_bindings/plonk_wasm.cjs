let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;

let { isMainThread, workerData } = require('worker_threads');

let env = {};
if (isMainThread) {
  env.memory = new WebAssembly.Memory({
    initial: 20,
    maximum: 65536,
    shared: true,
  });
} else {
  env.memory = workerData.memory;
}

imports['env'] = env;

let wasm;
const { TextDecoder, TextEncoder } = require(`util`);

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

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

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.buffer !== wasm.memory.buffer) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().slice(ptr, ptr + len));
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
    if (builtInMatches.length > 1) {
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

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
};

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length) >>> 0;
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len) >>> 0;

    const mem = getUint8Memory0();

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
        ptr = realloc(ptr, len, len = offset + arg.length * 3) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.buffer !== wasm.memory.buffer) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}
/**
* @param {string} name
*/
module.exports.greet = function(name) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.greet(ptr0, len0);
};

/**
* @param {string} s
*/
module.exports.console_log = function(s) {
    const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.console_log(ptr0, len0);
};

/**
* @returns {number}
*/
module.exports.create_zero_u32_ptr = function() {
    const ret = wasm.create_zero_u32_ptr();
    return ret;
};

/**
* @param {number} ptr
*/
module.exports.free_u32_ptr = function(ptr) {
    wasm.free_u32_ptr(ptr);
};

/**
* @param {number} ptr
* @param {number} arg
*/
module.exports.set_u32_ptr = function(ptr, arg) {
    wasm.set_u32_ptr(ptr, arg);
};

/**
* @param {number} ptr
* @returns {number}
*/
module.exports.wait_until_non_zero = function(ptr) {
    const ret = wasm.wait_until_non_zero(ptr);
    return ret >>> 0;
};

/**
* @returns {number}
*/
module.exports.caml_pasta_fp_size_in_bits = function() {
    const ret = wasm.caml_pasta_fp_size_in_bits();
    return ret;
};

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_size = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_size(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1) >>> 0;
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_add = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_add(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_sub = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_sub(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_negate = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_negate(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_mul = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_mul(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_div = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_div(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
module.exports.caml_pasta_fp_inv = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_inv(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        let v2;
        if (r0 !== 0) {
            v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_square = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_square(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {boolean}
*/
module.exports.caml_pasta_fp_is_square = function(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_is_square(ptr0, len0);
    return ret !== 0;
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
module.exports.caml_pasta_fp_sqrt = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_sqrt(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        let v2;
        if (r0 !== 0) {
            v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} i
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_of_int = function(i) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_of_int(retptr, i);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {string}
*/
module.exports.caml_pasta_fp_to_string = function(x) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_to_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1);
    }
};

/**
* @param {string} s
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_of_string = function(s) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_of_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        var r3 = getInt32Memory0()[retptr / 4 + 3];
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
*/
module.exports.caml_pasta_fp_print = function(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.caml_pasta_fp_print(ptr0, len0);
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
module.exports.caml_pasta_fp_compare = function(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_compare(ptr0, len0, ptr1, len1);
    return ret;
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {boolean}
*/
module.exports.caml_pasta_fp_equal = function(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_equal(ptr0, len0, ptr1, len1);
    return ret !== 0;
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_random = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_random(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} i
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_rng = function(i) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_rng(retptr, i);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_to_bigint = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_to_bigint(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_of_bigint = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_of_bigint(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        var r3 = getInt32Memory0()[retptr / 4 + 3];
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_two_adic_root_of_unity = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_two_adic_root_of_unity(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} log2_size
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_domain_generator = function(log2_size) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_domain_generator(retptr, log2_size);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_to_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_to_bytes(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_of_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_of_bytes(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_deep_copy = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_deep_copy(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {number}
*/
module.exports.caml_pasta_fq_size_in_bits = function() {
    const ret = wasm.caml_pasta_fp_size_in_bits();
    return ret;
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_size = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fq_size(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_add = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_add(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_sub = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_sub(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_negate = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_negate(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_mul = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_mul(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_div = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_div(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
module.exports.caml_pasta_fq_inv = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_inv(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        let v2;
        if (r0 !== 0) {
            v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_square = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_square(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {boolean}
*/
module.exports.caml_pasta_fq_is_square = function(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_is_square(ptr0, len0);
    return ret !== 0;
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
module.exports.caml_pasta_fq_sqrt = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_sqrt(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        let v2;
        if (r0 !== 0) {
            v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} i
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_of_int = function(i) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fq_of_int(retptr, i);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {string}
*/
module.exports.caml_pasta_fq_to_string = function(x) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_to_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1);
    }
};

/**
* @param {string} s
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_of_string = function(s) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_of_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        var r3 = getInt32Memory0()[retptr / 4 + 3];
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
*/
module.exports.caml_pasta_fq_print = function(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.caml_pasta_fq_print(ptr0, len0);
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
module.exports.caml_pasta_fq_compare = function(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_compare(ptr0, len0, ptr1, len1);
    return ret;
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {boolean}
*/
module.exports.caml_pasta_fq_equal = function(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_equal(ptr0, len0, ptr1, len1);
    return ret !== 0;
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_random = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fq_random(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} i
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_rng = function(i) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fq_rng(retptr, i);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_to_bigint = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_to_bigint(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_of_bigint = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_of_bigint(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        var r3 = getInt32Memory0()[retptr / 4 + 3];
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_two_adic_root_of_unity = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fq_two_adic_root_of_unity(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} log2_size
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_domain_generator = function(log2_size) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fq_domain_generator(retptr, log2_size);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_to_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_to_bytes(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_of_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_of_bytes(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_deep_copy = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_deep_copy(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}
/**
* @param {WasmFpGateVector} gates
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFpSrs} srs
* @returns {WasmPastaFpPlonkIndex}
*/
module.exports.caml_pasta_fp_plonk_index_create = function(gates, public_, prev_challenges, srs) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(gates, WasmFpGateVector);
        _assertClass(srs, WasmFpSrs);
        wasm.caml_pasta_fp_plonk_index_create(retptr, gates.__wbg_ptr, public_, prev_challenges, srs.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmPastaFpPlonkIndex.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_max_degree = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_max_degree(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_public_inputs = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_public_inputs(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_domain_d1_size = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d1_size(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_domain_d4_size = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d4_size(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_domain_d8_size = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d8_size(index.__wbg_ptr);
    return ret;
};

function isLikeNone(x) {
    return x === undefined || x === null;
}
/**
* @param {number | undefined} offset
* @param {WasmFpSrs} srs
* @param {string} path
* @returns {WasmPastaFpPlonkIndex}
*/
module.exports.caml_pasta_fp_plonk_index_read = function(offset, srs, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFpSrs);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_plonk_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmPastaFpPlonkIndex.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {boolean | undefined} append
* @param {WasmPastaFpPlonkIndex} index
* @param {string} path
*/
module.exports.caml_pasta_fp_plonk_index_write = function(append, index, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFpPlonkIndex);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_plonk_index_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, index.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {string}
*/
module.exports.caml_pasta_fp_plonk_index_serialize = function(index) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFpPlonkIndex);
        wasm.caml_pasta_fp_plonk_index_serialize(retptr, index.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1);
    }
};

/**
* @param {WasmFqGateVector} gates
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFqSrs} srs
* @returns {WasmPastaFqPlonkIndex}
*/
module.exports.caml_pasta_fq_plonk_index_create = function(gates, public_, prev_challenges, srs) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(gates, WasmFqGateVector);
        _assertClass(srs, WasmFqSrs);
        wasm.caml_pasta_fq_plonk_index_create(retptr, gates.__wbg_ptr, public_, prev_challenges, srs.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmPastaFqPlonkIndex.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_max_degree = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_max_degree(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_public_inputs = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_public_inputs(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_domain_d1_size = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d1_size(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_domain_d4_size = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d4_size(index.__wbg_ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_domain_d8_size = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d8_size(index.__wbg_ptr);
    return ret;
};

/**
* @param {number | undefined} offset
* @param {WasmFqSrs} srs
* @param {string} path
* @returns {WasmPastaFqPlonkIndex}
*/
module.exports.caml_pasta_fq_plonk_index_read = function(offset, srs, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFqSrs);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_plonk_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmPastaFqPlonkIndex.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {boolean | undefined} append
* @param {WasmPastaFqPlonkIndex} index
* @param {string} path
*/
module.exports.caml_pasta_fq_plonk_index_write = function(append, index, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFqPlonkIndex);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_plonk_index_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, index.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {string}
*/
module.exports.caml_pasta_fq_plonk_index_serialize = function(index) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFqPlonkIndex);
        wasm.caml_pasta_fq_plonk_index_serialize(retptr, index.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1);
    }
};

/**
* @returns {WasmGPallas}
*/
module.exports.caml_pallas_affine_one = function() {
    const ret = wasm.caml_pallas_affine_one();
    return WasmGPallas.__wrap(ret);
};

/**
* @returns {WasmGVesta}
*/
module.exports.caml_vesta_affine_one = function() {
    const ret = wasm.caml_vesta_affine_one();
    return WasmGVesta.__wrap(ret);
};

/**
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_one = function() {
    const ret = wasm.caml_pallas_one();
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmPallasGProjective} x
* @param {WasmPallasGProjective} y
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_add = function(x, y) {
    _assertClass(x, WasmPallasGProjective);
    _assertClass(y, WasmPallasGProjective);
    const ret = wasm.caml_pallas_add(x.__wbg_ptr, y.__wbg_ptr);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmPallasGProjective} x
* @param {WasmPallasGProjective} y
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_sub = function(x, y) {
    _assertClass(x, WasmPallasGProjective);
    _assertClass(y, WasmPallasGProjective);
    const ret = wasm.caml_pallas_sub(x.__wbg_ptr, y.__wbg_ptr);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_negate = function(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_negate(x.__wbg_ptr);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_double = function(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_double(x.__wbg_ptr);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmPallasGProjective} x
* @param {Uint8Array} y
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_scale = function(x, y) {
    _assertClass(x, WasmPallasGProjective);
    const ptr0 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pallas_scale(x.__wbg_ptr, ptr0, len0);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_random = function() {
    const ret = wasm.caml_pallas_random();
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {number} i
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_rng = function(i) {
    const ret = wasm.caml_pallas_rng(i);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pallas_endo_base = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pallas_endo_base(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pallas_endo_scalar = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pallas_endo_scalar(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmPallasGProjective} x
* @returns {WasmGPallas}
*/
module.exports.caml_pallas_to_affine = function(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_to_affine(x.__wbg_ptr);
    return WasmGPallas.__wrap(ret);
};

/**
* @param {WasmGPallas} x
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_of_affine = function(x) {
    _assertClass(x, WasmGPallas);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pallas_of_affine(ptr0);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_of_affine_coordinates = function(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pallas_of_affine_coordinates(ptr0, len0, ptr1, len1);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmGPallas} x
* @returns {WasmGPallas}
*/
module.exports.caml_pallas_affine_deep_copy = function(x) {
    _assertClass(x, WasmGPallas);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pallas_affine_deep_copy(ptr0);
    return WasmGPallas.__wrap(ret);
};

/**
* @param {Uint8Array} state
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_poseidon_block_cipher = function(state) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(state, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_poseidon_block_cipher(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} state
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_poseidon_block_cipher = function(state) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(state, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_poseidon_block_cipher(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_one = function() {
    const ret = wasm.caml_vesta_one();
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmVestaGProjective} x
* @param {WasmVestaGProjective} y
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_add = function(x, y) {
    _assertClass(x, WasmVestaGProjective);
    _assertClass(y, WasmVestaGProjective);
    const ret = wasm.caml_vesta_add(x.__wbg_ptr, y.__wbg_ptr);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmVestaGProjective} x
* @param {WasmVestaGProjective} y
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_sub = function(x, y) {
    _assertClass(x, WasmVestaGProjective);
    _assertClass(y, WasmVestaGProjective);
    const ret = wasm.caml_vesta_sub(x.__wbg_ptr, y.__wbg_ptr);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_negate = function(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_negate(x.__wbg_ptr);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_double = function(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_double(x.__wbg_ptr);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmVestaGProjective} x
* @param {Uint8Array} y
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_scale = function(x, y) {
    _assertClass(x, WasmVestaGProjective);
    const ptr0 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_vesta_scale(x.__wbg_ptr, ptr0, len0);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_random = function() {
    const ret = wasm.caml_vesta_random();
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {number} i
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_rng = function(i) {
    const ret = wasm.caml_vesta_rng(i);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_vesta_endo_base = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_vesta_endo_base(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_vesta_endo_scalar = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_vesta_endo_scalar(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmVestaGProjective} x
* @returns {WasmGVesta}
*/
module.exports.caml_vesta_to_affine = function(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_to_affine(x.__wbg_ptr);
    return WasmGVesta.__wrap(ret);
};

/**
* @param {WasmGVesta} x
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_of_affine = function(x) {
    _assertClass(x, WasmGVesta);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_vesta_of_affine(ptr0);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_of_affine_coordinates = function(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_vesta_of_affine_coordinates(ptr0, len0, ptr1, len1);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmGVesta} x
* @returns {WasmGVesta}
*/
module.exports.caml_vesta_affine_deep_copy = function(x) {
    _assertClass(x, WasmGVesta);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_vesta_affine_deep_copy(ptr0);
    return WasmGVesta.__wrap(ret);
};

/**
* @returns {WasmFpGateVector}
*/
module.exports.caml_pasta_fp_plonk_gate_vector_create = function() {
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_create();
    return WasmFpGateVector.__wrap(ret);
};

/**
* @param {WasmFpGateVector} v
* @param {WasmFpGate} gate
*/
module.exports.caml_pasta_fp_plonk_gate_vector_add = function(v, gate) {
    _assertClass(v, WasmFpGateVector);
    _assertClass(gate, WasmFpGate);
    var ptr0 = gate.__destroy_into_raw();
    wasm.caml_pasta_fp_plonk_gate_vector_add(v.__wbg_ptr, ptr0);
};

/**
* @param {WasmFpGateVector} v
* @param {number} i
* @returns {WasmFpGate}
*/
module.exports.caml_pasta_fp_plonk_gate_vector_get = function(v, i) {
    _assertClass(v, WasmFpGateVector);
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_get(v.__wbg_ptr, i);
    return WasmFpGate.__wrap(ret);
};

/**
* @param {WasmFpGateVector} v
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_gate_vector_len = function(v) {
    _assertClass(v, WasmFpGateVector);
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_len(v.__wbg_ptr);
    return ret >>> 0;
};

/**
* @param {WasmFpGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
module.exports.caml_pasta_fp_plonk_gate_vector_wrap = function(v, t, h) {
    _assertClass(v, WasmFpGateVector);
    _assertClass(t, Wire);
    var ptr0 = t.__destroy_into_raw();
    _assertClass(h, Wire);
    var ptr1 = h.__destroy_into_raw();
    wasm.caml_pasta_fp_plonk_gate_vector_wrap(v.__wbg_ptr, ptr0, ptr1);
};

/**
* @param {number} public_input_size
* @param {WasmFpGateVector} v
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_plonk_gate_vector_digest = function(public_input_size, v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFpGateVector);
        wasm.caml_pasta_fp_plonk_gate_vector_digest(retptr, public_input_size, v.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} public_input_size
* @param {WasmFpGateVector} v
* @returns {string}
*/
module.exports.caml_pasta_fp_plonk_circuit_serialize = function(public_input_size, v) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFpGateVector);
        wasm.caml_pasta_fp_plonk_circuit_serialize(retptr, public_input_size, v.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1);
    }
};

/**
* @param {number} depth
* @returns {WasmFpSrs}
*/
module.exports.caml_fp_srs_create = function(depth) {
    const ret = wasm.caml_fp_srs_create(depth);
    return WasmFpSrs.__wrap(ret);
};

/**
* @param {WasmFpSrs} srs
* @param {number} log2_size
*/
module.exports.caml_fp_srs_add_lagrange_basis = function(srs, log2_size) {
    _assertClass(srs, WasmFpSrs);
    wasm.caml_fp_srs_add_lagrange_basis(srs.__wbg_ptr, log2_size);
};

/**
* @param {boolean | undefined} append
* @param {WasmFpSrs} srs
* @param {string} path
*/
module.exports.caml_fp_srs_write = function(append, srs, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFpSrs);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fp_srs_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number | undefined} offset
* @param {string} path
* @returns {WasmFpSrs | undefined}
*/
module.exports.caml_fp_srs_read = function(offset, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fp_srs_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return r0 === 0 ? undefined : WasmFpSrs.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFpSrs} srs
* @param {number} domain_size
* @param {number} i
* @returns {WasmFpPolyComm}
*/
module.exports.caml_fp_srs_lagrange_commitment = function(srs, domain_size, i) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFpSrs);
        wasm.caml_fp_srs_lagrange_commitment(retptr, srs.__wbg_ptr, domain_size, i);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFpPolyComm.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFpSrs} srs
* @param {number} domain_size
* @param {Uint8Array} evals
* @returns {WasmFpPolyComm}
*/
module.exports.caml_fp_srs_commit_evaluations = function(srs, domain_size, evals) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFpSrs);
        const ptr0 = passArray8ToWasm0(evals, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fp_srs_commit_evaluations(retptr, srs.__wbg_ptr, domain_size, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFpPolyComm.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFpSrs} srs
* @param {Uint8Array} chals
* @returns {WasmFpPolyComm}
*/
module.exports.caml_fp_srs_b_poly_commitment = function(srs, chals) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFpSrs);
        const ptr0 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fp_srs_b_poly_commitment(retptr, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFpPolyComm.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.buffer !== wasm.memory.buffer) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4) >>> 0;
    getUint32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {WasmFpSrs} srs
* @param {Uint32Array} comms
* @param {Uint8Array} chals
* @returns {boolean}
*/
module.exports.caml_fp_srs_batch_accumulator_check = function(srs, comms, chals) {
    _assertClass(srs, WasmFpSrs);
    const ptr0 = passArray32ToWasm0(comms, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_fp_srs_batch_accumulator_check(srs.__wbg_ptr, ptr0, len0, ptr1, len1);
    return ret !== 0;
};

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}
/**
* @param {WasmFpSrs} srs
* @param {number} comms
* @param {Uint8Array} chals
* @returns {Uint32Array}
*/
module.exports.caml_fp_srs_batch_accumulator_generate = function(srs, comms, chals) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFpSrs);
        const ptr0 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fp_srs_batch_accumulator_generate(retptr, srs.__wbg_ptr, comms, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 4);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFpSrs} srs
* @returns {WasmGVesta}
*/
module.exports.caml_fp_srs_h = function(srs) {
    _assertClass(srs, WasmFpSrs);
    const ret = wasm.caml_fp_srs_h(srs.__wbg_ptr);
    return WasmGVesta.__wrap(ret);
};

/**
* @param {number} depth
* @returns {WasmFqSrs}
*/
module.exports.caml_fq_srs_create = function(depth) {
    const ret = wasm.caml_fq_srs_create(depth);
    return WasmFqSrs.__wrap(ret);
};

/**
* @param {WasmFqSrs} srs
* @param {number} log2_size
*/
module.exports.caml_fq_srs_add_lagrange_basis = function(srs, log2_size) {
    _assertClass(srs, WasmFqSrs);
    wasm.caml_fq_srs_add_lagrange_basis(srs.__wbg_ptr, log2_size);
};

/**
* @param {boolean | undefined} append
* @param {WasmFqSrs} srs
* @param {string} path
*/
module.exports.caml_fq_srs_write = function(append, srs, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFqSrs);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fp_srs_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number | undefined} offset
* @param {string} path
* @returns {WasmFqSrs | undefined}
*/
module.exports.caml_fq_srs_read = function(offset, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fp_srs_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return r0 === 0 ? undefined : WasmFqSrs.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFqSrs} srs
* @param {number} domain_size
* @param {number} i
* @returns {WasmFqPolyComm}
*/
module.exports.caml_fq_srs_lagrange_commitment = function(srs, domain_size, i) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFqSrs);
        wasm.caml_fq_srs_lagrange_commitment(retptr, srs.__wbg_ptr, domain_size, i);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFqPolyComm.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFqSrs} srs
* @param {number} domain_size
* @param {Uint8Array} evals
* @returns {WasmFqPolyComm}
*/
module.exports.caml_fq_srs_commit_evaluations = function(srs, domain_size, evals) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFqSrs);
        const ptr0 = passArray8ToWasm0(evals, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fq_srs_commit_evaluations(retptr, srs.__wbg_ptr, domain_size, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFqPolyComm.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFqSrs} srs
* @param {Uint8Array} chals
* @returns {WasmFqPolyComm}
*/
module.exports.caml_fq_srs_b_poly_commitment = function(srs, chals) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFqSrs);
        const ptr0 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fq_srs_b_poly_commitment(retptr, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFqPolyComm.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFqSrs} srs
* @param {Uint32Array} comms
* @param {Uint8Array} chals
* @returns {boolean}
*/
module.exports.caml_fq_srs_batch_accumulator_check = function(srs, comms, chals) {
    _assertClass(srs, WasmFqSrs);
    const ptr0 = passArray32ToWasm0(comms, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_fq_srs_batch_accumulator_check(srs.__wbg_ptr, ptr0, len0, ptr1, len1);
    return ret !== 0;
};

/**
* @param {WasmFqSrs} srs
* @param {number} comms
* @param {Uint8Array} chals
* @returns {Uint32Array}
*/
module.exports.caml_fq_srs_batch_accumulator_generate = function(srs, comms, chals) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFqSrs);
        const ptr0 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_fq_srs_batch_accumulator_generate(retptr, srs.__wbg_ptr, comms, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 4);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFqSrs} srs
* @returns {WasmGPallas}
*/
module.exports.caml_fq_srs_h = function(srs) {
    _assertClass(srs, WasmFqSrs);
    const ret = wasm.caml_fp_srs_h(srs.__wbg_ptr);
    return WasmGPallas.__wrap(ret);
};

/**
* @param {WasmPastaFpPlonkIndex} prover_index
* @returns {string}
*/
module.exports.prover_to_json = function(prover_index) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(prover_index, WasmPastaFpPlonkIndex);
        wasm.prover_to_json(retptr, prover_index.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1);
    }
};

/**
* @returns {WasmFqGateVector}
*/
module.exports.caml_pasta_fq_plonk_gate_vector_create = function() {
    const ret = wasm.caml_pasta_fq_plonk_gate_vector_create();
    return WasmFqGateVector.__wrap(ret);
};

/**
* @param {WasmFqGateVector} v
* @param {WasmFqGate} gate
*/
module.exports.caml_pasta_fq_plonk_gate_vector_add = function(v, gate) {
    _assertClass(v, WasmFqGateVector);
    _assertClass(gate, WasmFqGate);
    var ptr0 = gate.__destroy_into_raw();
    wasm.caml_pasta_fq_plonk_gate_vector_add(v.__wbg_ptr, ptr0);
};

/**
* @param {WasmFqGateVector} v
* @param {number} i
* @returns {WasmFqGate}
*/
module.exports.caml_pasta_fq_plonk_gate_vector_get = function(v, i) {
    _assertClass(v, WasmFqGateVector);
    const ret = wasm.caml_pasta_fq_plonk_gate_vector_get(v.__wbg_ptr, i);
    return WasmFqGate.__wrap(ret);
};

/**
* @param {WasmFqGateVector} v
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_gate_vector_len = function(v) {
    _assertClass(v, WasmFqGateVector);
    const ret = wasm.caml_pasta_fq_plonk_gate_vector_len(v.__wbg_ptr);
    return ret >>> 0;
};

/**
* @param {WasmFqGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
module.exports.caml_pasta_fq_plonk_gate_vector_wrap = function(v, t, h) {
    _assertClass(v, WasmFqGateVector);
    _assertClass(t, Wire);
    var ptr0 = t.__destroy_into_raw();
    _assertClass(h, Wire);
    var ptr1 = h.__destroy_into_raw();
    wasm.caml_pasta_fq_plonk_gate_vector_wrap(v.__wbg_ptr, ptr0, ptr1);
};

/**
* @param {number} public_input_size
* @param {WasmFqGateVector} v
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_plonk_gate_vector_digest = function(public_input_size, v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFqGateVector);
        wasm.caml_pasta_fq_plonk_gate_vector_digest(retptr, public_input_size, v.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {number} public_input_size
* @param {WasmFqGateVector} v
* @returns {string}
*/
module.exports.caml_pasta_fq_plonk_circuit_serialize = function(public_input_size, v) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFqGateVector);
        wasm.caml_pasta_fq_plonk_circuit_serialize(retptr, public_input_size, v.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1);
    }
};

/**
* @param {number | undefined} offset
* @param {WasmFpSrs} srs
* @param {string} path
* @returns {WasmFpPlonkVerifierIndex}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_read = function(offset, srs, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFpSrs);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_plonk_verifier_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFpPlonkVerifierIndex.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {boolean | undefined} append
* @param {WasmFpPlonkVerifierIndex} index
* @param {string} path
*/
module.exports.caml_pasta_fp_plonk_verifier_index_write = function(append, index, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFpPlonkVerifierIndex);
        var ptr0 = index.__destroy_into_raw();
        const ptr1 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_plonk_verifier_index_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, ptr0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFpPlonkVerifierIndex} index
* @returns {string}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_serialize = function(index) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFpPlonkVerifierIndex);
        var ptr0 = index.__destroy_into_raw();
        wasm.caml_pasta_fp_plonk_verifier_index_serialize(retptr, ptr0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1);
    }
};

/**
* @param {WasmFpSrs} srs
* @param {string} index
* @returns {WasmFpPlonkVerifierIndex}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_deserialize = function(srs, index) {
    _assertClass(srs, WasmFpSrs);
    const ptr0 = passStringToWasm0(index, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_deserialize(srs.__wbg_ptr, ptr0, len0);
    return WasmFpPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {WasmFpPlonkVerifierIndex}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_create = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_create(index.__wbg_ptr);
    return WasmFpPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {number} log2_size
* @returns {WasmFpShifts}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_shifts = function(log2_size) {
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_shifts(log2_size);
    return WasmFpShifts.__wrap(ret);
};

/**
* @returns {WasmFpPlonkVerifierIndex}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_dummy = function() {
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_dummy();
    return WasmFpPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {WasmFpPlonkVerifierIndex} x
* @returns {WasmFpPlonkVerifierIndex}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_deep_copy = function(x) {
    _assertClass(x, WasmFpPlonkVerifierIndex);
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_deep_copy(x.__wbg_ptr);
    return WasmFpPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {number | undefined} offset
* @param {WasmFqSrs} srs
* @param {string} path
* @returns {WasmFqPlonkVerifierIndex}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_read = function(offset, srs, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(srs, WasmFqSrs);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_plonk_verifier_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.__wbg_ptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFqPlonkVerifierIndex.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {boolean | undefined} append
* @param {WasmFqPlonkVerifierIndex} index
* @param {string} path
*/
module.exports.caml_pasta_fq_plonk_verifier_index_write = function(append, index, path) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFqPlonkVerifierIndex);
        var ptr0 = index.__destroy_into_raw();
        const ptr1 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_plonk_verifier_index_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, ptr0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFqPlonkVerifierIndex} index
* @returns {string}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_serialize = function(index) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFqPlonkVerifierIndex);
        var ptr0 = index.__destroy_into_raw();
        wasm.caml_pasta_fq_plonk_verifier_index_serialize(retptr, ptr0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1);
    }
};

/**
* @param {WasmFqSrs} srs
* @param {string} index
* @returns {WasmFqPlonkVerifierIndex}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_deserialize = function(srs, index) {
    _assertClass(srs, WasmFqSrs);
    const ptr0 = passStringToWasm0(index, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_deserialize(srs.__wbg_ptr, ptr0, len0);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {WasmFqPlonkVerifierIndex}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_create = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_create(index.__wbg_ptr);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {number} log2_size
* @returns {WasmFqShifts}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_shifts = function(log2_size) {
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_shifts(log2_size);
    return WasmFqShifts.__wrap(ret);
};

/**
* @returns {WasmFqPlonkVerifierIndex}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_dummy = function() {
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_dummy();
    return WasmFqPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {WasmFqPlonkVerifierIndex} x
* @returns {WasmFqPlonkVerifierIndex}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_deep_copy = function(x) {
    _assertClass(x, WasmFqPlonkVerifierIndex);
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_deep_copy(x.__wbg_ptr);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {Uint32Array} lgr_comm
* @param {WasmFqPlonkVerifierIndex} index
* @param {WasmFqProverProof} proof
* @returns {WasmFqOracles}
*/
module.exports.fq_oracles_create = function(lgr_comm, index, proof) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray32ToWasm0(lgr_comm, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(index, WasmFqPlonkVerifierIndex);
        var ptr1 = index.__destroy_into_raw();
        _assertClass(proof, WasmFqProverProof);
        var ptr2 = proof.__destroy_into_raw();
        wasm.fq_oracles_create(retptr, ptr0, len0, ptr1, ptr2);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFqOracles.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {WasmFqOracles}
*/
module.exports.fq_oracles_dummy = function() {
    const ret = wasm.fq_oracles_dummy();
    return WasmFqOracles.__wrap(ret);
};

/**
* @param {WasmFqProverProof} x
* @returns {WasmFqProverProof}
*/
module.exports.fq_oracles_deep_copy = function(x) {
    _assertClass(x, WasmFqProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.fq_oracles_deep_copy(ptr0);
    return WasmFqProverProof.__wrap(ret);
};

/**
* @param {Uint32Array} lgr_comm
* @param {WasmFpPlonkVerifierIndex} index
* @param {WasmFpProverProof} proof
* @returns {WasmFpOracles}
*/
module.exports.fp_oracles_create = function(lgr_comm, index, proof) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray32ToWasm0(lgr_comm, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(index, WasmFpPlonkVerifierIndex);
        var ptr1 = index.__destroy_into_raw();
        _assertClass(proof, WasmFpProverProof);
        var ptr2 = proof.__destroy_into_raw();
        wasm.fp_oracles_create(retptr, ptr0, len0, ptr1, ptr2);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFpOracles.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {WasmFpOracles}
*/
module.exports.fp_oracles_dummy = function() {
    const ret = wasm.fp_oracles_dummy();
    return WasmFpOracles.__wrap(ret);
};

/**
* @param {WasmFpProverProof} x
* @returns {WasmFpProverProof}
*/
module.exports.fp_oracles_deep_copy = function(x) {
    _assertClass(x, WasmFpProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFpProverProof.__wrap(ret);
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @param {WasmVecVecFp} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFpProverProof}
*/
module.exports.caml_pasta_fp_plonk_proof_create = function(index, witness, prev_challenges, prev_sgs) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFpPlonkIndex);
        _assertClass(witness, WasmVecVecFp);
        var ptr0 = witness.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(prev_challenges, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(prev_sgs, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_plonk_proof_create(retptr, index.__wbg_ptr, ptr0, ptr1, len1, ptr2, len2);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFpProverProof.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFpPlonkVerifierIndex} index
* @param {WasmFpProverProof} proof
* @returns {boolean}
*/
module.exports.caml_pasta_fp_plonk_proof_verify = function(index, proof) {
    _assertClass(index, WasmFpPlonkVerifierIndex);
    var ptr0 = index.__destroy_into_raw();
    _assertClass(proof, WasmFpProverProof);
    var ptr1 = proof.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_verify(ptr0, ptr1);
    return ret !== 0;
};

/**
* @param {Uint32Array} indexes
* @param {Uint32Array} proofs
* @returns {boolean}
*/
module.exports.caml_pasta_fp_plonk_proof_batch_verify = function(indexes, proofs) {
    const ptr0 = passArray32ToWasm0(indexes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(proofs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_plonk_proof_batch_verify(ptr0, len0, ptr1, len1);
    return ret !== 0;
};

/**
* @returns {WasmFpProverProof}
*/
module.exports.caml_pasta_fp_plonk_proof_dummy = function() {
    const ret = wasm.caml_pasta_fp_plonk_proof_dummy();
    return WasmFpProverProof.__wrap(ret);
};

/**
* @param {WasmFpProverProof} x
* @returns {WasmFpProverProof}
*/
module.exports.caml_pasta_fp_plonk_proof_deep_copy = function(x) {
    _assertClass(x, WasmFpProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFpProverProof.__wrap(ret);
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @param {WasmVecVecFq} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFqProverProof}
*/
module.exports.caml_pasta_fq_plonk_proof_create = function(index, witness, prev_challenges, prev_sgs) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFqPlonkIndex);
        _assertClass(witness, WasmVecVecFq);
        var ptr0 = witness.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(prev_challenges, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(prev_sgs, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_plonk_proof_create(retptr, index.__wbg_ptr, ptr0, ptr1, len1, ptr2, len2);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var r2 = getInt32Memory0()[retptr / 4 + 2];
        if (r2) {
            throw takeObject(r1);
        }
        return WasmFqProverProof.__wrap(r0);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {WasmFqPlonkVerifierIndex} index
* @param {WasmFqProverProof} proof
* @returns {boolean}
*/
module.exports.caml_pasta_fq_plonk_proof_verify = function(index, proof) {
    _assertClass(index, WasmFqPlonkVerifierIndex);
    var ptr0 = index.__destroy_into_raw();
    _assertClass(proof, WasmFqProverProof);
    var ptr1 = proof.__destroy_into_raw();
    const ret = wasm.caml_pasta_fq_plonk_proof_verify(ptr0, ptr1);
    return ret !== 0;
};

/**
* @param {Uint32Array} indexes
* @param {Uint32Array} proofs
* @returns {boolean}
*/
module.exports.caml_pasta_fq_plonk_proof_batch_verify = function(indexes, proofs) {
    const ptr0 = passArray32ToWasm0(indexes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(proofs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_plonk_proof_batch_verify(ptr0, len0, ptr1, len1);
    return ret !== 0;
};

/**
* @returns {WasmFqProverProof}
*/
module.exports.caml_pasta_fq_plonk_proof_dummy = function() {
    const ret = wasm.caml_pasta_fq_plonk_proof_dummy();
    return WasmFqProverProof.__wrap(ret);
};

/**
* @param {WasmFqProverProof} x
* @returns {WasmFqProverProof}
*/
module.exports.caml_pasta_fq_plonk_proof_deep_copy = function(x) {
    _assertClass(x, WasmFqProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFqProverProof.__wrap(ret);
};

/**
* @param {number} num_threads
* @param {string} worker_source
* @returns {Promise<any>}
*/
module.exports.initThreadPool = function(num_threads, worker_source) {
    const ret = wasm.initThreadPool(num_threads, addHeapObject(worker_source));
    return takeObject(ret);
};

/**
* @returns {Promise<any>}
*/
module.exports.exitThreadPool = function() {
    const ret = wasm.exitThreadPool();
    return takeObject(ret);
};

/**
* @param {number} receiver
*/
module.exports.wbg_rayon_start_worker = function(receiver) {
    wasm.wbg_rayon_start_worker(receiver);
};

/**
* @param {string} s
* @param {number} _len
* @param {number} base
* @returns {Uint8Array}
*/
module.exports.caml_bigint_256_of_numeral = function(s, _len, base) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_of_numeral(retptr, ptr0, len0, _len, base);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {string} s
* @returns {Uint8Array}
*/
module.exports.caml_bigint_256_of_decimal_string = function(s) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_of_decimal_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {number}
*/
module.exports.caml_bigint_256_num_limbs = function() {
    const ret = wasm.caml_bigint_256_num_limbs();
    return ret;
};

/**
* @returns {number}
*/
module.exports.caml_bigint_256_bytes_per_limb = function() {
    const ret = wasm.caml_bigint_256_bytes_per_limb();
    return ret;
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
module.exports.caml_bigint_256_div = function(x, y) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_div(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
module.exports.caml_bigint_256_compare = function(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_bigint_256_compare(ptr0, len0, ptr1, len1);
    return ret;
};

/**
* @param {Uint8Array} x
*/
module.exports.caml_bigint_256_print = function(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.caml_bigint_256_print(ptr0, len0);
};

/**
* @param {Uint8Array} x
* @returns {string}
*/
module.exports.caml_bigint_256_to_string = function(x) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_to_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1);
    }
};

/**
* @param {Uint8Array} x
* @param {number} i
* @returns {boolean}
*/
module.exports.caml_bigint_256_test_bit = function(x, i) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_bigint_256_test_bit(ptr0, len0, i);
    return ret !== 0;
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_bigint_256_to_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_to_bytes(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_bigint_256_of_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_of_bytes(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
module.exports.caml_bigint_256_deep_copy = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_deep_copy(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}
/**
* A row accessible from a given row, corresponds to the fact that we open all polynomials
* at `zeta` **and** `omega * zeta`.
*/
module.exports.CurrOrNext = Object.freeze({ Curr:0,"0":"Curr",Next:1,"1":"Next", });
/**
* The different types of gates the system supports.
* Note that all the gates are mutually exclusive:
* they cannot be used at the same time on single row.
* If we were ever to support this feature, we would have to make sure
* not to re-use powers of alpha across constraints.
*/
module.exports.GateType = Object.freeze({
/**
* Zero gate
*/
Zero:0,"0":"Zero",
/**
* Generic arithmetic gate
*/
Generic:1,"1":"Generic",
/**
* Poseidon permutation gate
*/
Poseidon:2,"2":"Poseidon",
/**
* Complete EC addition in Affine form
*/
CompleteAdd:3,"3":"CompleteAdd",
/**
* EC variable base scalar multiplication
*/
VarBaseMul:4,"4":"VarBaseMul",
/**
* EC variable base scalar multiplication with group endomorphim optimization
*/
EndoMul:5,"5":"EndoMul",
/**
* Gate for computing the scalar corresponding to an endoscaling
*/
EndoMulScalar:6,"6":"EndoMulScalar",Lookup:11,"11":"Lookup",
/**
* Cairo
*/
CairoClaim:12,"12":"CairoClaim",CairoInstruction:13,"13":"CairoInstruction",CairoFlags:14,"14":"CairoFlags",CairoTransition:15,"15":"CairoTransition",
/**
* Range check
*/
RangeCheck0:16,"16":"RangeCheck0",RangeCheck1:17,"17":"RangeCheck1",ForeignFieldAdd:18,"18":"ForeignFieldAdd",ForeignFieldMul:19,"19":"ForeignFieldMul",Xor16:20,"20":"Xor16",Rot64:21,"21":"Rot64", });
/**
*/
class PoolBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PoolBuilder.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_poolbuilder_free(ptr);
    }
    /**
    * @returns {number}
    */
    numThreads() {
        const ret = wasm.poolbuilder_numThreads(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    receiver() {
        const ret = wasm.poolbuilder_receiver(this.__wbg_ptr);
        return ret;
    }
    /**
    */
    build() {
        wasm.poolbuilder_build(this.__wbg_ptr);
    }
}
module.exports.PoolBuilder = PoolBuilder;
/**
*/
class WasmFpDomain {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpDomain.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpdomain_free(ptr);
    }
    /**
    * @returns {number}
    */
    get log_size_of_group() {
        const ret = wasm.__wbg_get_wasmfpdomain_log_size_of_group(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set log_size_of_group(arg0) {
        wasm.__wbg_set_wasmfpdomain_log_size_of_group(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {Uint8Array}
    */
    get group_gen() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpdomain_group_gen(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set group_gen(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpdomain_group_gen(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {number} log_size_of_group
    * @param {Uint8Array} group_gen
    */
    constructor(log_size_of_group, group_gen) {
        const ptr0 = passArray8ToWasm0(group_gen, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfpdomain_new(log_size_of_group, ptr0, len0);
        return WasmFpDomain.__wrap(ret);
    }
}
module.exports.WasmFpDomain = WasmFpDomain;
/**
*/
class WasmFpGate {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpGate.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpgate_free(ptr);
    }
    /**
    * @returns {number}
    */
    get typ() {
        const ret = wasm.__wbg_get_wasmfpgate_typ(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set typ(arg0) {
        wasm.__wbg_set_wasmfpgate_typ(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {WasmGateWires}
    */
    get wires() {
        const ret = wasm.__wbg_get_wasmfpgate_wires(this.__wbg_ptr);
        return WasmGateWires.__wrap(ret);
    }
    /**
    * @param {WasmGateWires} arg0
    */
    set wires(arg0) {
        _assertClass(arg0, WasmGateWires);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpgate_wires(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {number} typ
    * @param {WasmGateWires} wires
    * @param {Uint8Array} coeffs
    */
    constructor(typ, wires, coeffs) {
        _assertClass(wires, WasmGateWires);
        var ptr0 = wires.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(coeffs, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfpgate_new(typ, ptr0, ptr1, len1);
        return WasmFpGate.__wrap(ret);
    }
}
module.exports.WasmFpGate = WasmFpGate;
/**
*/
class WasmFpGateVector {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpGateVector.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpgatevector_free(ptr);
    }
}
module.exports.WasmFpGateVector = WasmFpGateVector;
/**
*/
class WasmFpOpeningProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpOpeningProof.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpopeningproof_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get z1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpopeningproof_z1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set z1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpopeningproof_z1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get z2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpopeningproof_z2(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set z2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpopeningproof_z2(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint32Array} lr_0
    * @param {Uint32Array} lr_1
    * @param {WasmGVesta} delta
    * @param {Uint8Array} z1
    * @param {Uint8Array} z2
    * @param {WasmGVesta} sg
    */
    constructor(lr_0, lr_1, delta, z1, z2, sg) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(delta, WasmGVesta);
        var ptr2 = delta.__destroy_into_raw();
        const ptr3 = passArray8ToWasm0(z1, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(z2, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        _assertClass(sg, WasmGVesta);
        var ptr5 = sg.__destroy_into_raw();
        const ret = wasm.wasmfpopeningproof_new(ptr0, len0, ptr1, len1, ptr2, ptr3, len3, ptr4, len4, ptr5);
        return WasmFpOpeningProof.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get lr_0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpopeningproof_lr_0(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {Uint32Array}
    */
    get lr_1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpopeningproof_lr_1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {WasmGVesta}
    */
    get delta() {
        const ret = wasm.wasmfpopeningproof_delta(this.__wbg_ptr);
        return WasmGVesta.__wrap(ret);
    }
    /**
    * @returns {WasmGVesta}
    */
    get sg() {
        const ret = wasm.wasmfpopeningproof_sg(this.__wbg_ptr);
        return WasmGVesta.__wrap(ret);
    }
    /**
    * @param {Uint32Array} lr_0
    */
    set lr_0(lr_0) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpopeningproof_set_lr_0(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint32Array} lr_1
    */
    set lr_1(lr_1) {
        const ptr0 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpopeningproof_set_lr_1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmGVesta} delta
    */
    set delta(delta) {
        _assertClass(delta, WasmGVesta);
        var ptr0 = delta.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_delta(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmGVesta} sg
    */
    set sg(sg) {
        _assertClass(sg, WasmGVesta);
        var ptr0 = sg.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_sg(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFpOpeningProof = WasmFpOpeningProof;
/**
*/
class WasmFpOracles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpOracles.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfporacles_free(ptr);
    }
    /**
    * @returns {WasmFpRandomOracles}
    */
    get o() {
        const ret = wasm.__wbg_get_wasmfporacles_o(this.__wbg_ptr);
        return WasmFpRandomOracles.__wrap(ret);
    }
    /**
    * @param {WasmFpRandomOracles} arg0
    */
    set o(arg0) {
        _assertClass(arg0, WasmFpRandomOracles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfporacles_o(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Uint8Array}
    */
    get p_eval0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfporacles_p_eval0(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set p_eval0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_p_eval0(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get p_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfporacles_p_eval1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set p_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_p_eval1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get digest_before_evaluations() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfporacles_digest_before_evaluations(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set digest_before_evaluations(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_digest_before_evaluations(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmFpRandomOracles} o
    * @param {Uint8Array} p_eval0
    * @param {Uint8Array} p_eval1
    * @param {Uint8Array} opening_prechallenges
    * @param {Uint8Array} digest_before_evaluations
    */
    constructor(o, p_eval0, p_eval1, opening_prechallenges, digest_before_evaluations) {
        _assertClass(o, WasmFpRandomOracles);
        var ptr0 = o.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(p_eval0, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(p_eval1, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(opening_prechallenges, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(digest_before_evaluations, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfporacles_new(ptr0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
        return WasmFpOracles.__wrap(ret);
    }
    /**
    * @returns {Uint8Array}
    */
    get opening_prechallenges() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfporacles_opening_prechallenges(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} x
    */
    set opening_prechallenges(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfporacles_set_opening_prechallenges(this.__wbg_ptr, ptr0, len0);
    }
}
module.exports.WasmFpOracles = WasmFpOracles;
/**
*/
class WasmFpPlonkVerificationEvals {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpPlonkVerificationEvals.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpplonkverificationevals_free(ptr);
    }
    /**
    * @param {Uint32Array} sigma_comm
    * @param {Uint32Array} coefficients_comm
    * @param {WasmFpPolyComm} generic_comm
    * @param {WasmFpPolyComm} psm_comm
    * @param {WasmFpPolyComm} complete_add_comm
    * @param {WasmFpPolyComm} mul_comm
    * @param {WasmFpPolyComm} emul_comm
    * @param {WasmFpPolyComm} endomul_scalar_comm
    */
    constructor(sigma_comm, coefficients_comm, generic_comm, psm_comm, complete_add_comm, mul_comm, emul_comm, endomul_scalar_comm) {
        const ptr0 = passArray32ToWasm0(sigma_comm, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(coefficients_comm, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(generic_comm, WasmFpPolyComm);
        _assertClass(psm_comm, WasmFpPolyComm);
        _assertClass(complete_add_comm, WasmFpPolyComm);
        _assertClass(mul_comm, WasmFpPolyComm);
        _assertClass(emul_comm, WasmFpPolyComm);
        _assertClass(endomul_scalar_comm, WasmFpPolyComm);
        const ret = wasm.wasmfpplonkverificationevals_new(ptr0, len0, ptr1, len1, generic_comm.__wbg_ptr, psm_comm.__wbg_ptr, complete_add_comm.__wbg_ptr, mul_comm.__wbg_ptr, emul_comm.__wbg_ptr, endomul_scalar_comm.__wbg_ptr);
        return WasmFpPlonkVerificationEvals.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get sigma_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpplonkverificationevals_sigma_comm(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint32Array} x
    */
    set sigma_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpplonkverificationevals_set_sigma_comm(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint32Array}
    */
    get coefficients_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpplonkverificationevals_coefficients_comm(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint32Array} x
    */
    set coefficients_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpplonkverificationevals_set_coefficients_comm(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get generic_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set generic_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get psm_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set psm_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get complete_add_comm() {
        const ret = wasm.wasmfpplonkverificationevals_complete_add_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set complete_add_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_complete_add_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get mul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_mul_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set mul_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_mul_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get emul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_emul_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set emul_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_emul_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get endomul_scalar_comm() {
        const ret = wasm.wasmfpplonkverificationevals_endomul_scalar_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set endomul_scalar_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_endomul_scalar_comm(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFpPlonkVerificationEvals = WasmFpPlonkVerificationEvals;
/**
*/
class WasmFpPlonkVerifierIndex {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpPlonkVerifierIndex.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpplonkverifierindex_free(ptr);
    }
    /**
    * @returns {WasmFpDomain}
    */
    get domain() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_domain(this.__wbg_ptr);
        return WasmFpDomain.__wrap(ret);
    }
    /**
    * @param {WasmFpDomain} arg0
    */
    set domain(arg0) {
        _assertClass(arg0, WasmFpDomain);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpplonkverifierindex_domain(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {number}
    */
    get max_poly_size() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_max_poly_size(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set max_poly_size(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_max_poly_size(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get public_() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_public_(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set public_(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_public_(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get prev_challenges() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_prev_challenges(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set prev_challenges(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_prev_challenges(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {WasmFpShifts}
    */
    get shifts() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_shifts(this.__wbg_ptr);
        return WasmFpShifts.__wrap(ret);
    }
    /**
    * @param {WasmFpShifts} arg0
    */
    set shifts(arg0) {
        _assertClass(arg0, WasmFpShifts);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpplonkverifierindex_shifts(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmFpDomain} domain
    * @param {number} max_poly_size
    * @param {number} public_
    * @param {number} prev_challenges
    * @param {WasmFpSrs} srs
    * @param {WasmFpPlonkVerificationEvals} evals
    * @param {WasmFpShifts} shifts
    */
    constructor(domain, max_poly_size, public_, prev_challenges, srs, evals, shifts) {
        _assertClass(domain, WasmFpDomain);
        _assertClass(srs, WasmFpSrs);
        _assertClass(evals, WasmFpPlonkVerificationEvals);
        _assertClass(shifts, WasmFpShifts);
        const ret = wasm.wasmfpplonkverifierindex_new(domain.__wbg_ptr, max_poly_size, public_, prev_challenges, srs.__wbg_ptr, evals.__wbg_ptr, shifts.__wbg_ptr);
        return WasmFpPlonkVerifierIndex.__wrap(ret);
    }
    /**
    * @returns {WasmFpSrs}
    */
    get srs() {
        const ret = wasm.wasmfpplonkverifierindex_srs(this.__wbg_ptr);
        return WasmFpSrs.__wrap(ret);
    }
    /**
    * @param {WasmFpSrs} x
    */
    set srs(x) {
        _assertClass(x, WasmFpSrs);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverifierindex_set_srs(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFpPlonkVerificationEvals}
    */
    get evals() {
        const ret = wasm.wasmfpplonkverifierindex_evals(this.__wbg_ptr);
        return WasmFpPlonkVerificationEvals.__wrap(ret);
    }
    /**
    * @param {WasmFpPlonkVerificationEvals} x
    */
    set evals(x) {
        _assertClass(x, WasmFpPlonkVerificationEvals);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverifierindex_set_evals(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFpPlonkVerifierIndex = WasmFpPlonkVerifierIndex;
/**
*/
class WasmFpPolyComm {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpPolyComm.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfppolycomm_free(ptr);
    }
    /**
    * @param {Uint32Array} unshifted
    * @param {WasmGVesta | undefined} shifted
    */
    constructor(unshifted, shifted) {
        const ptr0 = passArray32ToWasm0(unshifted, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        let ptr1 = 0;
        if (!isLikeNone(shifted)) {
            _assertClass(shifted, WasmGVesta);
            ptr1 = shifted.__destroy_into_raw();
        }
        const ret = wasm.wasmfppolycomm_new(ptr0, len0, ptr1);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get unshifted() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfppolycomm_unshifted(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint32Array} x
    */
    set unshifted(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfppolycomm_set_unshifted(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {WasmGVesta | undefined}
    */
    get shifted() {
        const ret = wasm.__wbg_get_wasmfppolycomm_shifted(this.__wbg_ptr);
        return ret === 0 ? undefined : WasmGVesta.__wrap(ret);
    }
    /**
    * @param {WasmGVesta | undefined} arg0
    */
    set shifted(arg0) {
        let ptr0 = 0;
        if (!isLikeNone(arg0)) {
            _assertClass(arg0, WasmGVesta);
            ptr0 = arg0.__destroy_into_raw();
        }
        wasm.__wbg_set_wasmfppolycomm_shifted(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFpPolyComm = WasmFpPolyComm;
/**
*/
class WasmFpProverCommitments {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpProverCommitments.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpprovercommitments_free(ptr);
    }
    /**
    * @param {Uint32Array} w_comm
    * @param {WasmFpPolyComm} z_comm
    * @param {WasmFpPolyComm} t_comm
    */
    constructor(w_comm, z_comm, t_comm) {
        const ptr0 = passArray32ToWasm0(w_comm, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(z_comm, WasmFpPolyComm);
        var ptr1 = z_comm.__destroy_into_raw();
        _assertClass(t_comm, WasmFpPolyComm);
        var ptr2 = t_comm.__destroy_into_raw();
        const ret = wasm.wasmfpprovercommitments_new(ptr0, len0, ptr1, ptr2);
        return WasmFpProverCommitments.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get w_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpprovercommitments_w_comm(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get z_comm() {
        const ret = wasm.wasmfpprovercommitments_z_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get t_comm() {
        const ret = wasm.wasmfpprovercommitments_t_comm(this.__wbg_ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {Uint32Array} x
    */
    set w_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpprovercommitments_set_w_comm(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set z_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpprovercommitments_set_z_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set t_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpprovercommitments_set_t_comm(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFpProverCommitments = WasmFpProverCommitments;
/**
*/
class WasmFpProverProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpProverProof.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpproverproof_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get ft_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpproverproof_ft_eval1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set ft_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpproverproof_ft_eval1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmFpProverCommitments} commitments
    * @param {WasmFpOpeningProof} proof
    * @param {any} evals
    * @param {Uint8Array} ft_eval1
    * @param {Uint8Array} public_
    * @param {WasmVecVecFp} prev_challenges_scalars
    * @param {Uint32Array} prev_challenges_comms
    */
    constructor(commitments, proof, evals, ft_eval1, public_, prev_challenges_scalars, prev_challenges_comms) {
        _assertClass(commitments, WasmFpProverCommitments);
        var ptr0 = commitments.__destroy_into_raw();
        _assertClass(proof, WasmFpOpeningProof);
        var ptr1 = proof.__destroy_into_raw();
        const ptr2 = passArray8ToWasm0(ft_eval1, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        _assertClass(prev_challenges_scalars, WasmVecVecFp);
        var ptr4 = prev_challenges_scalars.__destroy_into_raw();
        const ptr5 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfpproverproof_new(ptr0, ptr1, addHeapObject(evals), ptr2, len2, ptr3, len3, ptr4, ptr5, len5);
        return WasmFpProverProof.__wrap(ret);
    }
    /**
    * @returns {WasmFpProverCommitments}
    */
    get commitments() {
        const ret = wasm.wasmfpproverproof_commitments(this.__wbg_ptr);
        return WasmFpProverCommitments.__wrap(ret);
    }
    /**
    * @returns {WasmFpOpeningProof}
    */
    get proof() {
        const ret = wasm.wasmfpproverproof_proof(this.__wbg_ptr);
        return WasmFpOpeningProof.__wrap(ret);
    }
    /**
    * @returns {any}
    */
    get evals() {
        const ret = wasm.wasmfpproverproof_evals(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
    * @returns {Uint8Array}
    */
    get public_() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproverproof_public_(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {WasmVecVecFp}
    */
    get prev_challenges_scalars() {
        const ret = wasm.wasmfpproverproof_prev_challenges_scalars(this.__wbg_ptr);
        return WasmVecVecFp.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get prev_challenges_comms() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproverproof_prev_challenges_comms(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {WasmFpProverCommitments} commitments
    */
    set commitments(commitments) {
        _assertClass(commitments, WasmFpProverCommitments);
        var ptr0 = commitments.__destroy_into_raw();
        wasm.wasmfpproverproof_set_commitments(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmFpOpeningProof} proof
    */
    set proof(proof) {
        _assertClass(proof, WasmFpOpeningProof);
        var ptr0 = proof.__destroy_into_raw();
        wasm.wasmfpproverproof_set_proof(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {any} evals
    */
    set evals(evals) {
        wasm.wasmfpproverproof_set_evals(this.__wbg_ptr, addHeapObject(evals));
    }
    /**
    * @param {Uint8Array} public_
    */
    set public_(public_) {
        const ptr0 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproverproof_set_public_(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmVecVecFp} prev_challenges_scalars
    */
    set prev_challenges_scalars(prev_challenges_scalars) {
        _assertClass(prev_challenges_scalars, WasmVecVecFp);
        var ptr0 = prev_challenges_scalars.__destroy_into_raw();
        wasm.wasmfpproverproof_set_prev_challenges_scalars(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {Uint32Array} prev_challenges_comms
    */
    set prev_challenges_comms(prev_challenges_comms) {
        const ptr0 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproverproof_set_prev_challenges_comms(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {string}
    */
    serialize() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproverproof_serialize(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1);
        }
    }
}
module.exports.WasmFpProverProof = WasmFpProverProof;
/**
*/
class WasmFpRandomOracles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpRandomOracles.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfprandomoracles_free(ptr);
    }
    /**
    * @returns {Uint8Array | undefined}
    */
    get joint_combiner_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_joint_combiner_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v1;
            if (r0 !== 0) {
                v1 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner_chal(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_joint_combiner_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array | undefined}
    */
    get joint_combiner() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_joint_combiner(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v1;
            if (r0 !== 0) {
                v1 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_joint_combiner(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get beta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_beta(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set beta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_beta(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get gamma() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_gamma(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set gamma(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_gamma(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get alpha_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_alpha_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set alpha_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_alpha_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get alpha() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_alpha(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set alpha(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_alpha(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get zeta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_zeta(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set zeta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_zeta(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get v() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_v(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set v(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_v(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get u() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_u(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set u(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_u(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get zeta_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_zeta_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set zeta_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_zeta_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get v_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_v_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set v_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_v_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get u_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_u_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set u_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_u_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint8Array | undefined} joint_combiner_chal
    * @param {Uint8Array | undefined} joint_combiner
    * @param {Uint8Array} beta
    * @param {Uint8Array} gamma
    * @param {Uint8Array} alpha_chal
    * @param {Uint8Array} alpha
    * @param {Uint8Array} zeta
    * @param {Uint8Array} v
    * @param {Uint8Array} u
    * @param {Uint8Array} zeta_chal
    * @param {Uint8Array} v_chal
    * @param {Uint8Array} u_chal
    */
    constructor(joint_combiner_chal, joint_combiner, beta, gamma, alpha_chal, alpha, zeta, v, u, zeta_chal, v_chal, u_chal) {
        var ptr0 = isLikeNone(joint_combiner_chal) ? 0 : passArray8ToWasm0(joint_combiner_chal, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(joint_combiner) ? 0 : passArray8ToWasm0(joint_combiner, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(beta, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(gamma, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(alpha_chal, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passArray8ToWasm0(alpha, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        const ptr6 = passArray8ToWasm0(zeta, wasm.__wbindgen_malloc);
        const len6 = WASM_VECTOR_LEN;
        const ptr7 = passArray8ToWasm0(v, wasm.__wbindgen_malloc);
        const len7 = WASM_VECTOR_LEN;
        const ptr8 = passArray8ToWasm0(u, wasm.__wbindgen_malloc);
        const len8 = WASM_VECTOR_LEN;
        const ptr9 = passArray8ToWasm0(zeta_chal, wasm.__wbindgen_malloc);
        const len9 = WASM_VECTOR_LEN;
        const ptr10 = passArray8ToWasm0(v_chal, wasm.__wbindgen_malloc);
        const len10 = WASM_VECTOR_LEN;
        const ptr11 = passArray8ToWasm0(u_chal, wasm.__wbindgen_malloc);
        const len11 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfprandomoracles_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6, ptr7, len7, ptr8, len8, ptr9, len9, ptr10, len10, ptr11, len11);
        return WasmFpRandomOracles.__wrap(ret);
    }
}
module.exports.WasmFpRandomOracles = WasmFpRandomOracles;
/**
*/
class WasmFpShifts {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpShifts.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpshifts_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get s0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpdomain_group_gen(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpdomain_group_gen(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s2(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s2(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s3() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s3(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s3(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s3(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s4() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s4(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s4(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s4(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s5() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s5(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s5(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s5(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s6() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s6(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s6(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s6(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint8Array} s0
    * @param {Uint8Array} s1
    * @param {Uint8Array} s2
    * @param {Uint8Array} s3
    * @param {Uint8Array} s4
    * @param {Uint8Array} s5
    * @param {Uint8Array} s6
    */
    constructor(s0, s1, s2, s3, s4, s5, s6) {
        const ptr0 = passArray8ToWasm0(s0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(s1, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(s2, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(s3, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(s4, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passArray8ToWasm0(s5, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        const ptr6 = passArray8ToWasm0(s6, wasm.__wbindgen_malloc);
        const len6 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfpshifts_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6);
        return WasmFpShifts.__wrap(ret);
    }
}
module.exports.WasmFpShifts = WasmFpShifts;
/**
*/
class WasmFpSrs {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFpSrs.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpsrs_free(ptr);
    }
}
module.exports.WasmFpSrs = WasmFpSrs;
/**
*/
class WasmFqDomain {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqDomain.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqdomain_free(ptr);
    }
    /**
    * @returns {number}
    */
    get log_size_of_group() {
        const ret = wasm.__wbg_get_wasmfpdomain_log_size_of_group(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set log_size_of_group(arg0) {
        wasm.__wbg_set_wasmfpdomain_log_size_of_group(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {Uint8Array}
    */
    get group_gen() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqdomain_group_gen(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set group_gen(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqdomain_group_gen(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {number} log_size_of_group
    * @param {Uint8Array} group_gen
    */
    constructor(log_size_of_group, group_gen) {
        const ptr0 = passArray8ToWasm0(group_gen, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqdomain_new(log_size_of_group, ptr0, len0);
        return WasmFqDomain.__wrap(ret);
    }
}
module.exports.WasmFqDomain = WasmFqDomain;
/**
*/
class WasmFqGate {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqGate.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqgate_free(ptr);
    }
    /**
    * @returns {number}
    */
    get typ() {
        const ret = wasm.__wbg_get_wasmfqgate_typ(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set typ(arg0) {
        wasm.__wbg_set_wasmfqgate_typ(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {WasmGateWires}
    */
    get wires() {
        const ret = wasm.__wbg_get_wasmfqgate_wires(this.__wbg_ptr);
        return WasmGateWires.__wrap(ret);
    }
    /**
    * @param {WasmGateWires} arg0
    */
    set wires(arg0) {
        _assertClass(arg0, WasmGateWires);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfqgate_wires(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {number} typ
    * @param {WasmGateWires} wires
    * @param {Uint8Array} coeffs
    */
    constructor(typ, wires, coeffs) {
        _assertClass(wires, WasmGateWires);
        var ptr0 = wires.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(coeffs, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqgate_new(typ, ptr0, ptr1, len1);
        return WasmFqGate.__wrap(ret);
    }
}
module.exports.WasmFqGate = WasmFqGate;
/**
*/
class WasmFqGateVector {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqGateVector.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqgatevector_free(ptr);
    }
}
module.exports.WasmFqGateVector = WasmFqGateVector;
/**
*/
class WasmFqOpeningProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqOpeningProof.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqopeningproof_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get z1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqopeningproof_z1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set z1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqopeningproof_z1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get z2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqopeningproof_z2(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set z2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqopeningproof_z2(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint32Array} lr_0
    * @param {Uint32Array} lr_1
    * @param {WasmGPallas} delta
    * @param {Uint8Array} z1
    * @param {Uint8Array} z2
    * @param {WasmGPallas} sg
    */
    constructor(lr_0, lr_1, delta, z1, z2, sg) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(delta, WasmGPallas);
        var ptr2 = delta.__destroy_into_raw();
        const ptr3 = passArray8ToWasm0(z1, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(z2, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        _assertClass(sg, WasmGPallas);
        var ptr5 = sg.__destroy_into_raw();
        const ret = wasm.wasmfqopeningproof_new(ptr0, len0, ptr1, len1, ptr2, ptr3, len3, ptr4, len4, ptr5);
        return WasmFqOpeningProof.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get lr_0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqopeningproof_lr_0(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {Uint32Array}
    */
    get lr_1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqopeningproof_lr_1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {WasmGPallas}
    */
    get delta() {
        const ret = wasm.wasmfpopeningproof_delta(this.__wbg_ptr);
        return WasmGPallas.__wrap(ret);
    }
    /**
    * @returns {WasmGPallas}
    */
    get sg() {
        const ret = wasm.wasmfpopeningproof_sg(this.__wbg_ptr);
        return WasmGPallas.__wrap(ret);
    }
    /**
    * @param {Uint32Array} lr_0
    */
    set lr_0(lr_0) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqopeningproof_set_lr_0(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint32Array} lr_1
    */
    set lr_1(lr_1) {
        const ptr0 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqopeningproof_set_lr_1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmGPallas} delta
    */
    set delta(delta) {
        _assertClass(delta, WasmGPallas);
        var ptr0 = delta.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_delta(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmGPallas} sg
    */
    set sg(sg) {
        _assertClass(sg, WasmGPallas);
        var ptr0 = sg.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_sg(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFqOpeningProof = WasmFqOpeningProof;
/**
*/
class WasmFqOracles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqOracles.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqoracles_free(ptr);
    }
    /**
    * @returns {WasmFqRandomOracles}
    */
    get o() {
        const ret = wasm.__wbg_get_wasmfqoracles_o(this.__wbg_ptr);
        return WasmFqRandomOracles.__wrap(ret);
    }
    /**
    * @param {WasmFqRandomOracles} arg0
    */
    set o(arg0) {
        _assertClass(arg0, WasmFqRandomOracles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfqoracles_o(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Uint8Array}
    */
    get p_eval0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqoracles_p_eval0(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set p_eval0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_p_eval0(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get p_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqoracles_p_eval1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set p_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_p_eval1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get digest_before_evaluations() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqoracles_digest_before_evaluations(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set digest_before_evaluations(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_digest_before_evaluations(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmFqRandomOracles} o
    * @param {Uint8Array} p_eval0
    * @param {Uint8Array} p_eval1
    * @param {Uint8Array} opening_prechallenges
    * @param {Uint8Array} digest_before_evaluations
    */
    constructor(o, p_eval0, p_eval1, opening_prechallenges, digest_before_evaluations) {
        _assertClass(o, WasmFqRandomOracles);
        var ptr0 = o.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(p_eval0, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(p_eval1, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(opening_prechallenges, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(digest_before_evaluations, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqoracles_new(ptr0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
        return WasmFqOracles.__wrap(ret);
    }
    /**
    * @returns {Uint8Array}
    */
    get opening_prechallenges() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqoracles_opening_prechallenges(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} x
    */
    set opening_prechallenges(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqoracles_set_opening_prechallenges(this.__wbg_ptr, ptr0, len0);
    }
}
module.exports.WasmFqOracles = WasmFqOracles;
/**
*/
class WasmFqPlonkVerificationEvals {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqPlonkVerificationEvals.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqplonkverificationevals_free(ptr);
    }
    /**
    * @param {Uint32Array} sigma_comm
    * @param {Uint32Array} coefficients_comm
    * @param {WasmFqPolyComm} generic_comm
    * @param {WasmFqPolyComm} psm_comm
    * @param {WasmFqPolyComm} complete_add_comm
    * @param {WasmFqPolyComm} mul_comm
    * @param {WasmFqPolyComm} emul_comm
    * @param {WasmFqPolyComm} endomul_scalar_comm
    */
    constructor(sigma_comm, coefficients_comm, generic_comm, psm_comm, complete_add_comm, mul_comm, emul_comm, endomul_scalar_comm) {
        const ptr0 = passArray32ToWasm0(sigma_comm, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(coefficients_comm, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(generic_comm, WasmFqPolyComm);
        _assertClass(psm_comm, WasmFqPolyComm);
        _assertClass(complete_add_comm, WasmFqPolyComm);
        _assertClass(mul_comm, WasmFqPolyComm);
        _assertClass(emul_comm, WasmFqPolyComm);
        _assertClass(endomul_scalar_comm, WasmFqPolyComm);
        const ret = wasm.wasmfqplonkverificationevals_new(ptr0, len0, ptr1, len1, generic_comm.__wbg_ptr, psm_comm.__wbg_ptr, complete_add_comm.__wbg_ptr, mul_comm.__wbg_ptr, emul_comm.__wbg_ptr, endomul_scalar_comm.__wbg_ptr);
        return WasmFqPlonkVerificationEvals.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get sigma_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqplonkverificationevals_sigma_comm(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint32Array} x
    */
    set sigma_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqplonkverificationevals_set_sigma_comm(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint32Array}
    */
    get coefficients_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqplonkverificationevals_coefficients_comm(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint32Array} x
    */
    set coefficients_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqplonkverificationevals_set_coefficients_comm(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get generic_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set generic_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get psm_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set psm_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get complete_add_comm() {
        const ret = wasm.wasmfpplonkverificationevals_complete_add_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set complete_add_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_complete_add_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get mul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_mul_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set mul_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_mul_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get emul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_emul_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set emul_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_emul_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get endomul_scalar_comm() {
        const ret = wasm.wasmfpplonkverificationevals_endomul_scalar_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set endomul_scalar_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_endomul_scalar_comm(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFqPlonkVerificationEvals = WasmFqPlonkVerificationEvals;
/**
*/
class WasmFqPlonkVerifierIndex {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqPlonkVerifierIndex.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqplonkverifierindex_free(ptr);
    }
    /**
    * @returns {WasmFqDomain}
    */
    get domain() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_domain(this.__wbg_ptr);
        return WasmFqDomain.__wrap(ret);
    }
    /**
    * @param {WasmFqDomain} arg0
    */
    set domain(arg0) {
        _assertClass(arg0, WasmFqDomain);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpplonkverifierindex_domain(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {number}
    */
    get max_poly_size() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_max_poly_size(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set max_poly_size(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_max_poly_size(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get public_() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_public_(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set public_(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_public_(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get prev_challenges() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_prev_challenges(this.__wbg_ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set prev_challenges(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_prev_challenges(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {WasmFqShifts}
    */
    get shifts() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_shifts(this.__wbg_ptr);
        return WasmFqShifts.__wrap(ret);
    }
    /**
    * @param {WasmFqShifts} arg0
    */
    set shifts(arg0) {
        _assertClass(arg0, WasmFqShifts);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpplonkverifierindex_shifts(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmFqDomain} domain
    * @param {number} max_poly_size
    * @param {number} public_
    * @param {number} prev_challenges
    * @param {WasmFqSrs} srs
    * @param {WasmFqPlonkVerificationEvals} evals
    * @param {WasmFqShifts} shifts
    */
    constructor(domain, max_poly_size, public_, prev_challenges, srs, evals, shifts) {
        _assertClass(domain, WasmFqDomain);
        _assertClass(srs, WasmFqSrs);
        _assertClass(evals, WasmFqPlonkVerificationEvals);
        _assertClass(shifts, WasmFqShifts);
        const ret = wasm.wasmfqplonkverifierindex_new(domain.__wbg_ptr, max_poly_size, public_, prev_challenges, srs.__wbg_ptr, evals.__wbg_ptr, shifts.__wbg_ptr);
        return WasmFqPlonkVerifierIndex.__wrap(ret);
    }
    /**
    * @returns {WasmFqSrs}
    */
    get srs() {
        const ret = wasm.wasmfpplonkverifierindex_srs(this.__wbg_ptr);
        return WasmFqSrs.__wrap(ret);
    }
    /**
    * @param {WasmFqSrs} x
    */
    set srs(x) {
        _assertClass(x, WasmFqSrs);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverifierindex_set_srs(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {WasmFqPlonkVerificationEvals}
    */
    get evals() {
        const ret = wasm.wasmfqplonkverifierindex_evals(this.__wbg_ptr);
        return WasmFqPlonkVerificationEvals.__wrap(ret);
    }
    /**
    * @param {WasmFqPlonkVerificationEvals} x
    */
    set evals(x) {
        _assertClass(x, WasmFqPlonkVerificationEvals);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverifierindex_set_evals(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFqPlonkVerifierIndex = WasmFqPlonkVerifierIndex;
/**
*/
class WasmFqPolyComm {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqPolyComm.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqpolycomm_free(ptr);
    }
    /**
    * @param {Uint32Array} unshifted
    * @param {WasmGPallas | undefined} shifted
    */
    constructor(unshifted, shifted) {
        const ptr0 = passArray32ToWasm0(unshifted, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        let ptr1 = 0;
        if (!isLikeNone(shifted)) {
            _assertClass(shifted, WasmGPallas);
            ptr1 = shifted.__destroy_into_raw();
        }
        const ret = wasm.wasmfqpolycomm_new(ptr0, len0, ptr1);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get unshifted() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqpolycomm_unshifted(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint32Array} x
    */
    set unshifted(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqpolycomm_set_unshifted(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {WasmGPallas | undefined}
    */
    get shifted() {
        const ret = wasm.__wbg_get_wasmfqpolycomm_shifted(this.__wbg_ptr);
        return ret === 0 ? undefined : WasmGPallas.__wrap(ret);
    }
    /**
    * @param {WasmGPallas | undefined} arg0
    */
    set shifted(arg0) {
        let ptr0 = 0;
        if (!isLikeNone(arg0)) {
            _assertClass(arg0, WasmGPallas);
            ptr0 = arg0.__destroy_into_raw();
        }
        wasm.__wbg_set_wasmfqpolycomm_shifted(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFqPolyComm = WasmFqPolyComm;
/**
*/
class WasmFqProverCommitments {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqProverCommitments.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqprovercommitments_free(ptr);
    }
    /**
    * @param {Uint32Array} w_comm
    * @param {WasmFqPolyComm} z_comm
    * @param {WasmFqPolyComm} t_comm
    */
    constructor(w_comm, z_comm, t_comm) {
        const ptr0 = passArray32ToWasm0(w_comm, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(z_comm, WasmFqPolyComm);
        var ptr1 = z_comm.__destroy_into_raw();
        _assertClass(t_comm, WasmFqPolyComm);
        var ptr2 = t_comm.__destroy_into_raw();
        const ret = wasm.wasmfqprovercommitments_new(ptr0, len0, ptr1, ptr2);
        return WasmFqProverCommitments.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get w_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqprovercommitments_w_comm(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get z_comm() {
        const ret = wasm.wasmfqprovercommitments_z_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get t_comm() {
        const ret = wasm.wasmfqprovercommitments_t_comm(this.__wbg_ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {Uint32Array} x
    */
    set w_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqprovercommitments_set_w_comm(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set z_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqprovercommitments_set_z_comm(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set t_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqprovercommitments_set_t_comm(this.__wbg_ptr, ptr0);
    }
}
module.exports.WasmFqProverCommitments = WasmFqProverCommitments;
/**
*/
class WasmFqProverProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqProverProof.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqproverproof_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get ft_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqproverproof_ft_eval1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set ft_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqproverproof_ft_eval1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmFqProverCommitments} commitments
    * @param {WasmFqOpeningProof} proof
    * @param {any} evals
    * @param {Uint8Array} ft_eval1
    * @param {Uint8Array} public_
    * @param {WasmVecVecFq} prev_challenges_scalars
    * @param {Uint32Array} prev_challenges_comms
    */
    constructor(commitments, proof, evals, ft_eval1, public_, prev_challenges_scalars, prev_challenges_comms) {
        _assertClass(commitments, WasmFqProverCommitments);
        var ptr0 = commitments.__destroy_into_raw();
        _assertClass(proof, WasmFqOpeningProof);
        var ptr1 = proof.__destroy_into_raw();
        const ptr2 = passArray8ToWasm0(ft_eval1, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        _assertClass(prev_challenges_scalars, WasmVecVecFq);
        var ptr4 = prev_challenges_scalars.__destroy_into_raw();
        const ptr5 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqproverproof_new(ptr0, ptr1, addHeapObject(evals), ptr2, len2, ptr3, len3, ptr4, ptr5, len5);
        return WasmFqProverProof.__wrap(ret);
    }
    /**
    * @returns {WasmFqProverCommitments}
    */
    get commitments() {
        const ret = wasm.wasmfqproverproof_commitments(this.__wbg_ptr);
        return WasmFqProverCommitments.__wrap(ret);
    }
    /**
    * @returns {WasmFqOpeningProof}
    */
    get proof() {
        const ret = wasm.wasmfpproverproof_proof(this.__wbg_ptr);
        return WasmFqOpeningProof.__wrap(ret);
    }
    /**
    * @returns {any}
    */
    get evals() {
        const ret = wasm.wasmfqproverproof_evals(this.__wbg_ptr);
        return takeObject(ret);
    }
    /**
    * @returns {Uint8Array}
    */
    get public_() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproverproof_public_(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {WasmVecVecFq}
    */
    get prev_challenges_scalars() {
        const ret = wasm.wasmfqproverproof_prev_challenges_scalars(this.__wbg_ptr);
        return WasmVecVecFq.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
    */
    get prev_challenges_comms() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproverproof_prev_challenges_comms(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {WasmFqProverCommitments} commitments
    */
    set commitments(commitments) {
        _assertClass(commitments, WasmFqProverCommitments);
        var ptr0 = commitments.__destroy_into_raw();
        wasm.wasmfpproverproof_set_commitments(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {WasmFqOpeningProof} proof
    */
    set proof(proof) {
        _assertClass(proof, WasmFqOpeningProof);
        var ptr0 = proof.__destroy_into_raw();
        wasm.wasmfpproverproof_set_proof(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {any} evals
    */
    set evals(evals) {
        wasm.wasmfqproverproof_set_evals(this.__wbg_ptr, addHeapObject(evals));
    }
    /**
    * @param {Uint8Array} public_
    */
    set public_(public_) {
        const ptr0 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproverproof_set_public_(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {WasmVecVecFq} prev_challenges_scalars
    */
    set prev_challenges_scalars(prev_challenges_scalars) {
        _assertClass(prev_challenges_scalars, WasmVecVecFq);
        var ptr0 = prev_challenges_scalars.__destroy_into_raw();
        wasm.wasmfpproverproof_set_prev_challenges_scalars(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {Uint32Array} prev_challenges_comms
    */
    set prev_challenges_comms(prev_challenges_comms) {
        const ptr0 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproverproof_set_prev_challenges_comms(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {string}
    */
    serialize() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproverproof_serialize(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1);
        }
    }
}
module.exports.WasmFqProverProof = WasmFqProverProof;
/**
*/
class WasmFqRandomOracles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqRandomOracles.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqrandomoracles_free(ptr);
    }
    /**
    * @returns {Uint8Array | undefined}
    */
    get joint_combiner_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_joint_combiner_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v1;
            if (r0 !== 0) {
                v1 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner_chal(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_joint_combiner_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array | undefined}
    */
    get joint_combiner() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_joint_combiner(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v1;
            if (r0 !== 0) {
                v1 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_joint_combiner(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get beta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_beta(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set beta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_beta(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get gamma() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_gamma(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set gamma(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_gamma(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get alpha_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_alpha_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set alpha_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_alpha_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get alpha() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_alpha(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set alpha(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_alpha(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get zeta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_zeta(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set zeta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_zeta(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get v() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_v(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set v(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_v(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get u() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_u(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set u(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_u(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get zeta_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_zeta_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set zeta_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_zeta_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get v_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_v_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set v_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_v_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get u_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_u_chal(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set u_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_u_chal(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint8Array | undefined} joint_combiner_chal
    * @param {Uint8Array | undefined} joint_combiner
    * @param {Uint8Array} beta
    * @param {Uint8Array} gamma
    * @param {Uint8Array} alpha_chal
    * @param {Uint8Array} alpha
    * @param {Uint8Array} zeta
    * @param {Uint8Array} v
    * @param {Uint8Array} u
    * @param {Uint8Array} zeta_chal
    * @param {Uint8Array} v_chal
    * @param {Uint8Array} u_chal
    */
    constructor(joint_combiner_chal, joint_combiner, beta, gamma, alpha_chal, alpha, zeta, v, u, zeta_chal, v_chal, u_chal) {
        var ptr0 = isLikeNone(joint_combiner_chal) ? 0 : passArray8ToWasm0(joint_combiner_chal, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(joint_combiner) ? 0 : passArray8ToWasm0(joint_combiner, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(beta, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(gamma, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(alpha_chal, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passArray8ToWasm0(alpha, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        const ptr6 = passArray8ToWasm0(zeta, wasm.__wbindgen_malloc);
        const len6 = WASM_VECTOR_LEN;
        const ptr7 = passArray8ToWasm0(v, wasm.__wbindgen_malloc);
        const len7 = WASM_VECTOR_LEN;
        const ptr8 = passArray8ToWasm0(u, wasm.__wbindgen_malloc);
        const len8 = WASM_VECTOR_LEN;
        const ptr9 = passArray8ToWasm0(zeta_chal, wasm.__wbindgen_malloc);
        const len9 = WASM_VECTOR_LEN;
        const ptr10 = passArray8ToWasm0(v_chal, wasm.__wbindgen_malloc);
        const len10 = WASM_VECTOR_LEN;
        const ptr11 = passArray8ToWasm0(u_chal, wasm.__wbindgen_malloc);
        const len11 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqrandomoracles_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6, ptr7, len7, ptr8, len8, ptr9, len9, ptr10, len10, ptr11, len11);
        return WasmFqRandomOracles.__wrap(ret);
    }
}
module.exports.WasmFqRandomOracles = WasmFqRandomOracles;
/**
*/
class WasmFqShifts {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqShifts.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqshifts_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get s0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqdomain_group_gen(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqdomain_group_gen(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s1(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s1(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s2(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s2(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s3() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s3(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s3(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s3(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s4() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s4(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s4(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s4(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s5() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s5(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s5(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s5(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get s6() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s6(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set s6(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s6(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {Uint8Array} s0
    * @param {Uint8Array} s1
    * @param {Uint8Array} s2
    * @param {Uint8Array} s3
    * @param {Uint8Array} s4
    * @param {Uint8Array} s5
    * @param {Uint8Array} s6
    */
    constructor(s0, s1, s2, s3, s4, s5, s6) {
        const ptr0 = passArray8ToWasm0(s0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(s1, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(s2, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(s3, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(s4, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passArray8ToWasm0(s5, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        const ptr6 = passArray8ToWasm0(s6, wasm.__wbindgen_malloc);
        const len6 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqshifts_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6);
        return WasmFqShifts.__wrap(ret);
    }
}
module.exports.WasmFqShifts = WasmFqShifts;
/**
*/
class WasmFqSrs {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFqSrs.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqsrs_free(ptr);
    }
}
module.exports.WasmFqSrs = WasmFqSrs;
/**
*/
class WasmGPallas {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmGPallas.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmgpallas_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get x() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgpallas_x(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set x(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgpallas_x(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get y() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgpallas_y(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set y(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgpallas_y(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {boolean}
    */
    get infinity() {
        const ret = wasm.__wbg_get_wasmgpallas_infinity(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
    * @param {boolean} arg0
    */
    set infinity(arg0) {
        wasm.__wbg_set_wasmgpallas_infinity(this.__wbg_ptr, arg0);
    }
}
module.exports.WasmGPallas = WasmGPallas;
/**
*/
class WasmGVesta {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmGVesta.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmgvesta_free(ptr);
    }
    /**
    * @returns {Uint8Array}
    */
    get x() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgvesta_x(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set x(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgvesta_x(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
    */
    get y() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgvesta_y(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} arg0
    */
    set y(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgvesta_y(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @returns {boolean}
    */
    get infinity() {
        const ret = wasm.__wbg_get_wasmgpallas_infinity(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
    * @param {boolean} arg0
    */
    set infinity(arg0) {
        wasm.__wbg_set_wasmgpallas_infinity(this.__wbg_ptr, arg0);
    }
}
module.exports.WasmGVesta = WasmGVesta;
/**
*/
class WasmGateWires {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmGateWires.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmgatewires_free(ptr);
    }
    /**
    * @returns {Wire}
    */
    get 0() {
        const ret = wasm.__wbg_get_wasmgatewires_0(this.__wbg_ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 0(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_0(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 1() {
        const ret = wasm.__wbg_get_wasmgatewires_1(this.__wbg_ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 1(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_1(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 2() {
        const ret = wasm.__wbg_get_wasmgatewires_2(this.__wbg_ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 2(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_2(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 3() {
        const ret = wasm.__wbg_get_wasmgatewires_3(this.__wbg_ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 3(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_3(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 4() {
        const ret = wasm.__wbg_get_wasmgatewires_4(this.__wbg_ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 4(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_4(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 5() {
        const ret = wasm.__wbg_get_wasmgatewires_5(this.__wbg_ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 5(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_5(this.__wbg_ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 6() {
        const ret = wasm.__wbg_get_wasmgatewires_6(this.__wbg_ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 6(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_6(this.__wbg_ptr, ptr0);
    }
    /**
    * @param {Wire} w0
    * @param {Wire} w1
    * @param {Wire} w2
    * @param {Wire} w3
    * @param {Wire} w4
    * @param {Wire} w5
    * @param {Wire} w6
    */
    constructor(w0, w1, w2, w3, w4, w5, w6) {
        _assertClass(w0, Wire);
        var ptr0 = w0.__destroy_into_raw();
        _assertClass(w1, Wire);
        var ptr1 = w1.__destroy_into_raw();
        _assertClass(w2, Wire);
        var ptr2 = w2.__destroy_into_raw();
        _assertClass(w3, Wire);
        var ptr3 = w3.__destroy_into_raw();
        _assertClass(w4, Wire);
        var ptr4 = w4.__destroy_into_raw();
        _assertClass(w5, Wire);
        var ptr5 = w5.__destroy_into_raw();
        _assertClass(w6, Wire);
        var ptr6 = w6.__destroy_into_raw();
        const ret = wasm.wasmgatewires_new(ptr0, ptr1, ptr2, ptr3, ptr4, ptr5, ptr6);
        return WasmGateWires.__wrap(ret);
    }
}
module.exports.WasmGateWires = WasmGateWires;
/**
*/
class WasmPallasGProjective {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmPallasGProjective.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpallasgprojective_free(ptr);
    }
}
module.exports.WasmPallasGProjective = WasmPallasGProjective;
/**
* Boxed so that we don't store large proving indexes in the OCaml heap.
*/
class WasmPastaFpPlonkIndex {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmPastaFpPlonkIndex.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpastafpplonkindex_free(ptr);
    }
}
module.exports.WasmPastaFpPlonkIndex = WasmPastaFpPlonkIndex;
/**
* Boxed so that we don't store large proving indexes in the OCaml heap.
*/
class WasmPastaFqPlonkIndex {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmPastaFqPlonkIndex.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmpastafqplonkindex_free(ptr);
    }
}
module.exports.WasmPastaFqPlonkIndex = WasmPastaFqPlonkIndex;
/**
*/
class WasmVecVecFp {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmVecVecFp.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmvecvecfp_free(ptr);
    }
    /**
    * @param {number} n
    */
    constructor(n) {
        const ret = wasm.wasmvecvecfp_create(n);
        return WasmVecVecFp.__wrap(ret);
    }
    /**
    * @param {Uint8Array} x
    */
    push(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfp_push(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {number} i
    * @returns {Uint8Array}
    */
    get(i) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmvecvecfp_get(retptr, this.__wbg_ptr, i);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number} i
    * @param {Uint8Array} x
    */
    set(i, x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfp_set(this.__wbg_ptr, i, ptr0, len0);
    }
}
module.exports.WasmVecVecFp = WasmVecVecFp;
/**
*/
class WasmVecVecFpPolyComm {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmVecVecFpPolyComm.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmvecvecfppolycomm_free(ptr);
    }
    /**
    * @param {number} n
    */
    constructor(n) {
        const ret = wasm.wasmvecvecfp_create(n);
        return WasmVecVecFpPolyComm.__wrap(ret);
    }
    /**
    * @param {Uint32Array} x
    */
    push(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfppolycomm_push(this.__wbg_ptr, ptr0, len0);
    }
}
module.exports.WasmVecVecFpPolyComm = WasmVecVecFpPolyComm;
/**
*/
class WasmVecVecFq {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmVecVecFq.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmvecvecfq_free(ptr);
    }
    /**
    * @param {number} n
    */
    constructor(n) {
        const ret = wasm.wasmvecvecfp_create(n);
        return WasmVecVecFq.__wrap(ret);
    }
    /**
    * @param {Uint8Array} x
    */
    push(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfq_push(this.__wbg_ptr, ptr0, len0);
    }
    /**
    * @param {number} i
    * @returns {Uint8Array}
    */
    get(i) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmvecvecfq_get(retptr, this.__wbg_ptr, i);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number} i
    * @param {Uint8Array} x
    */
    set(i, x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfq_set(this.__wbg_ptr, i, ptr0, len0);
    }
}
module.exports.WasmVecVecFq = WasmVecVecFq;
/**
*/
class WasmVecVecFqPolyComm {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmVecVecFqPolyComm.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmvecvecfqpolycomm_free(ptr);
    }
    /**
    * @param {number} n
    */
    constructor(n) {
        const ret = wasm.wasmvecvecfp_create(n);
        return WasmVecVecFqPolyComm.__wrap(ret);
    }
    /**
    * @param {Uint32Array} x
    */
    push(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfqpolycomm_push(this.__wbg_ptr, ptr0, len0);
    }
}
module.exports.WasmVecVecFqPolyComm = WasmVecVecFqPolyComm;
/**
*/
class WasmVestaGProjective {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmVestaGProjective.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmvestagprojective_free(ptr);
    }
}
module.exports.WasmVestaGProjective = WasmVestaGProjective;
/**
* Wire documents the other cell that is wired to this one.
* If the cell represents an internal wire, an input to the circuit,
* or a final output of the circuit, the cell references itself.
*/
class Wire {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Wire.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wire_free(ptr);
    }
    /**
    * @returns {number}
    */
    get row() {
        const ret = wasm.__wbg_get_wire_row(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set row(arg0) {
        wasm.__wbg_set_wire_row(this.__wbg_ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get col() {
        const ret = wasm.__wbg_get_wire_col(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set col(arg0) {
        wasm.__wbg_set_wire_col(this.__wbg_ptr, arg0);
    }
    /**
    * @param {number} row
    * @param {number} col
    * @returns {Wire}
    */
    static create(row, col) {
        const ret = wasm.wire_create(row, col);
        return Wire.__wrap(ret);
    }
}
module.exports.Wire = Wire;

module.exports.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
};

module.exports.__wbindgen_number_new = function(arg0) {
    const ret = arg0;
    return addHeapObject(ret);
};

module.exports.__wbg_alert_ceb64c1bad1f3790 = function(arg0, arg1) {
    alert(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbg_log_bb81d0229855b402 = function(arg0, arg1) {
    console.log(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

module.exports.__wbindgen_error_new = function(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_startWorkers_f430e3766320935f = function(arg0, arg1, arg2) {
    const ret = startWorkers(takeObject(arg0), takeObject(arg1), PoolBuilder.__wrap(arg2));
    return addHeapObject(ret);
};

module.exports.__wbg_terminateWorkers_bf82de78d64704cb = function() {
    const ret = terminateWorkers();
    return addHeapObject(ret);
};

module.exports.__wbg_new_abda76e883ba8a5f = function() {
    const ret = new Error();
    return addHeapObject(ret);
};

module.exports.__wbg_stack_658279fe44541cf6 = function(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbg_error_f851667af71bcfc6 = function(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1);
    }
};

module.exports.__wbindgen_object_clone_ref = function(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_is_object = function(arg0) {
    const val = getObject(arg0);
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

module.exports.__wbg_crypto_70a96de3b6b73dac = function(arg0) {
    const ret = getObject(arg0).crypto;
    return addHeapObject(ret);
};

module.exports.__wbg_process_dd1577445152112e = function(arg0) {
    const ret = getObject(arg0).process;
    return addHeapObject(ret);
};

module.exports.__wbg_versions_58036bec3add9e6f = function(arg0) {
    const ret = getObject(arg0).versions;
    return addHeapObject(ret);
};

module.exports.__wbg_node_6a9d28205ed5b0d8 = function(arg0) {
    const ret = getObject(arg0).node;
    return addHeapObject(ret);
};

module.exports.__wbindgen_is_string = function(arg0) {
    const ret = typeof(getObject(arg0)) === 'string';
    return ret;
};

module.exports.__wbg_msCrypto_adbc770ec9eca9c7 = function(arg0) {
    const ret = getObject(arg0).msCrypto;
    return addHeapObject(ret);
};

module.exports.__wbg_require_f05d779769764e82 = function() { return handleError(function () {
    const ret = module.require;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbindgen_is_function = function(arg0) {
    const ret = typeof(getObject(arg0)) === 'function';
    return ret;
};

module.exports.__wbg_getRandomValues_3774744e221a22ad = function() { return handleError(function (arg0, arg1) {
    getObject(arg0).getRandomValues(getObject(arg1));
}, arguments) };

module.exports.__wbg_randomFillSync_e950366c42764a07 = function() { return handleError(function (arg0, arg1) {
    getObject(arg0).randomFillSync(takeObject(arg1));
}, arguments) };

module.exports.__wbg_get_7303ed2ef026b2f5 = function(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
};

module.exports.__wbg_length_820c786973abdd8a = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_new_0394642eae39db16 = function() {
    const ret = new Array();
    return addHeapObject(ret);
};

module.exports.__wbg_newnoargs_c9e6043b8ad84109 = function(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_call_557a2f2deacc4912 = function() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_self_742dd6eab3e9211e = function() { return handleError(function () {
    const ret = self.self;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_window_c409e731db53a0e2 = function() { return handleError(function () {
    const ret = window.window;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_globalThis_b70c095388441f2d = function() { return handleError(function () {
    const ret = globalThis.globalThis;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_global_1c72617491ed7194 = function() { return handleError(function () {
    const ret = global.global;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbindgen_is_undefined = function(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

module.exports.__wbg_set_b4da98d504ac6091 = function(arg0, arg1, arg2) {
    getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
};

module.exports.__wbg_isArray_04e59fb73f78ab5b = function(arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
};

module.exports.__wbg_instanceof_ArrayBuffer_ef2632aa0d4bfff8 = function(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof ArrayBuffer;
    } catch {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_call_587b30eea3e09332 = function() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_buffer_55ba7a6b1b92e2ac = function(arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

module.exports.__wbg_newwithbyteoffsetandlength_88d1d8be5df94b9b = function(arg0, arg1, arg2) {
    const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbg_new_09938a7d020f049b = function(arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_set_3698e3ca519b3c3c = function(arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
};

module.exports.__wbg_length_0aab7ffd65ad19ed = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_instanceof_Uint8Array_1349640af2da2e88 = function(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Uint8Array;
    } catch {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_newwithlength_89eeca401d8918c2 = function(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbg_subarray_d82be056deb4ad27 = function(arg0, arg1, arg2) {
    const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_debug_string = function(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbindgen_memory = function() {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

const path = require('path').join(__dirname, 'plonk_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

wasm.__wbindgen_start();

