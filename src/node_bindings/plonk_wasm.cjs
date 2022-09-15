let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
imports['env'] = require('env');
let wasm;
const { TextDecoder, TextEncoder } = require(`util`);

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0;
function getUint8Memory0() {
    if (cachedUint8Memory0.buffer !== wasm.memory.buffer) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().slice(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 36) return;
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
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

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
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedInt32Memory0;
function getInt32Memory0() {
    if (cachedInt32Memory0.buffer !== wasm.memory.buffer) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
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
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_to_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
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
module.exports.caml_bigint_256_of_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_of_bytes(retptr, ptr0, len0);
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
module.exports.caml_bigint_256_deep_copy = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_bigint_256_deep_copy(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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
    var ptr0 = gate.ptr;
    gate.ptr = 0;
    wasm.caml_pasta_fp_plonk_gate_vector_add(v.ptr, ptr0);
};

/**
* @param {WasmFpGateVector} v
* @param {number} i
* @returns {WasmFpGate}
*/
module.exports.caml_pasta_fp_plonk_gate_vector_get = function(v, i) {
    _assertClass(v, WasmFpGateVector);
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_get(v.ptr, i);
    return WasmFpGate.__wrap(ret);
};

/**
* @param {WasmFpGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
module.exports.caml_pasta_fp_plonk_gate_vector_wrap = function(v, t, h) {
    _assertClass(v, WasmFpGateVector);
    _assertClass(t, Wire);
    var ptr0 = t.ptr;
    t.ptr = 0;
    _assertClass(h, Wire);
    var ptr1 = h.ptr;
    h.ptr = 0;
    wasm.caml_pasta_fp_plonk_gate_vector_wrap(v.ptr, ptr0, ptr1);
};

/**
* @param {WasmFpGateVector} v
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_plonk_gate_vector_digest = function(v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFpGateVector);
        wasm.caml_pasta_fp_plonk_gate_vector_digest(retptr, v.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @returns {WasmFqGateVector}
*/
module.exports.caml_pasta_fq_plonk_gate_vector_create = function() {
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_create();
    return WasmFqGateVector.__wrap(ret);
};

/**
* @param {WasmFqGateVector} v
* @param {WasmFqGate} gate
*/
module.exports.caml_pasta_fq_plonk_gate_vector_add = function(v, gate) {
    _assertClass(v, WasmFqGateVector);
    _assertClass(gate, WasmFqGate);
    var ptr0 = gate.ptr;
    gate.ptr = 0;
    wasm.caml_pasta_fq_plonk_gate_vector_add(v.ptr, ptr0);
};

/**
* @param {WasmFqGateVector} v
* @param {number} i
* @returns {WasmFqGate}
*/
module.exports.caml_pasta_fq_plonk_gate_vector_get = function(v, i) {
    _assertClass(v, WasmFqGateVector);
    const ret = wasm.caml_pasta_fq_plonk_gate_vector_get(v.ptr, i);
    return WasmFqGate.__wrap(ret);
};

/**
* @param {WasmFqGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
module.exports.caml_pasta_fq_plonk_gate_vector_wrap = function(v, t, h) {
    _assertClass(v, WasmFqGateVector);
    _assertClass(t, Wire);
    var ptr0 = t.ptr;
    t.ptr = 0;
    _assertClass(h, Wire);
    var ptr1 = h.ptr;
    h.ptr = 0;
    wasm.caml_pasta_fq_plonk_gate_vector_wrap(v.ptr, ptr0, ptr1);
};

/**
* @param {WasmFqGateVector} v
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fq_plonk_gate_vector_digest = function(v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFqGateVector);
        wasm.caml_pasta_fq_plonk_gate_vector_digest(retptr, v.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
    const ret = wasm.caml_vesta_add(x.ptr, y.ptr);
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
    const ret = wasm.caml_vesta_sub(x.ptr, y.ptr);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_negate = function(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_negate(x.ptr);
    return WasmVestaGProjective.__wrap(ret);
};

/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_double = function(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_double(x.ptr);
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
    const ret = wasm.caml_vesta_scale(x.ptr, ptr0, len0);
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
    const ret = wasm.caml_vesta_to_affine(x.ptr);
    return WasmGVesta.__wrap(ret);
};

/**
* @param {WasmGVesta} x
* @returns {WasmVestaGProjective}
*/
module.exports.caml_vesta_of_affine = function(x) {
    _assertClass(x, WasmGVesta);
    var ptr0 = x.ptr;
    x.ptr = 0;
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
    var ptr0 = x.ptr;
    x.ptr = 0;
    const ret = wasm.caml_vesta_affine_deep_copy(ptr0);
    return WasmGVesta.__wrap(ret);
};

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
* @returns {number}
*/
module.exports.caml_pasta_fp_size_in_bits = function() {
    const ret = wasm.caml_pasta_fp_size_in_bits();
    return ret;
};

/**
* @returns {Uint8Array}
*/
module.exports.caml_pasta_fp_size = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_size(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

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
module.exports.caml_pasta_fp_negate = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_negate(retptr, ptr0, len0);
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
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
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
        let v1;
        if (r0 !== 0) {
            v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v1;
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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
        let v1;
        if (r0 !== 0) {
            v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v1;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {string}
*/
module.exports.caml_pasta_fp_to_string = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_to_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
module.exports.caml_pasta_fp_two_adic_root_of_unity = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fp_two_adic_root_of_unity(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
module.exports.caml_pasta_fp_of_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_of_bytes(retptr, ptr0, len0);
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
module.exports.caml_pasta_fp_deep_copy = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_deep_copy(retptr, ptr0, len0);
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
module.exports.caml_pasta_fq_negate = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_negate(retptr, ptr0, len0);
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
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v2;
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
        let v1;
        if (r0 !== 0) {
            v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v1;
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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
        let v1;
        if (r0 !== 0) {
            v1 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
        }
        return v1;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

/**
* @param {Uint8Array} x
* @returns {string}
*/
module.exports.caml_pasta_fq_to_string = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_to_string(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
module.exports.caml_pasta_fq_two_adic_root_of_unity = function() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.caml_pasta_fq_two_adic_root_of_unity(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
module.exports.caml_pasta_fq_of_bytes = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_of_bytes(retptr, ptr0, len0);
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
module.exports.caml_pasta_fq_deep_copy = function(x) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_deep_copy(retptr, ptr0, len0);
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
    const ret = wasm.caml_pallas_add(x.ptr, y.ptr);
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
    const ret = wasm.caml_pallas_sub(x.ptr, y.ptr);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_negate = function(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_negate(x.ptr);
    return WasmPallasGProjective.__wrap(ret);
};

/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_double = function(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_double(x.ptr);
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
    const ret = wasm.caml_pallas_scale(x.ptr, ptr0, len0);
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
        var v0 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v0;
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
    const ret = wasm.caml_pallas_to_affine(x.ptr);
    return WasmGPallas.__wrap(ret);
};

/**
* @param {WasmGPallas} x
* @returns {WasmPallasGProjective}
*/
module.exports.caml_pallas_of_affine = function(x) {
    _assertClass(x, WasmGPallas);
    var ptr0 = x.ptr;
    x.ptr = 0;
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
    var ptr0 = x.ptr;
    x.ptr = 0;
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
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
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
};

let cachedUint32Memory0;
function getUint32Memory0() {
    if (cachedUint32Memory0.buffer !== wasm.memory.buffer) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4);
    getUint32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayU32FromWasm0(ptr, len) {
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}
/**
* @param {WasmPastaFpPlonkIndex} index
* @param {WasmVecVecFp} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFpProverProof}
*/
module.exports.caml_pasta_fp_plonk_proof_create = function(index, witness, prev_challenges, prev_sgs) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    _assertClass(witness, WasmVecVecFp);
    var ptr0 = witness.ptr;
    witness.ptr = 0;
    const ptr1 = passArray8ToWasm0(prev_challenges, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray32ToWasm0(prev_sgs, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_plonk_proof_create(index.ptr, ptr0, ptr1, len1, ptr2, len2);
    return WasmFpProverProof.__wrap(ret);
};

/**
* @param {WasmFpPlonkVerifierIndex} index
* @param {WasmFpProverProof} proof
* @returns {boolean}
*/
module.exports.caml_pasta_fp_plonk_proof_verify = function(index, proof) {
    _assertClass(index, WasmFpPlonkVerifierIndex);
    var ptr0 = index.ptr;
    index.ptr = 0;
    _assertClass(proof, WasmFpProverProof);
    var ptr1 = proof.ptr;
    proof.ptr = 0;
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
    var ptr0 = x.ptr;
    x.ptr = 0;
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFpProverProof.__wrap(ret);
};

function isLikeNone(x) {
    return x === undefined || x === null;
}
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
        wasm.caml_pasta_fp_plonk_verifier_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.ptr, ptr0, len0);
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
        var ptr0 = index.ptr;
        index.ptr = 0;
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
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFpPlonkVerifierIndex);
        var ptr0 = index.ptr;
        index.ptr = 0;
        wasm.caml_pasta_fp_plonk_verifier_index_serialize(retptr, ptr0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
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
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_deserialize(srs.ptr, ptr0, len0);
    return WasmFpPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {WasmFpPlonkVerifierIndex}
*/
module.exports.caml_pasta_fp_plonk_verifier_index_create = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_create(index.ptr);
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
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_deep_copy(x.ptr);
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
        wasm.caml_pasta_fq_plonk_verifier_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.ptr, ptr0, len0);
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
        var ptr0 = index.ptr;
        index.ptr = 0;
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
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFqPlonkVerifierIndex);
        var ptr0 = index.ptr;
        index.ptr = 0;
        wasm.caml_pasta_fq_plonk_verifier_index_serialize(retptr, ptr0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
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
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_deserialize(srs.ptr, ptr0, len0);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {WasmFqPlonkVerifierIndex}
*/
module.exports.caml_pasta_fq_plonk_verifier_index_create = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_create(index.ptr);
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
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_deep_copy(x.ptr);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @param {WasmVecVecFq} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFqProverProof}
*/
module.exports.caml_pasta_fq_plonk_proof_create = function(index, witness, prev_challenges, prev_sgs) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    _assertClass(witness, WasmVecVecFq);
    var ptr0 = witness.ptr;
    witness.ptr = 0;
    const ptr1 = passArray8ToWasm0(prev_challenges, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray32ToWasm0(prev_sgs, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_plonk_proof_create(index.ptr, ptr0, ptr1, len1, ptr2, len2);
    return WasmFqProverProof.__wrap(ret);
};

/**
* @param {WasmFqPlonkVerifierIndex} index
* @param {WasmFqProverProof} proof
* @returns {boolean}
*/
module.exports.caml_pasta_fq_plonk_proof_verify = function(index, proof) {
    _assertClass(index, WasmFqPlonkVerifierIndex);
    var ptr0 = index.ptr;
    index.ptr = 0;
    _assertClass(proof, WasmFqProverProof);
    var ptr1 = proof.ptr;
    proof.ptr = 0;
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
    var ptr0 = x.ptr;
    x.ptr = 0;
    const ret = wasm.caml_pasta_fq_plonk_proof_deep_copy(ptr0);
    return WasmFqProverProof.__wrap(ret);
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
    wasm.caml_fp_srs_add_lagrange_basis(srs.ptr, log2_size);
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
        wasm.caml_fp_srs_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, srs.ptr, ptr0, len0);
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
        wasm.caml_fp_srs_lagrange_commitment(retptr, srs.ptr, domain_size, i);
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
        wasm.caml_fp_srs_commit_evaluations(retptr, srs.ptr, domain_size, ptr0, len0);
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
        wasm.caml_fp_srs_b_poly_commitment(retptr, srs.ptr, ptr0, len0);
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
    const ret = wasm.caml_fp_srs_batch_accumulator_check(srs.ptr, ptr0, len0, ptr1, len1);
    return ret !== 0;
};

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
        wasm.caml_fp_srs_batch_accumulator_generate(retptr, srs.ptr, comms, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 4);
        return v1;
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
    const ret = wasm.caml_fp_srs_h(srs.ptr);
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
    wasm.caml_fq_srs_add_lagrange_basis(srs.ptr, log2_size);
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
        wasm.caml_fp_srs_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, srs.ptr, ptr0, len0);
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
        wasm.caml_fq_srs_lagrange_commitment(retptr, srs.ptr, domain_size, i);
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
        wasm.caml_fq_srs_commit_evaluations(retptr, srs.ptr, domain_size, ptr0, len0);
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
        wasm.caml_fq_srs_b_poly_commitment(retptr, srs.ptr, ptr0, len0);
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
    const ret = wasm.caml_fq_srs_batch_accumulator_check(srs.ptr, ptr0, len0, ptr1, len1);
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
        wasm.caml_fq_srs_batch_accumulator_generate(retptr, srs.ptr, comms, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 4);
        return v1;
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
    const ret = wasm.caml_fp_srs_h(srs.ptr);
    return WasmGPallas.__wrap(ret);
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
        var ptr1 = index.ptr;
        index.ptr = 0;
        _assertClass(proof, WasmFpProverProof);
        var ptr2 = proof.ptr;
        proof.ptr = 0;
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
    var ptr0 = x.ptr;
    x.ptr = 0;
    const ret = wasm.fp_oracles_deep_copy(ptr0);
    return WasmFpProverProof.__wrap(ret);
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
        var ptr1 = index.ptr;
        index.ptr = 0;
        _assertClass(proof, WasmFqProverProof);
        var ptr2 = proof.ptr;
        proof.ptr = 0;
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
    var ptr0 = x.ptr;
    x.ptr = 0;
    const ret = wasm.fp_oracles_deep_copy(ptr0);
    return WasmFqProverProof.__wrap(ret);
};

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
        wasm.caml_pasta_fp_plonk_index_create(retptr, gates.ptr, public_, prev_challenges, srs.ptr);
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
    const ret = wasm.caml_pasta_fp_plonk_index_max_degree(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_public_inputs = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_public_inputs(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_domain_d1_size = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d1_size(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_domain_d4_size = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d4_size(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fp_plonk_index_domain_d8_size = function(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d8_size(index.ptr);
    return ret;
};

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
        wasm.caml_pasta_fp_plonk_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.ptr, ptr0, len0);
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
        wasm.caml_pasta_fp_plonk_index_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, index.ptr, ptr0, len0);
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
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFpPlonkIndex);
        wasm.caml_pasta_fp_plonk_index_serialize(retptr, index.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
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
        wasm.caml_pasta_fq_plonk_index_create(retptr, gates.ptr, public_, prev_challenges, srs.ptr);
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
    const ret = wasm.caml_pasta_fp_plonk_index_max_degree(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_public_inputs = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_public_inputs(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_domain_d1_size = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d1_size(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_domain_d4_size = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d4_size(index.ptr);
    return ret;
};

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
module.exports.caml_pasta_fq_plonk_index_domain_d8_size = function(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d8_size(index.ptr);
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
        wasm.caml_pasta_fq_plonk_index_read(retptr, !isLikeNone(offset), isLikeNone(offset) ? 0 : offset, srs.ptr, ptr0, len0);
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
        wasm.caml_pasta_fq_plonk_index_write(retptr, isLikeNone(append) ? 0xFFFFFF : append ? 1 : 0, index.ptr, ptr0, len0);
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
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFqPlonkIndex);
        wasm.caml_pasta_fq_plonk_index_serialize(retptr, index.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
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
* @param {number} num_threads
* @param {string} worker_source
* @returns {Promise<any>}
*/
module.exports.initThreadPool = function(num_threads, worker_source) {
    const ret = wasm.initThreadPool(num_threads, addHeapObject(worker_source));
    return takeObject(ret);
};

/**
* @param {number} receiver
*/
module.exports.wbg_rayon_start_worker = function(receiver) {
    wasm.wbg_rayon_start_worker(receiver);
};

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
EndoMulScalar:6,"6":"EndoMulScalar",
/**
* ChaCha
*/
ChaCha0:7,"7":"ChaCha0",ChaCha1:8,"8":"ChaCha1",ChaCha2:9,"9":"ChaCha2",ChaChaFinal:10,"10":"ChaChaFinal",Lookup:11,"11":"Lookup",
/**
* Cairo
*/
CairoClaim:12,"12":"CairoClaim",CairoInstruction:13,"13":"CairoInstruction",CairoFlags:14,"14":"CairoFlags",CairoTransition:15,"15":"CairoTransition",
/**
* Range check (16-24)
*/
RangeCheck0:16,"16":"RangeCheck0",RangeCheck1:17,"17":"RangeCheck1", });
/**
*/
class WasmFpDomain {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpDomain.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpdomain_free(ptr);
    }
    /**
    */
    get log_size_of_group() {
        const ret = wasm.__wbg_get_wasmfpdomain_log_size_of_group(this.ptr);
        return ret;
    }
    /**
    */
    set log_size_of_group(arg0) {
        wasm.__wbg_set_wasmfpdomain_log_size_of_group(this.ptr, arg0);
    }
    /**
    */
    get group_gen() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpdomain_group_gen(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set group_gen(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpdomain_group_gen(this.ptr, ptr0, len0);
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
        const obj = Object.create(WasmFpGate.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpgate_free(ptr);
    }
    /**
    */
    get typ() {
        const ret = wasm.__wbg_get_wasmfpgate_typ(this.ptr);
        return ret >>> 0;
    }
    /**
    */
    set typ(arg0) {
        wasm.__wbg_set_wasmfpgate_typ(this.ptr, arg0);
    }
    /**
    */
    get wires() {
        const ret = wasm.__wbg_get_wasmfpgate_wires(this.ptr);
        return WasmGateWires.__wrap(ret);
    }
    /**
    */
    set wires(arg0) {
        _assertClass(arg0, WasmGateWires);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfpgate_wires(this.ptr, ptr0);
    }
    /**
    * @param {number} typ
    * @param {WasmGateWires} wires
    * @param {Uint8Array} coeffs
    */
    constructor(typ, wires, coeffs) {
        _assertClass(wires, WasmGateWires);
        var ptr0 = wires.ptr;
        wires.ptr = 0;
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
        const obj = Object.create(WasmFpGateVector.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(WasmFpOpeningProof.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpopeningproof_free(ptr);
    }
    /**
    */
    get z1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpopeningproof_z1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set z1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpopeningproof_z1(this.ptr, ptr0, len0);
    }
    /**
    */
    get z2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpopeningproof_z2(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set z2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpopeningproof_z2(this.ptr, ptr0, len0);
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
        var ptr2 = delta.ptr;
        delta.ptr = 0;
        const ptr3 = passArray8ToWasm0(z1, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(z2, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        _assertClass(sg, WasmGVesta);
        var ptr5 = sg.ptr;
        sg.ptr = 0;
        const ret = wasm.wasmfpopeningproof_new(ptr0, len0, ptr1, len1, ptr2, ptr3, len3, ptr4, len4, ptr5);
        return WasmFpOpeningProof.__wrap(ret);
    }
    /**
    */
    get lr_0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpopeningproof_lr_0(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get lr_1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpopeningproof_lr_1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get delta() {
        const ret = wasm.wasmfpopeningproof_delta(this.ptr);
        return WasmGVesta.__wrap(ret);
    }
    /**
    */
    get sg() {
        const ret = wasm.wasmfpopeningproof_sg(this.ptr);
        return WasmGVesta.__wrap(ret);
    }
    /**
    */
    set lr_0(lr_0) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpopeningproof_set_lr_0(this.ptr, ptr0, len0);
    }
    /**
    */
    set lr_1(lr_1) {
        const ptr0 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpopeningproof_set_lr_1(this.ptr, ptr0, len0);
    }
    /**
    */
    set delta(delta) {
        _assertClass(delta, WasmGVesta);
        var ptr0 = delta.ptr;
        delta.ptr = 0;
        wasm.wasmfpopeningproof_set_delta(this.ptr, ptr0);
    }
    /**
    */
    set sg(sg) {
        _assertClass(sg, WasmGVesta);
        var ptr0 = sg.ptr;
        sg.ptr = 0;
        wasm.wasmfpopeningproof_set_sg(this.ptr, ptr0);
    }
}
module.exports.WasmFpOpeningProof = WasmFpOpeningProof;
/**
*/
class WasmFpOracles {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpOracles.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfporacles_free(ptr);
    }
    /**
    */
    get o() {
        const ret = wasm.__wbg_get_wasmfporacles_o(this.ptr);
        return WasmFpRandomOracles.__wrap(ret);
    }
    /**
    */
    set o(arg0) {
        _assertClass(arg0, WasmFpRandomOracles);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfporacles_o(this.ptr, ptr0);
    }
    /**
    */
    get p_eval0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfporacles_p_eval0(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set p_eval0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_p_eval0(this.ptr, ptr0, len0);
    }
    /**
    */
    get p_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfporacles_p_eval1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set p_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_p_eval1(this.ptr, ptr0, len0);
    }
    /**
    */
    get digest_before_evaluations() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfporacles_digest_before_evaluations(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set digest_before_evaluations(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_digest_before_evaluations(this.ptr, ptr0, len0);
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
        var ptr0 = o.ptr;
        o.ptr = 0;
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
    */
    get opening_prechallenges() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfporacles_opening_prechallenges(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set opening_prechallenges(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfporacles_set_opening_prechallenges(this.ptr, ptr0, len0);
    }
}
module.exports.WasmFpOracles = WasmFpOracles;
/**
*/
class WasmFpPlonkVerificationEvals {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpPlonkVerificationEvals.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const ret = wasm.wasmfpplonkverificationevals_new(ptr0, len0, ptr1, len1, generic_comm.ptr, psm_comm.ptr, complete_add_comm.ptr, mul_comm.ptr, emul_comm.ptr, endomul_scalar_comm.ptr);
        return WasmFpPlonkVerificationEvals.__wrap(ret);
    }
    /**
    */
    get sigma_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpplonkverificationevals_sigma_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set sigma_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpplonkverificationevals_set_sigma_comm(this.ptr, ptr0, len0);
    }
    /**
    */
    get coefficients_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpplonkverificationevals_coefficients_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set coefficients_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpplonkverificationevals_set_coefficients_comm(this.ptr, ptr0, len0);
    }
    /**
    */
    get generic_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    set generic_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.ptr, ptr0);
    }
    /**
    */
    get psm_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    set psm_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.ptr, ptr0);
    }
    /**
    */
    get complete_add_comm() {
        const ret = wasm.wasmfpplonkverificationevals_complete_add_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    set complete_add_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_complete_add_comm(this.ptr, ptr0);
    }
    /**
    */
    get mul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_mul_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    set mul_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_mul_comm(this.ptr, ptr0);
    }
    /**
    */
    get emul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_emul_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    set emul_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_emul_comm(this.ptr, ptr0);
    }
    /**
    */
    get endomul_scalar_comm() {
        const ret = wasm.wasmfpplonkverificationevals_endomul_scalar_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    set endomul_scalar_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_endomul_scalar_comm(this.ptr, ptr0);
    }
    /**
    */
    get chacha_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpplonkverificationevals_chacha_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set chacha_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpplonkverificationevals_set_chacha_comm(this.ptr, ptr0, len0);
    }
}
module.exports.WasmFpPlonkVerificationEvals = WasmFpPlonkVerificationEvals;
/**
*/
class WasmFpPlonkVerifierIndex {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpPlonkVerifierIndex.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpplonkverifierindex_free(ptr);
    }
    /**
    */
    get domain() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_domain(this.ptr);
        return WasmFpDomain.__wrap(ret);
    }
    /**
    */
    set domain(arg0) {
        _assertClass(arg0, WasmFpDomain);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfpplonkverifierindex_domain(this.ptr, ptr0);
    }
    /**
    */
    get max_poly_size() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_max_poly_size(this.ptr);
        return ret;
    }
    /**
    */
    set max_poly_size(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_max_poly_size(this.ptr, arg0);
    }
    /**
    */
    get max_quot_size() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_max_quot_size(this.ptr);
        return ret;
    }
    /**
    */
    set max_quot_size(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_max_quot_size(this.ptr, arg0);
    }
    /**
    */
    get public_() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_public_(this.ptr);
        return ret;
    }
    /**
    */
    set public_(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_public_(this.ptr, arg0);
    }
    /**
    */
    get prev_challenges() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_prev_challenges(this.ptr);
        return ret;
    }
    /**
    */
    set prev_challenges(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_prev_challenges(this.ptr, arg0);
    }
    /**
    */
    get shifts() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_shifts(this.ptr);
        return WasmFpShifts.__wrap(ret);
    }
    /**
    */
    set shifts(arg0) {
        _assertClass(arg0, WasmFpShifts);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfpplonkverifierindex_shifts(this.ptr, ptr0);
    }
    /**
    * @param {WasmFpDomain} domain
    * @param {number} max_poly_size
    * @param {number} max_quot_size
    * @param {number} public_
    * @param {number} prev_challenges
    * @param {WasmFpSrs} srs
    * @param {WasmFpPlonkVerificationEvals} evals
    * @param {WasmFpShifts} shifts
    */
    constructor(domain, max_poly_size, max_quot_size, public_, prev_challenges, srs, evals, shifts) {
        _assertClass(domain, WasmFpDomain);
        _assertClass(srs, WasmFpSrs);
        _assertClass(evals, WasmFpPlonkVerificationEvals);
        _assertClass(shifts, WasmFpShifts);
        const ret = wasm.wasmfpplonkverifierindex_new(domain.ptr, max_poly_size, max_quot_size, public_, prev_challenges, srs.ptr, evals.ptr, shifts.ptr);
        return WasmFpPlonkVerifierIndex.__wrap(ret);
    }
    /**
    */
    get srs() {
        const ret = wasm.wasmfpplonkverifierindex_srs(this.ptr);
        return WasmFpSrs.__wrap(ret);
    }
    /**
    */
    set srs(x) {
        _assertClass(x, WasmFpSrs);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverifierindex_set_srs(this.ptr, ptr0);
    }
    /**
    */
    get evals() {
        const ret = wasm.wasmfpplonkverifierindex_evals(this.ptr);
        return WasmFpPlonkVerificationEvals.__wrap(ret);
    }
    /**
    */
    set evals(x) {
        _assertClass(x, WasmFpPlonkVerificationEvals);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverifierindex_set_evals(this.ptr, ptr0);
    }
}
module.exports.WasmFpPlonkVerifierIndex = WasmFpPlonkVerifierIndex;
/**
*/
class WasmFpPolyComm {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpPolyComm.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
            ptr1 = shifted.ptr;
            shifted.ptr = 0;
        }
        const ret = wasm.wasmfppolycomm_new(ptr0, len0, ptr1);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    get unshifted() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfppolycomm_unshifted(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set unshifted(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfppolycomm_set_unshifted(this.ptr, ptr0, len0);
    }
    /**
    */
    get shifted() {
        const ret = wasm.__wbg_get_wasmfppolycomm_shifted(this.ptr);
        return ret === 0 ? undefined : WasmGVesta.__wrap(ret);
    }
    /**
    */
    set shifted(arg0) {
        let ptr0 = 0;
        if (!isLikeNone(arg0)) {
            _assertClass(arg0, WasmGVesta);
            ptr0 = arg0.ptr;
            arg0.ptr = 0;
        }
        wasm.__wbg_set_wasmfppolycomm_shifted(this.ptr, ptr0);
    }
}
module.exports.WasmFpPolyComm = WasmFpPolyComm;
/**
*/
class WasmFpProofEvaluations {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpProofEvaluations.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpproofevaluations_free(ptr);
    }
    /**
    * @param {WasmVecVecFp} w
    * @param {Uint8Array} z
    * @param {WasmVecVecFp} s
    * @param {Uint8Array} generic_selector
    * @param {Uint8Array} poseidon_selector
    */
    constructor(w, z, s, generic_selector, poseidon_selector) {
        _assertClass(w, WasmVecVecFp);
        var ptr0 = w.ptr;
        w.ptr = 0;
        const ptr1 = passArray8ToWasm0(z, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(s, WasmVecVecFp);
        var ptr2 = s.ptr;
        s.ptr = 0;
        const ptr3 = passArray8ToWasm0(generic_selector, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(poseidon_selector, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfpproofevaluations_new(ptr0, ptr1, len1, ptr2, ptr3, len3, ptr4, len4);
        return WasmFpProofEvaluations.__wrap(ret);
    }
    /**
    */
    get w() {
        const ret = wasm.wasmfpproofevaluations_w(this.ptr);
        return WasmVecVecFp.__wrap(ret);
    }
    /**
    */
    get z() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproofevaluations_z(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get s() {
        const ret = wasm.wasmfpproofevaluations_s(this.ptr);
        return WasmVecVecFp.__wrap(ret);
    }
    /**
    */
    get generic_selector() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproofevaluations_generic_selector(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get poseidon_selector() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproofevaluations_poseidon_selector(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set w(x) {
        _assertClass(x, WasmVecVecFp);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpproofevaluations_set_w(this.ptr, ptr0);
    }
    /**
    */
    set s(x) {
        _assertClass(x, WasmVecVecFp);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpproofevaluations_set_s(this.ptr, ptr0);
    }
    /**
    */
    set z(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproofevaluations_set_z(this.ptr, ptr0, len0);
    }
    /**
    */
    set generic_selector(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproofevaluations_set_generic_selector(this.ptr, ptr0, len0);
    }
    /**
    */
    set poseidon_selector(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproofevaluations_set_poseidon_selector(this.ptr, ptr0, len0);
    }
}
module.exports.WasmFpProofEvaluations = WasmFpProofEvaluations;
/**
*/
class WasmFpProverCommitments {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpProverCommitments.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        var ptr1 = z_comm.ptr;
        z_comm.ptr = 0;
        _assertClass(t_comm, WasmFpPolyComm);
        var ptr2 = t_comm.ptr;
        t_comm.ptr = 0;
        const ret = wasm.wasmfpprovercommitments_new(ptr0, len0, ptr1, ptr2);
        return WasmFpProverCommitments.__wrap(ret);
    }
    /**
    */
    get w_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpprovercommitments_w_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get z_comm() {
        const ret = wasm.wasmfpprovercommitments_z_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    get t_comm() {
        const ret = wasm.wasmfpprovercommitments_t_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    */
    set w_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpprovercommitments_set_w_comm(this.ptr, ptr0, len0);
    }
    /**
    */
    set z_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpprovercommitments_set_z_comm(this.ptr, ptr0);
    }
    /**
    */
    set t_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpprovercommitments_set_t_comm(this.ptr, ptr0);
    }
}
module.exports.WasmFpProverCommitments = WasmFpProverCommitments;
/**
*/
class WasmFpProverProof {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpProverProof.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpproverproof_free(ptr);
    }
    /**
    */
    get ft_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpproverproof_ft_eval1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set ft_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpproverproof_ft_eval1(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmFpProverCommitments} commitments
    * @param {WasmFpOpeningProof} proof
    * @param {WasmFpProofEvaluations} evals0
    * @param {WasmFpProofEvaluations} evals1
    * @param {Uint8Array} ft_eval1
    * @param {Uint8Array} public_
    * @param {WasmVecVecFp} prev_challenges_scalars
    * @param {Uint32Array} prev_challenges_comms
    */
    constructor(commitments, proof, evals0, evals1, ft_eval1, public_, prev_challenges_scalars, prev_challenges_comms) {
        _assertClass(commitments, WasmFpProverCommitments);
        var ptr0 = commitments.ptr;
        commitments.ptr = 0;
        _assertClass(proof, WasmFpOpeningProof);
        var ptr1 = proof.ptr;
        proof.ptr = 0;
        _assertClass(evals0, WasmFpProofEvaluations);
        var ptr2 = evals0.ptr;
        evals0.ptr = 0;
        _assertClass(evals1, WasmFpProofEvaluations);
        var ptr3 = evals1.ptr;
        evals1.ptr = 0;
        const ptr4 = passArray8ToWasm0(ft_eval1, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        _assertClass(prev_challenges_scalars, WasmVecVecFp);
        var ptr6 = prev_challenges_scalars.ptr;
        prev_challenges_scalars.ptr = 0;
        const ptr7 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len7 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfpproverproof_new(ptr0, ptr1, ptr2, ptr3, ptr4, len4, ptr5, len5, ptr6, ptr7, len7);
        return WasmFpProverProof.__wrap(ret);
    }
    /**
    */
    get commitments() {
        const ret = wasm.wasmfpproverproof_commitments(this.ptr);
        return WasmFpProverCommitments.__wrap(ret);
    }
    /**
    */
    get proof() {
        const ret = wasm.wasmfpproverproof_proof(this.ptr);
        return WasmFpOpeningProof.__wrap(ret);
    }
    /**
    */
    get evals0() {
        const ret = wasm.wasmfpproverproof_evals0(this.ptr);
        return WasmFpProofEvaluations.__wrap(ret);
    }
    /**
    */
    get evals1() {
        const ret = wasm.wasmfpproverproof_evals1(this.ptr);
        return WasmFpProofEvaluations.__wrap(ret);
    }
    /**
    */
    get public_() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproverproof_public_(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get prev_challenges_scalars() {
        const ret = wasm.wasmfpproverproof_prev_challenges_scalars(this.ptr);
        return WasmVecVecFp.__wrap(ret);
    }
    /**
    */
    get prev_challenges_comms() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproverproof_prev_challenges_comms(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set commitments(commitments) {
        _assertClass(commitments, WasmFpProverCommitments);
        var ptr0 = commitments.ptr;
        commitments.ptr = 0;
        wasm.wasmfpproverproof_set_commitments(this.ptr, ptr0);
    }
    /**
    */
    set proof(proof) {
        _assertClass(proof, WasmFpOpeningProof);
        var ptr0 = proof.ptr;
        proof.ptr = 0;
        wasm.wasmfpproverproof_set_proof(this.ptr, ptr0);
    }
    /**
    */
    set evals0(evals0) {
        _assertClass(evals0, WasmFpProofEvaluations);
        var ptr0 = evals0.ptr;
        evals0.ptr = 0;
        wasm.wasmfpproverproof_set_evals0(this.ptr, ptr0);
    }
    /**
    */
    set evals1(evals1) {
        _assertClass(evals1, WasmFpProofEvaluations);
        var ptr0 = evals1.ptr;
        evals1.ptr = 0;
        wasm.wasmfpproverproof_set_evals1(this.ptr, ptr0);
    }
    /**
    */
    set public_(public_) {
        const ptr0 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproverproof_set_public_(this.ptr, ptr0, len0);
    }
    /**
    */
    set prev_challenges_scalars(prev_challenges_scalars) {
        _assertClass(prev_challenges_scalars, WasmVecVecFp);
        var ptr0 = prev_challenges_scalars.ptr;
        prev_challenges_scalars.ptr = 0;
        wasm.wasmfpproverproof_set_prev_challenges_scalars(this.ptr, ptr0);
    }
    /**
    */
    set prev_challenges_comms(prev_challenges_comms) {
        const ptr0 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproverproof_set_prev_challenges_comms(this.ptr, ptr0, len0);
    }
    /**
    * @returns {string}
    */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfpproverproof_serialize(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
}
module.exports.WasmFpProverProof = WasmFpProverProof;
/**
*/
class WasmFpRandomOracles {

    static __wrap(ptr) {
        const obj = Object.create(WasmFpRandomOracles.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfprandomoracles_free(ptr);
    }
    /**
    */
    get joint_combiner_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_joint_combiner_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v0;
            if (r0 !== 0) {
                v0 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set joint_combiner_chal(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_joint_combiner_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get joint_combiner() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_joint_combiner(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v0;
            if (r0 !== 0) {
                v0 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set joint_combiner(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_joint_combiner(this.ptr, ptr0, len0);
    }
    /**
    */
    get beta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_beta(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set beta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_beta(this.ptr, ptr0, len0);
    }
    /**
    */
    get gamma() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_gamma(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set gamma(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_gamma(this.ptr, ptr0, len0);
    }
    /**
    */
    get alpha_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_alpha_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set alpha_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_alpha_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get alpha() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_alpha(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set alpha(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_alpha(this.ptr, ptr0, len0);
    }
    /**
    */
    get zeta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_zeta(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set zeta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_zeta(this.ptr, ptr0, len0);
    }
    /**
    */
    get v() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_v(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set v(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_v(this.ptr, ptr0, len0);
    }
    /**
    */
    get u() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_u(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set u(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_u(this.ptr, ptr0, len0);
    }
    /**
    */
    get zeta_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_zeta_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set zeta_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_zeta_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get v_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_v_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set v_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_v_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get u_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfprandomoracles_u_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set u_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_u_chal(this.ptr, ptr0, len0);
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
        const obj = Object.create(WasmFpShifts.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfpshifts_free(ptr);
    }
    /**
    */
    get s0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpdomain_group_gen(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpdomain_group_gen(this.ptr, ptr0, len0);
    }
    /**
    */
    get s1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s1(this.ptr, ptr0, len0);
    }
    /**
    */
    get s2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s2(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s2(this.ptr, ptr0, len0);
    }
    /**
    */
    get s3() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s3(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s3(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s3(this.ptr, ptr0, len0);
    }
    /**
    */
    get s4() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s4(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s4(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s4(this.ptr, ptr0, len0);
    }
    /**
    */
    get s5() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s5(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s5(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s5(this.ptr, ptr0, len0);
    }
    /**
    */
    get s6() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfpshifts_s6(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s6(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s6(this.ptr, ptr0, len0);
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
        const obj = Object.create(WasmFpSrs.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(WasmFqDomain.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqdomain_free(ptr);
    }
    /**
    */
    get log_size_of_group() {
        const ret = wasm.__wbg_get_wasmfpdomain_log_size_of_group(this.ptr);
        return ret;
    }
    /**
    */
    set log_size_of_group(arg0) {
        wasm.__wbg_set_wasmfpdomain_log_size_of_group(this.ptr, arg0);
    }
    /**
    */
    get group_gen() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqdomain_group_gen(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set group_gen(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqdomain_group_gen(this.ptr, ptr0, len0);
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
        const obj = Object.create(WasmFqGate.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqgate_free(ptr);
    }
    /**
    */
    get typ() {
        const ret = wasm.__wbg_get_wasmfpgate_typ(this.ptr);
        return ret >>> 0;
    }
    /**
    */
    set typ(arg0) {
        wasm.__wbg_set_wasmfpgate_typ(this.ptr, arg0);
    }
    /**
    */
    get wires() {
        const ret = wasm.__wbg_get_wasmfpgate_wires(this.ptr);
        return WasmGateWires.__wrap(ret);
    }
    /**
    */
    set wires(arg0) {
        _assertClass(arg0, WasmGateWires);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfpgate_wires(this.ptr, ptr0);
    }
    /**
    * @param {number} typ
    * @param {WasmGateWires} wires
    * @param {Uint8Array} coeffs
    */
    constructor(typ, wires, coeffs) {
        _assertClass(wires, WasmGateWires);
        var ptr0 = wires.ptr;
        wires.ptr = 0;
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
        const obj = Object.create(WasmFqGateVector.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(WasmFqOpeningProof.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqopeningproof_free(ptr);
    }
    /**
    */
    get z1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqopeningproof_z1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set z1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqopeningproof_z1(this.ptr, ptr0, len0);
    }
    /**
    */
    get z2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqopeningproof_z2(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set z2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqopeningproof_z2(this.ptr, ptr0, len0);
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
        var ptr2 = delta.ptr;
        delta.ptr = 0;
        const ptr3 = passArray8ToWasm0(z1, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(z2, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        _assertClass(sg, WasmGPallas);
        var ptr5 = sg.ptr;
        sg.ptr = 0;
        const ret = wasm.wasmfqopeningproof_new(ptr0, len0, ptr1, len1, ptr2, ptr3, len3, ptr4, len4, ptr5);
        return WasmFqOpeningProof.__wrap(ret);
    }
    /**
    */
    get lr_0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqopeningproof_lr_0(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get lr_1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqopeningproof_lr_1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get delta() {
        const ret = wasm.wasmfqopeningproof_delta(this.ptr);
        return WasmGPallas.__wrap(ret);
    }
    /**
    */
    get sg() {
        const ret = wasm.wasmfqopeningproof_sg(this.ptr);
        return WasmGPallas.__wrap(ret);
    }
    /**
    */
    set lr_0(lr_0) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqopeningproof_set_lr_0(this.ptr, ptr0, len0);
    }
    /**
    */
    set lr_1(lr_1) {
        const ptr0 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqopeningproof_set_lr_1(this.ptr, ptr0, len0);
    }
    /**
    */
    set delta(delta) {
        _assertClass(delta, WasmGPallas);
        var ptr0 = delta.ptr;
        delta.ptr = 0;
        wasm.wasmfqopeningproof_set_delta(this.ptr, ptr0);
    }
    /**
    */
    set sg(sg) {
        _assertClass(sg, WasmGPallas);
        var ptr0 = sg.ptr;
        sg.ptr = 0;
        wasm.wasmfqopeningproof_set_sg(this.ptr, ptr0);
    }
}
module.exports.WasmFqOpeningProof = WasmFqOpeningProof;
/**
*/
class WasmFqOracles {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqOracles.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqoracles_free(ptr);
    }
    /**
    */
    get o() {
        const ret = wasm.__wbg_get_wasmfporacles_o(this.ptr);
        return WasmFqRandomOracles.__wrap(ret);
    }
    /**
    */
    set o(arg0) {
        _assertClass(arg0, WasmFqRandomOracles);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfporacles_o(this.ptr, ptr0);
    }
    /**
    */
    get p_eval0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqoracles_p_eval0(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set p_eval0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_p_eval0(this.ptr, ptr0, len0);
    }
    /**
    */
    get p_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqoracles_p_eval1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set p_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_p_eval1(this.ptr, ptr0, len0);
    }
    /**
    */
    get digest_before_evaluations() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqoracles_digest_before_evaluations(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set digest_before_evaluations(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_digest_before_evaluations(this.ptr, ptr0, len0);
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
        var ptr0 = o.ptr;
        o.ptr = 0;
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
    */
    get opening_prechallenges() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqoracles_opening_prechallenges(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set opening_prechallenges(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqoracles_set_opening_prechallenges(this.ptr, ptr0, len0);
    }
}
module.exports.WasmFqOracles = WasmFqOracles;
/**
*/
class WasmFqPlonkVerificationEvals {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqPlonkVerificationEvals.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const ret = wasm.wasmfqplonkverificationevals_new(ptr0, len0, ptr1, len1, generic_comm.ptr, psm_comm.ptr, complete_add_comm.ptr, mul_comm.ptr, emul_comm.ptr, endomul_scalar_comm.ptr);
        return WasmFqPlonkVerificationEvals.__wrap(ret);
    }
    /**
    */
    get sigma_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqplonkverificationevals_sigma_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set sigma_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqplonkverificationevals_set_sigma_comm(this.ptr, ptr0, len0);
    }
    /**
    */
    get coefficients_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqplonkverificationevals_coefficients_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set coefficients_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqplonkverificationevals_set_coefficients_comm(this.ptr, ptr0, len0);
    }
    /**
    */
    get generic_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    set generic_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.ptr, ptr0);
    }
    /**
    */
    get psm_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    set psm_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.ptr, ptr0);
    }
    /**
    */
    get complete_add_comm() {
        const ret = wasm.wasmfpplonkverificationevals_complete_add_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    set complete_add_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_complete_add_comm(this.ptr, ptr0);
    }
    /**
    */
    get mul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_mul_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    set mul_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_mul_comm(this.ptr, ptr0);
    }
    /**
    */
    get emul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_emul_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    set emul_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_emul_comm(this.ptr, ptr0);
    }
    /**
    */
    get endomul_scalar_comm() {
        const ret = wasm.wasmfpplonkverificationevals_endomul_scalar_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    set endomul_scalar_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_endomul_scalar_comm(this.ptr, ptr0);
    }
    /**
    */
    get chacha_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqplonkverificationevals_chacha_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set chacha_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqplonkverificationevals_set_chacha_comm(this.ptr, ptr0, len0);
    }
}
module.exports.WasmFqPlonkVerificationEvals = WasmFqPlonkVerificationEvals;
/**
*/
class WasmFqPlonkVerifierIndex {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqPlonkVerifierIndex.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqplonkverifierindex_free(ptr);
    }
    /**
    */
    get domain() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_domain(this.ptr);
        return WasmFqDomain.__wrap(ret);
    }
    /**
    */
    set domain(arg0) {
        _assertClass(arg0, WasmFqDomain);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfpplonkverifierindex_domain(this.ptr, ptr0);
    }
    /**
    */
    get max_poly_size() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_max_poly_size(this.ptr);
        return ret;
    }
    /**
    */
    set max_poly_size(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_max_poly_size(this.ptr, arg0);
    }
    /**
    */
    get max_quot_size() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_max_quot_size(this.ptr);
        return ret;
    }
    /**
    */
    set max_quot_size(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_max_quot_size(this.ptr, arg0);
    }
    /**
    */
    get public_() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_public_(this.ptr);
        return ret;
    }
    /**
    */
    set public_(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_public_(this.ptr, arg0);
    }
    /**
    */
    get prev_challenges() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_prev_challenges(this.ptr);
        return ret;
    }
    /**
    */
    set prev_challenges(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_prev_challenges(this.ptr, arg0);
    }
    /**
    */
    get shifts() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_shifts(this.ptr);
        return WasmFqShifts.__wrap(ret);
    }
    /**
    */
    set shifts(arg0) {
        _assertClass(arg0, WasmFqShifts);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmfpplonkverifierindex_shifts(this.ptr, ptr0);
    }
    /**
    * @param {WasmFqDomain} domain
    * @param {number} max_poly_size
    * @param {number} max_quot_size
    * @param {number} public_
    * @param {number} prev_challenges
    * @param {WasmFqSrs} srs
    * @param {WasmFqPlonkVerificationEvals} evals
    * @param {WasmFqShifts} shifts
    */
    constructor(domain, max_poly_size, max_quot_size, public_, prev_challenges, srs, evals, shifts) {
        _assertClass(domain, WasmFqDomain);
        _assertClass(srs, WasmFqSrs);
        _assertClass(evals, WasmFqPlonkVerificationEvals);
        _assertClass(shifts, WasmFqShifts);
        const ret = wasm.wasmfqplonkverifierindex_new(domain.ptr, max_poly_size, max_quot_size, public_, prev_challenges, srs.ptr, evals.ptr, shifts.ptr);
        return WasmFqPlonkVerifierIndex.__wrap(ret);
    }
    /**
    */
    get srs() {
        const ret = wasm.wasmfpplonkverifierindex_srs(this.ptr);
        return WasmFqSrs.__wrap(ret);
    }
    /**
    */
    set srs(x) {
        _assertClass(x, WasmFqSrs);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfqplonkverifierindex_set_srs(this.ptr, ptr0);
    }
    /**
    */
    get evals() {
        const ret = wasm.wasmfqplonkverifierindex_evals(this.ptr);
        return WasmFqPlonkVerificationEvals.__wrap(ret);
    }
    /**
    */
    set evals(x) {
        _assertClass(x, WasmFqPlonkVerificationEvals);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverifierindex_set_evals(this.ptr, ptr0);
    }
}
module.exports.WasmFqPlonkVerifierIndex = WasmFqPlonkVerifierIndex;
/**
*/
class WasmFqPolyComm {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqPolyComm.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
            ptr1 = shifted.ptr;
            shifted.ptr = 0;
        }
        const ret = wasm.wasmfqpolycomm_new(ptr0, len0, ptr1);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    get unshifted() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqpolycomm_unshifted(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set unshifted(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqpolycomm_set_unshifted(this.ptr, ptr0, len0);
    }
    /**
    */
    get shifted() {
        const ret = wasm.__wbg_get_wasmfppolycomm_shifted(this.ptr);
        return ret === 0 ? undefined : WasmGPallas.__wrap(ret);
    }
    /**
    */
    set shifted(arg0) {
        let ptr0 = 0;
        if (!isLikeNone(arg0)) {
            _assertClass(arg0, WasmGPallas);
            ptr0 = arg0.ptr;
            arg0.ptr = 0;
        }
        wasm.__wbg_set_wasmfppolycomm_shifted(this.ptr, ptr0);
    }
}
module.exports.WasmFqPolyComm = WasmFqPolyComm;
/**
*/
class WasmFqProofEvaluations {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqProofEvaluations.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqproofevaluations_free(ptr);
    }
    /**
    * @param {WasmVecVecFq} w
    * @param {Uint8Array} z
    * @param {WasmVecVecFq} s
    * @param {Uint8Array} generic_selector
    * @param {Uint8Array} poseidon_selector
    */
    constructor(w, z, s, generic_selector, poseidon_selector) {
        _assertClass(w, WasmVecVecFq);
        var ptr0 = w.ptr;
        w.ptr = 0;
        const ptr1 = passArray8ToWasm0(z, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(s, WasmVecVecFq);
        var ptr2 = s.ptr;
        s.ptr = 0;
        const ptr3 = passArray8ToWasm0(generic_selector, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(poseidon_selector, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqproofevaluations_new(ptr0, ptr1, len1, ptr2, ptr3, len3, ptr4, len4);
        return WasmFqProofEvaluations.__wrap(ret);
    }
    /**
    */
    get w() {
        const ret = wasm.wasmfqproofevaluations_w(this.ptr);
        return WasmVecVecFq.__wrap(ret);
    }
    /**
    */
    get z() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproofevaluations_z(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get s() {
        const ret = wasm.wasmfqproofevaluations_s(this.ptr);
        return WasmVecVecFq.__wrap(ret);
    }
    /**
    */
    get generic_selector() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproofevaluations_generic_selector(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get poseidon_selector() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproofevaluations_poseidon_selector(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set w(x) {
        _assertClass(x, WasmVecVecFq);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfqproofevaluations_set_w(this.ptr, ptr0);
    }
    /**
    */
    set s(x) {
        _assertClass(x, WasmVecVecFq);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfqproofevaluations_set_s(this.ptr, ptr0);
    }
    /**
    */
    set z(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproofevaluations_set_z(this.ptr, ptr0, len0);
    }
    /**
    */
    set generic_selector(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproofevaluations_set_generic_selector(this.ptr, ptr0, len0);
    }
    /**
    */
    set poseidon_selector(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproofevaluations_set_poseidon_selector(this.ptr, ptr0, len0);
    }
}
module.exports.WasmFqProofEvaluations = WasmFqProofEvaluations;
/**
*/
class WasmFqProverCommitments {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqProverCommitments.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        var ptr1 = z_comm.ptr;
        z_comm.ptr = 0;
        _assertClass(t_comm, WasmFqPolyComm);
        var ptr2 = t_comm.ptr;
        t_comm.ptr = 0;
        const ret = wasm.wasmfqprovercommitments_new(ptr0, len0, ptr1, ptr2);
        return WasmFqProverCommitments.__wrap(ret);
    }
    /**
    */
    get w_comm() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqprovercommitments_w_comm(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get z_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    get t_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    */
    set w_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqprovercommitments_set_w_comm(this.ptr, ptr0, len0);
    }
    /**
    */
    set z_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.ptr, ptr0);
    }
    /**
    */
    set t_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.ptr;
        x.ptr = 0;
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.ptr, ptr0);
    }
}
module.exports.WasmFqProverCommitments = WasmFqProverCommitments;
/**
*/
class WasmFqProverProof {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqProverProof.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqproverproof_free(ptr);
    }
    /**
    */
    get ft_eval1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqproverproof_ft_eval1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set ft_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqproverproof_ft_eval1(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmFqProverCommitments} commitments
    * @param {WasmFqOpeningProof} proof
    * @param {WasmFqProofEvaluations} evals0
    * @param {WasmFqProofEvaluations} evals1
    * @param {Uint8Array} ft_eval1
    * @param {Uint8Array} public_
    * @param {WasmVecVecFq} prev_challenges_scalars
    * @param {Uint32Array} prev_challenges_comms
    */
    constructor(commitments, proof, evals0, evals1, ft_eval1, public_, prev_challenges_scalars, prev_challenges_comms) {
        _assertClass(commitments, WasmFqProverCommitments);
        var ptr0 = commitments.ptr;
        commitments.ptr = 0;
        _assertClass(proof, WasmFqOpeningProof);
        var ptr1 = proof.ptr;
        proof.ptr = 0;
        _assertClass(evals0, WasmFqProofEvaluations);
        var ptr2 = evals0.ptr;
        evals0.ptr = 0;
        _assertClass(evals1, WasmFqProofEvaluations);
        var ptr3 = evals1.ptr;
        evals1.ptr = 0;
        const ptr4 = passArray8ToWasm0(ft_eval1, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len5 = WASM_VECTOR_LEN;
        _assertClass(prev_challenges_scalars, WasmVecVecFq);
        var ptr6 = prev_challenges_scalars.ptr;
        prev_challenges_scalars.ptr = 0;
        const ptr7 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len7 = WASM_VECTOR_LEN;
        const ret = wasm.wasmfqproverproof_new(ptr0, ptr1, ptr2, ptr3, ptr4, len4, ptr5, len5, ptr6, ptr7, len7);
        return WasmFqProverProof.__wrap(ret);
    }
    /**
    */
    get commitments() {
        const ret = wasm.wasmfqproverproof_commitments(this.ptr);
        return WasmFqProverCommitments.__wrap(ret);
    }
    /**
    */
    get proof() {
        const ret = wasm.wasmfqproverproof_proof(this.ptr);
        return WasmFqOpeningProof.__wrap(ret);
    }
    /**
    */
    get evals0() {
        const ret = wasm.wasmfqproverproof_evals0(this.ptr);
        return WasmFqProofEvaluations.__wrap(ret);
    }
    /**
    */
    get evals1() {
        const ret = wasm.wasmfqproverproof_evals1(this.ptr);
        return WasmFqProofEvaluations.__wrap(ret);
    }
    /**
    */
    get public_() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproverproof_public_(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get prev_challenges_scalars() {
        const ret = wasm.wasmfqproverproof_prev_challenges_scalars(this.ptr);
        return WasmVecVecFq.__wrap(ret);
    }
    /**
    */
    get prev_challenges_comms() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproverproof_prev_challenges_comms(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set commitments(commitments) {
        _assertClass(commitments, WasmFqProverCommitments);
        var ptr0 = commitments.ptr;
        commitments.ptr = 0;
        wasm.wasmfqproverproof_set_commitments(this.ptr, ptr0);
    }
    /**
    */
    set proof(proof) {
        _assertClass(proof, WasmFqOpeningProof);
        var ptr0 = proof.ptr;
        proof.ptr = 0;
        wasm.wasmfqproverproof_set_proof(this.ptr, ptr0);
    }
    /**
    */
    set evals0(evals0) {
        _assertClass(evals0, WasmFqProofEvaluations);
        var ptr0 = evals0.ptr;
        evals0.ptr = 0;
        wasm.wasmfqproverproof_set_evals0(this.ptr, ptr0);
    }
    /**
    */
    set evals1(evals1) {
        _assertClass(evals1, WasmFqProofEvaluations);
        var ptr0 = evals1.ptr;
        evals1.ptr = 0;
        wasm.wasmfqproverproof_set_evals1(this.ptr, ptr0);
    }
    /**
    */
    set public_(public_) {
        const ptr0 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproverproof_set_public_(this.ptr, ptr0, len0);
    }
    /**
    */
    set prev_challenges_scalars(prev_challenges_scalars) {
        _assertClass(prev_challenges_scalars, WasmVecVecFq);
        var ptr0 = prev_challenges_scalars.ptr;
        prev_challenges_scalars.ptr = 0;
        wasm.wasmfqproverproof_set_prev_challenges_scalars(this.ptr, ptr0);
    }
    /**
    */
    set prev_challenges_comms(prev_challenges_comms) {
        const ptr0 = passArray32ToWasm0(prev_challenges_comms, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproverproof_set_prev_challenges_comms(this.ptr, ptr0, len0);
    }
    /**
    * @returns {string}
    */
    serialize() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmfqproverproof_serialize(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
}
module.exports.WasmFqProverProof = WasmFqProverProof;
/**
*/
class WasmFqRandomOracles {

    static __wrap(ptr) {
        const obj = Object.create(WasmFqRandomOracles.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqrandomoracles_free(ptr);
    }
    /**
    */
    get joint_combiner_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_joint_combiner_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v0;
            if (r0 !== 0) {
                v0 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set joint_combiner_chal(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_joint_combiner_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get joint_combiner() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_joint_combiner(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            let v0;
            if (r0 !== 0) {
                v0 = getArrayU8FromWasm0(r0, r1).slice();
                wasm.__wbindgen_free(r0, r1 * 1);
            }
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set joint_combiner(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_joint_combiner(this.ptr, ptr0, len0);
    }
    /**
    */
    get beta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_beta(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set beta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_beta(this.ptr, ptr0, len0);
    }
    /**
    */
    get gamma() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_gamma(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set gamma(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_gamma(this.ptr, ptr0, len0);
    }
    /**
    */
    get alpha_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_alpha_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set alpha_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_alpha_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get alpha() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_alpha(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set alpha(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_alpha(this.ptr, ptr0, len0);
    }
    /**
    */
    get zeta() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_zeta(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set zeta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_zeta(this.ptr, ptr0, len0);
    }
    /**
    */
    get v() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_v(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set v(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_v(this.ptr, ptr0, len0);
    }
    /**
    */
    get u() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_u(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set u(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_u(this.ptr, ptr0, len0);
    }
    /**
    */
    get zeta_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_zeta_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set zeta_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_zeta_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get v_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_v_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set v_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_v_chal(this.ptr, ptr0, len0);
    }
    /**
    */
    get u_chal() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqrandomoracles_u_chal(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set u_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_u_chal(this.ptr, ptr0, len0);
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
        const obj = Object.create(WasmFqShifts.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmfqshifts_free(ptr);
    }
    /**
    */
    get s0() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqdomain_group_gen(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqdomain_group_gen(this.ptr, ptr0, len0);
    }
    /**
    */
    get s1() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s1(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s1(this.ptr, ptr0, len0);
    }
    /**
    */
    get s2() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s2(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s2(this.ptr, ptr0, len0);
    }
    /**
    */
    get s3() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s3(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s3(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s3(this.ptr, ptr0, len0);
    }
    /**
    */
    get s4() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s4(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s4(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s4(this.ptr, ptr0, len0);
    }
    /**
    */
    get s5() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s5(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s5(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s5(this.ptr, ptr0, len0);
    }
    /**
    */
    get s6() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmfqshifts_s6(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set s6(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s6(this.ptr, ptr0, len0);
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
        const obj = Object.create(WasmFqSrs.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(WasmGPallas.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmgpallas_free(ptr);
    }
    /**
    */
    get x() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgpallas_x(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set x(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgpallas_x(this.ptr, ptr0, len0);
    }
    /**
    */
    get y() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgpallas_y(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set y(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgpallas_y(this.ptr, ptr0, len0);
    }
    /**
    */
    get infinity() {
        const ret = wasm.__wbg_get_wasmgpallas_infinity(this.ptr);
        return ret !== 0;
    }
    /**
    */
    set infinity(arg0) {
        wasm.__wbg_set_wasmgpallas_infinity(this.ptr, arg0);
    }
}
module.exports.WasmGPallas = WasmGPallas;
/**
*/
class WasmGVesta {

    static __wrap(ptr) {
        const obj = Object.create(WasmGVesta.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmgvesta_free(ptr);
    }
    /**
    */
    get x() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgvesta_x(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set x(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgvesta_x(this.ptr, ptr0, len0);
    }
    /**
    */
    get y() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_wasmgvesta_y(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    set y(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgvesta_y(this.ptr, ptr0, len0);
    }
    /**
    */
    get infinity() {
        const ret = wasm.__wbg_get_wasmgpallas_infinity(this.ptr);
        return ret !== 0;
    }
    /**
    */
    set infinity(arg0) {
        wasm.__wbg_set_wasmgpallas_infinity(this.ptr, arg0);
    }
}
module.exports.WasmGVesta = WasmGVesta;
/**
*/
class WasmGateWires {

    static __wrap(ptr) {
        const obj = Object.create(WasmGateWires.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmgatewires_free(ptr);
    }
    /**
    */
    get 0() {
        const ret = wasm.__wbg_get_wasmgatewires_0(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    */
    set 0(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmgatewires_0(this.ptr, ptr0);
    }
    /**
    */
    get 1() {
        const ret = wasm.__wbg_get_wasmgatewires_1(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    */
    set 1(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmgatewires_1(this.ptr, ptr0);
    }
    /**
    */
    get 2() {
        const ret = wasm.__wbg_get_wasmgatewires_2(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    */
    set 2(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmgatewires_2(this.ptr, ptr0);
    }
    /**
    */
    get 3() {
        const ret = wasm.__wbg_get_wasmgatewires_3(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    */
    set 3(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmgatewires_3(this.ptr, ptr0);
    }
    /**
    */
    get 4() {
        const ret = wasm.__wbg_get_wasmgatewires_4(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    */
    set 4(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmgatewires_4(this.ptr, ptr0);
    }
    /**
    */
    get 5() {
        const ret = wasm.__wbg_get_wasmgatewires_5(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    */
    set 5(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmgatewires_5(this.ptr, ptr0);
    }
    /**
    */
    get 6() {
        const ret = wasm.__wbg_get_wasmgatewires_6(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    */
    set 6(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.ptr;
        arg0.ptr = 0;
        wasm.__wbg_set_wasmgatewires_6(this.ptr, ptr0);
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
        var ptr0 = w0.ptr;
        w0.ptr = 0;
        _assertClass(w1, Wire);
        var ptr1 = w1.ptr;
        w1.ptr = 0;
        _assertClass(w2, Wire);
        var ptr2 = w2.ptr;
        w2.ptr = 0;
        _assertClass(w3, Wire);
        var ptr3 = w3.ptr;
        w3.ptr = 0;
        _assertClass(w4, Wire);
        var ptr4 = w4.ptr;
        w4.ptr = 0;
        _assertClass(w5, Wire);
        var ptr5 = w5.ptr;
        w5.ptr = 0;
        _assertClass(w6, Wire);
        var ptr6 = w6.ptr;
        w6.ptr = 0;
        const ret = wasm.wasmgatewires_new(ptr0, ptr1, ptr2, ptr3, ptr4, ptr5, ptr6);
        return WasmGateWires.__wrap(ret);
    }
}
module.exports.WasmGateWires = WasmGateWires;
/**
*/
class WasmPallasGProjective {

    static __wrap(ptr) {
        const obj = Object.create(WasmPallasGProjective.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(WasmPastaFpPlonkIndex.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(WasmPastaFqPlonkIndex.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(WasmVecVecFp.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        wasm.wasmvecvecfp_push(this.ptr, ptr0, len0);
    }
    /**
    * @param {number} i
    * @returns {Uint8Array}
    */
    get(i) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmvecvecfp_get(retptr, this.ptr, i);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
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
        wasm.wasmvecvecfp_set(this.ptr, i, ptr0, len0);
    }
}
module.exports.WasmVecVecFp = WasmVecVecFp;
/**
*/
class WasmVecVecFpPolyComm {

    static __wrap(ptr) {
        const obj = Object.create(WasmVecVecFpPolyComm.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        wasm.wasmvecvecfppolycomm_push(this.ptr, ptr0, len0);
    }
}
module.exports.WasmVecVecFpPolyComm = WasmVecVecFpPolyComm;
/**
*/
class WasmVecVecFq {

    static __wrap(ptr) {
        const obj = Object.create(WasmVecVecFq.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const ret = wasm.wasmvecvecfq_create(n);
        return WasmVecVecFq.__wrap(ret);
    }
    /**
    * @param {Uint8Array} x
    */
    push(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfq_push(this.ptr, ptr0, len0);
    }
    /**
    * @param {number} i
    * @returns {Uint8Array}
    */
    get(i) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.wasmvecvecfq_get(retptr, this.ptr, i);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
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
        wasm.wasmvecvecfq_set(this.ptr, i, ptr0, len0);
    }
}
module.exports.WasmVecVecFq = WasmVecVecFq;
/**
*/
class WasmVecVecFqPolyComm {

    static __wrap(ptr) {
        const obj = Object.create(WasmVecVecFqPolyComm.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const ret = wasm.wasmvecvecfq_create(n);
        return WasmVecVecFqPolyComm.__wrap(ret);
    }
    /**
    * @param {Uint32Array} x
    */
    push(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmvecvecfqpolycomm_push(this.ptr, ptr0, len0);
    }
}
module.exports.WasmVecVecFqPolyComm = WasmVecVecFqPolyComm;
/**
*/
class WasmVestaGProjective {

    static __wrap(ptr) {
        const obj = Object.create(WasmVestaGProjective.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

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
        const obj = Object.create(Wire.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wire_free(ptr);
    }
    /**
    */
    get row() {
        const ret = wasm.__wbg_get_wire_row(this.ptr);
        return ret >>> 0;
    }
    /**
    */
    set row(arg0) {
        wasm.__wbg_set_wire_row(this.ptr, arg0);
    }
    /**
    */
    get col() {
        const ret = wasm.__wbg_get_wire_col(this.ptr);
        return ret >>> 0;
    }
    /**
    */
    set col(arg0) {
        wasm.__wbg_set_wire_col(this.ptr, arg0);
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
/**
*/
class wbg_rayon_PoolBuilder {

    static __wrap(ptr) {
        const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wbg_rayon_poolbuilder_free(ptr);
    }
    /**
    * @returns {number}
    */
    numThreads() {
        const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    receiver() {
        const ret = wasm.wbg_rayon_poolbuilder_receiver(this.ptr);
        return ret;
    }
    /**
    */
    build() {
        wasm.wbg_rayon_poolbuilder_build(this.ptr);
    }
}
module.exports.wbg_rayon_PoolBuilder = wbg_rayon_PoolBuilder;

module.exports.__wbg_alert_b014848fc9035c81 = function(arg0, arg1) {
    alert(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbg_log_19fef73d9a645b72 = function(arg0, arg1) {
    console.log(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

module.exports.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
};

module.exports.__wbg_new_693216e109162396 = function() {
    const ret = new Error();
    return addHeapObject(ret);
};

module.exports.__wbg_stack_0ddaca5d1abfb52f = function(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

module.exports.__wbg_error_09919627ac0992f5 = function(arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
};

module.exports.__wbg_process_e56fd54cf6319b6c = function(arg0) {
    const ret = getObject(arg0).process;
    return addHeapObject(ret);
};

module.exports.__wbindgen_is_object = function(arg0) {
    const val = getObject(arg0);
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

module.exports.__wbg_versions_77e21455908dad33 = function(arg0) {
    const ret = getObject(arg0).versions;
    return addHeapObject(ret);
};

module.exports.__wbg_node_0dd25d832e4785d5 = function(arg0) {
    const ret = getObject(arg0).node;
    return addHeapObject(ret);
};

module.exports.__wbindgen_is_string = function(arg0) {
    const ret = typeof(getObject(arg0)) === 'string';
    return ret;
};

module.exports.__wbg_require_0db1598d9ccecb30 = function() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).require(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_crypto_b95d7173266618a9 = function(arg0) {
    const ret = getObject(arg0).crypto;
    return addHeapObject(ret);
};

module.exports.__wbg_msCrypto_5a86d77a66230f81 = function(arg0) {
    const ret = getObject(arg0).msCrypto;
    return addHeapObject(ret);
};

module.exports.__wbg_getRandomValues_b14734aa289bc356 = function() { return handleError(function (arg0, arg1) {
    getObject(arg0).getRandomValues(getObject(arg1));
}, arguments) };

module.exports.__wbg_static_accessor_NODE_MODULE_26b231378c1be7dd = function() {
    const ret = module;
    return addHeapObject(ret);
};

module.exports.__wbg_randomFillSync_91e2b39becca6147 = function() { return handleError(function (arg0, arg1, arg2) {
    getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
}, arguments) };

module.exports.__wbg_newnoargs_fc5356289219b93b = function(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_call_4573f605ca4b5f10 = function() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbindgen_object_clone_ref = function(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

module.exports.__wbg_self_ba1ddafe9ea7a3a2 = function() { return handleError(function () {
    const ret = self.self;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_window_be3cc430364fd32c = function() { return handleError(function () {
    const ret = window.window;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_globalThis_56d9c9f814daeeee = function() { return handleError(function () {
    const ret = globalThis.globalThis;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_global_8c35aeee4ac77f2b = function() { return handleError(function () {
    const ret = global.global;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbindgen_is_undefined = function(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

module.exports.__wbg_buffer_de1150f91b23aa89 = function(arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

module.exports.__wbg_new_97cf52648830a70d = function(arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_set_a0172b213e2469e9 = function(arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
};

module.exports.__wbg_length_e09c0b925ab8de5d = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_newwithlength_e833b89f9db02732 = function(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbg_subarray_9482ae5cd5cd99d3 = function(arg0, arg1, arg2) {
    const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbindgen_memory = function() {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

module.exports.__wbg_startWorkers_3482c2aa07586a4c = function(arg0, arg1, arg2) {
    const ret = startWorkers(takeObject(arg0), takeObject(arg1), wbg_rayon_PoolBuilder.__wrap(arg2));
    return addHeapObject(ret);
};

const path = require('path').join(__dirname, 'plonk_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);

wasm.__wbindgen_start();

