let wasm;

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

const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.buffer !== wasm.memory.buffer) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().slice(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
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

const cachedTextEncoder = new TextEncoder('utf-8');

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

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.buffer !== wasm.memory.buffer) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @returns {WasmGPallas}
*/
export function caml_pallas_affine_one() {
    const ret = wasm.caml_pallas_affine_one();
    return WasmGPallas.__wrap(ret);
}

/**
* @returns {WasmGVesta}
*/
export function caml_vesta_affine_one() {
    const ret = wasm.caml_vesta_affine_one();
    return WasmGVesta.__wrap(ret);
}

/**
* @param {Uint8Array} state
* @returns {Uint8Array}
*/
export function caml_pasta_fp_poseidon_block_cipher(state) {
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
}

/**
* @param {Uint8Array} state
* @returns {Uint8Array}
*/
export function caml_pasta_fq_poseidon_block_cipher(state) {
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
}

/**
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_one() {
    const ret = wasm.caml_pallas_one();
    return WasmPallasGProjective.__wrap(ret);
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}
/**
* @param {WasmPallasGProjective} x
* @param {WasmPallasGProjective} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_add(x, y) {
    _assertClass(x, WasmPallasGProjective);
    _assertClass(y, WasmPallasGProjective);
    const ret = wasm.caml_pallas_add(x.ptr, y.ptr);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @param {WasmPallasGProjective} x
* @param {WasmPallasGProjective} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_sub(x, y) {
    _assertClass(x, WasmPallasGProjective);
    _assertClass(y, WasmPallasGProjective);
    const ret = wasm.caml_pallas_sub(x.ptr, y.ptr);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_negate(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_negate(x.ptr);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_double(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_double(x.ptr);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @param {WasmPallasGProjective} x
* @param {Uint8Array} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_scale(x, y) {
    _assertClass(x, WasmPallasGProjective);
    const ptr0 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pallas_scale(x.ptr, ptr0, len0);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_random() {
    const ret = wasm.caml_pallas_random();
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @param {number} i
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_rng(i) {
    const ret = wasm.caml_pallas_rng(i);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @returns {Uint8Array}
*/
export function caml_pallas_endo_base() {
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
}

/**
* @returns {Uint8Array}
*/
export function caml_pallas_endo_scalar() {
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
}

/**
* @param {WasmPallasGProjective} x
* @returns {WasmGPallas}
*/
export function caml_pallas_to_affine(x) {
    _assertClass(x, WasmPallasGProjective);
    const ret = wasm.caml_pallas_to_affine(x.ptr);
    return WasmGPallas.__wrap(ret);
}

/**
* @param {WasmGPallas} x
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_of_affine(x) {
    _assertClass(x, WasmGPallas);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pallas_of_affine(ptr0);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_of_affine_coordinates(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pallas_of_affine_coordinates(ptr0, len0, ptr1, len1);
    return WasmPallasGProjective.__wrap(ret);
}

/**
* @param {WasmGPallas} x
* @returns {WasmGPallas}
*/
export function caml_pallas_affine_deep_copy(x) {
    _assertClass(x, WasmGPallas);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pallas_affine_deep_copy(ptr0);
    return WasmGPallas.__wrap(ret);
}

/**
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_one() {
    const ret = wasm.caml_vesta_one();
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {WasmVestaGProjective} x
* @param {WasmVestaGProjective} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_add(x, y) {
    _assertClass(x, WasmVestaGProjective);
    _assertClass(y, WasmVestaGProjective);
    const ret = wasm.caml_vesta_add(x.ptr, y.ptr);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {WasmVestaGProjective} x
* @param {WasmVestaGProjective} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_sub(x, y) {
    _assertClass(x, WasmVestaGProjective);
    _assertClass(y, WasmVestaGProjective);
    const ret = wasm.caml_vesta_sub(x.ptr, y.ptr);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_negate(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_negate(x.ptr);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_double(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_double(x.ptr);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {WasmVestaGProjective} x
* @param {Uint8Array} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_scale(x, y) {
    _assertClass(x, WasmVestaGProjective);
    const ptr0 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_vesta_scale(x.ptr, ptr0, len0);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_random() {
    const ret = wasm.caml_vesta_random();
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {number} i
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_rng(i) {
    const ret = wasm.caml_vesta_rng(i);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @returns {Uint8Array}
*/
export function caml_vesta_endo_base() {
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
}

/**
* @returns {Uint8Array}
*/
export function caml_vesta_endo_scalar() {
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
}

/**
* @param {WasmVestaGProjective} x
* @returns {WasmGVesta}
*/
export function caml_vesta_to_affine(x) {
    _assertClass(x, WasmVestaGProjective);
    const ret = wasm.caml_vesta_to_affine(x.ptr);
    return WasmGVesta.__wrap(ret);
}

/**
* @param {WasmGVesta} x
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_of_affine(x) {
    _assertClass(x, WasmGVesta);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_vesta_of_affine(ptr0);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_of_affine_coordinates(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_vesta_of_affine_coordinates(ptr0, len0, ptr1, len1);
    return WasmVestaGProjective.__wrap(ret);
}

/**
* @param {WasmGVesta} x
* @returns {WasmGVesta}
*/
export function caml_vesta_affine_deep_copy(x) {
    _assertClass(x, WasmGVesta);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pallas_affine_deep_copy(ptr0);
    return WasmGVesta.__wrap(ret);
}

/**
* @param {WasmPastaFpPlonkIndex} prover_index
* @returns {string}
*/
export function prover_to_json(prover_index) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(prover_index, WasmPastaFpPlonkIndex);
        wasm.prover_to_json(retptr, prover_index.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
    }
}

/**
* @returns {WasmFpGateVector}
*/
export function caml_pasta_fp_plonk_gate_vector_create() {
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_create();
    return WasmFpGateVector.__wrap(ret);
}

/**
* @param {WasmFpGateVector} v
* @param {WasmFpGate} gate
*/
export function caml_pasta_fp_plonk_gate_vector_add(v, gate) {
    _assertClass(v, WasmFpGateVector);
    _assertClass(gate, WasmFpGate);
    var ptr0 = gate.__destroy_into_raw();
    wasm.caml_pasta_fp_plonk_gate_vector_add(v.ptr, ptr0);
}

/**
* @param {WasmFpGateVector} v
* @param {number} i
* @returns {WasmFpGate}
*/
export function caml_pasta_fp_plonk_gate_vector_get(v, i) {
    _assertClass(v, WasmFpGateVector);
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_get(v.ptr, i);
    return WasmFpGate.__wrap(ret);
}

/**
* @param {WasmFpGateVector} v
* @returns {number}
*/
export function caml_pasta_fp_plonk_gate_vector_len(v) {
    _assertClass(v, WasmFpGateVector);
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_len(v.ptr);
    return ret >>> 0;
}

/**
* @param {WasmFpGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
export function caml_pasta_fp_plonk_gate_vector_wrap(v, t, h) {
    _assertClass(v, WasmFpGateVector);
    _assertClass(t, Wire);
    var ptr0 = t.__destroy_into_raw();
    _assertClass(h, Wire);
    var ptr1 = h.__destroy_into_raw();
    wasm.caml_pasta_fp_plonk_gate_vector_wrap(v.ptr, ptr0, ptr1);
}

/**
* @param {number} public_input_size
* @param {WasmFpGateVector} v
* @returns {Uint8Array}
*/
export function caml_pasta_fp_plonk_gate_vector_digest(public_input_size, v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFpGateVector);
        wasm.caml_pasta_fp_plonk_gate_vector_digest(retptr, public_input_size, v.ptr);
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
* @param {number} public_input_size
* @param {WasmFpGateVector} v
* @returns {string}
*/
export function caml_pasta_fp_plonk_circuit_serialize(public_input_size, v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFpGateVector);
        wasm.caml_pasta_fp_plonk_circuit_serialize(retptr, public_input_size, v.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
    }
}

/**
* @returns {WasmFqGateVector}
*/
export function caml_pasta_fq_plonk_gate_vector_create() {
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_create();
    return WasmFqGateVector.__wrap(ret);
}

/**
* @param {WasmFqGateVector} v
* @param {WasmFqGate} gate
*/
export function caml_pasta_fq_plonk_gate_vector_add(v, gate) {
    _assertClass(v, WasmFqGateVector);
    _assertClass(gate, WasmFqGate);
    var ptr0 = gate.__destroy_into_raw();
    wasm.caml_pasta_fq_plonk_gate_vector_add(v.ptr, ptr0);
}

/**
* @param {WasmFqGateVector} v
* @param {number} i
* @returns {WasmFqGate}
*/
export function caml_pasta_fq_plonk_gate_vector_get(v, i) {
    _assertClass(v, WasmFqGateVector);
    const ret = wasm.caml_pasta_fq_plonk_gate_vector_get(v.ptr, i);
    return WasmFqGate.__wrap(ret);
}

/**
* @param {WasmFqGateVector} v
* @returns {number}
*/
export function caml_pasta_fq_plonk_gate_vector_len(v) {
    _assertClass(v, WasmFqGateVector);
    const ret = wasm.caml_pasta_fp_plonk_gate_vector_len(v.ptr);
    return ret >>> 0;
}

/**
* @param {WasmFqGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
export function caml_pasta_fq_plonk_gate_vector_wrap(v, t, h) {
    _assertClass(v, WasmFqGateVector);
    _assertClass(t, Wire);
    var ptr0 = t.__destroy_into_raw();
    _assertClass(h, Wire);
    var ptr1 = h.__destroy_into_raw();
    wasm.caml_pasta_fq_plonk_gate_vector_wrap(v.ptr, ptr0, ptr1);
}

/**
* @param {number} public_input_size
* @param {WasmFqGateVector} v
* @returns {Uint8Array}
*/
export function caml_pasta_fq_plonk_gate_vector_digest(public_input_size, v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFqGateVector);
        wasm.caml_pasta_fq_plonk_gate_vector_digest(retptr, public_input_size, v.ptr);
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
* @param {number} public_input_size
* @param {WasmFqGateVector} v
* @returns {string}
*/
export function caml_pasta_fq_plonk_circuit_serialize(public_input_size, v) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(v, WasmFqGateVector);
        wasm.caml_pasta_fq_plonk_circuit_serialize(retptr, public_input_size, v.ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
    }
}

/**
* @param {number} depth
* @returns {WasmFpSrs}
*/
export function caml_fp_srs_create(depth) {
    const ret = wasm.caml_fp_srs_create(depth);
    return WasmFpSrs.__wrap(ret);
}

/**
* @param {WasmFpSrs} srs
* @param {number} log2_size
*/
export function caml_fp_srs_add_lagrange_basis(srs, log2_size) {
    _assertClass(srs, WasmFpSrs);
    wasm.caml_fp_srs_add_lagrange_basis(srs.ptr, log2_size);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}
/**
* @param {boolean | undefined} append
* @param {WasmFpSrs} srs
* @param {string} path
*/
export function caml_fp_srs_write(append, srs, path) {
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
}

/**
* @param {number | undefined} offset
* @param {string} path
* @returns {WasmFpSrs | undefined}
*/
export function caml_fp_srs_read(offset, path) {
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
}

/**
* @param {WasmFpSrs} srs
* @param {number} domain_size
* @param {number} i
* @returns {WasmFpPolyComm}
*/
export function caml_fp_srs_lagrange_commitment(srs, domain_size, i) {
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
}

/**
* @param {WasmFpSrs} srs
* @param {number} domain_size
* @param {Uint8Array} evals
* @returns {WasmFpPolyComm}
*/
export function caml_fp_srs_commit_evaluations(srs, domain_size, evals) {
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
}

/**
* @param {WasmFpSrs} srs
* @param {Uint8Array} chals
* @returns {WasmFpPolyComm}
*/
export function caml_fp_srs_b_poly_commitment(srs, chals) {
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
}

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.buffer !== wasm.memory.buffer) {
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
/**
* @param {WasmFpSrs} srs
* @param {Uint32Array} comms
* @param {Uint8Array} chals
* @returns {boolean}
*/
export function caml_fp_srs_batch_accumulator_check(srs, comms, chals) {
    _assertClass(srs, WasmFpSrs);
    const ptr0 = passArray32ToWasm0(comms, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_fp_srs_batch_accumulator_check(srs.ptr, ptr0, len0, ptr1, len1);
    return ret !== 0;
}

function getArrayU32FromWasm0(ptr, len) {
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}
/**
* @param {WasmFpSrs} srs
* @param {number} comms
* @param {Uint8Array} chals
* @returns {Uint32Array}
*/
export function caml_fp_srs_batch_accumulator_generate(srs, comms, chals) {
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
}

/**
* @param {WasmFpSrs} srs
* @returns {WasmGVesta}
*/
export function caml_fp_srs_h(srs) {
    _assertClass(srs, WasmFpSrs);
    const ret = wasm.caml_fp_srs_h(srs.ptr);
    return WasmGVesta.__wrap(ret);
}

/**
* @param {number} depth
* @returns {WasmFqSrs}
*/
export function caml_fq_srs_create(depth) {
    const ret = wasm.caml_fq_srs_create(depth);
    return WasmFqSrs.__wrap(ret);
}

/**
* @param {WasmFqSrs} srs
* @param {number} log2_size
*/
export function caml_fq_srs_add_lagrange_basis(srs, log2_size) {
    _assertClass(srs, WasmFqSrs);
    wasm.caml_fq_srs_add_lagrange_basis(srs.ptr, log2_size);
}

/**
* @param {boolean | undefined} append
* @param {WasmFqSrs} srs
* @param {string} path
*/
export function caml_fq_srs_write(append, srs, path) {
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
}

/**
* @param {number | undefined} offset
* @param {string} path
* @returns {WasmFqSrs | undefined}
*/
export function caml_fq_srs_read(offset, path) {
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
}

/**
* @param {WasmFqSrs} srs
* @param {number} domain_size
* @param {number} i
* @returns {WasmFqPolyComm}
*/
export function caml_fq_srs_lagrange_commitment(srs, domain_size, i) {
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
}

/**
* @param {WasmFqSrs} srs
* @param {number} domain_size
* @param {Uint8Array} evals
* @returns {WasmFqPolyComm}
*/
export function caml_fq_srs_commit_evaluations(srs, domain_size, evals) {
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
}

/**
* @param {WasmFqSrs} srs
* @param {Uint8Array} chals
* @returns {WasmFqPolyComm}
*/
export function caml_fq_srs_b_poly_commitment(srs, chals) {
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
}

/**
* @param {WasmFqSrs} srs
* @param {Uint32Array} comms
* @param {Uint8Array} chals
* @returns {boolean}
*/
export function caml_fq_srs_batch_accumulator_check(srs, comms, chals) {
    _assertClass(srs, WasmFqSrs);
    const ptr0 = passArray32ToWasm0(comms, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(chals, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_fq_srs_batch_accumulator_check(srs.ptr, ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
* @param {WasmFqSrs} srs
* @param {number} comms
* @param {Uint8Array} chals
* @returns {Uint32Array}
*/
export function caml_fq_srs_batch_accumulator_generate(srs, comms, chals) {
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
}

/**
* @param {WasmFqSrs} srs
* @returns {WasmGPallas}
*/
export function caml_fq_srs_h(srs) {
    _assertClass(srs, WasmFqSrs);
    const ret = wasm.caml_fp_srs_h(srs.ptr);
    return WasmGPallas.__wrap(ret);
}

/**
* @param {number | undefined} offset
* @param {WasmFqSrs} srs
* @param {string} path
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_read(offset, srs, path) {
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
}

/**
* @param {boolean | undefined} append
* @param {WasmFqPlonkVerifierIndex} index
* @param {string} path
*/
export function caml_pasta_fq_plonk_verifier_index_write(append, index, path) {
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
}

/**
* @param {WasmFqPlonkVerifierIndex} index
* @returns {string}
*/
export function caml_pasta_fq_plonk_verifier_index_serialize(index) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFqPlonkVerifierIndex);
        var ptr0 = index.__destroy_into_raw();
        wasm.caml_pasta_fq_plonk_verifier_index_serialize(retptr, ptr0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
    }
}

/**
* @param {WasmFqSrs} srs
* @param {string} index
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_deserialize(srs, index) {
    _assertClass(srs, WasmFqSrs);
    const ptr0 = passStringToWasm0(index, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_deserialize(srs.ptr, ptr0, len0);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_create(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_create(index.ptr);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {number} log2_size
* @returns {WasmFqShifts}
*/
export function caml_pasta_fq_plonk_verifier_index_shifts(log2_size) {
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_shifts(log2_size);
    return WasmFqShifts.__wrap(ret);
}

/**
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_dummy() {
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_dummy();
    return WasmFqPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {WasmFqPlonkVerifierIndex} x
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_deep_copy(x) {
    _assertClass(x, WasmFqPlonkVerifierIndex);
    const ret = wasm.caml_pasta_fq_plonk_verifier_index_deep_copy(x.ptr);
    return WasmFqPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {number} num_threads
* @returns {Promise<any>}
*/
export function initThreadPool(num_threads) {
    const ret = wasm.initThreadPool(num_threads);
    return takeObject(ret);
}

/**
* @returns {Promise<any>}
*/
export function exitThreadPool() {
    const ret = wasm.exitThreadPool();
    return takeObject(ret);
}

/**
* @param {number} receiver
*/
export function wbg_rayon_start_worker(receiver) {
    wasm.wbg_rayon_start_worker(receiver);
}

/**
* @param {number | undefined} offset
* @param {WasmFpSrs} srs
* @param {string} path
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_read(offset, srs, path) {
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
}

/**
* @param {boolean | undefined} append
* @param {WasmFpPlonkVerifierIndex} index
* @param {string} path
*/
export function caml_pasta_fp_plonk_verifier_index_write(append, index, path) {
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
}

/**
* @param {WasmFpPlonkVerifierIndex} index
* @returns {string}
*/
export function caml_pasta_fp_plonk_verifier_index_serialize(index) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmFpPlonkVerifierIndex);
        var ptr0 = index.__destroy_into_raw();
        wasm.caml_pasta_fp_plonk_verifier_index_serialize(retptr, ptr0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
    }
}

/**
* @param {WasmFpSrs} srs
* @param {string} index
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_deserialize(srs, index) {
    _assertClass(srs, WasmFpSrs);
    const ptr0 = passStringToWasm0(index, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_deserialize(srs.ptr, ptr0, len0);
    return WasmFpPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_create(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_create(index.ptr);
    return WasmFpPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {number} log2_size
* @returns {WasmFpShifts}
*/
export function caml_pasta_fp_plonk_verifier_index_shifts(log2_size) {
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_shifts(log2_size);
    return WasmFpShifts.__wrap(ret);
}

/**
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_dummy() {
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_dummy();
    return WasmFpPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {WasmFpPlonkVerifierIndex} x
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_deep_copy(x) {
    _assertClass(x, WasmFpPlonkVerifierIndex);
    const ret = wasm.caml_pasta_fp_plonk_verifier_index_deep_copy(x.ptr);
    return WasmFpPlonkVerifierIndex.__wrap(ret);
}

/**
* @param {Uint32Array} lgr_comm
* @param {WasmFpPlonkVerifierIndex} index
* @param {WasmFpProverProof} proof
* @returns {WasmFpOracles}
*/
export function fp_oracles_create(lgr_comm, index, proof) {
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
}

/**
* @returns {WasmFpOracles}
*/
export function fp_oracles_dummy() {
    const ret = wasm.fp_oracles_dummy();
    return WasmFpOracles.__wrap(ret);
}

/**
* @param {WasmFpProverProof} x
* @returns {WasmFpProverProof}
*/
export function fp_oracles_deep_copy(x) {
    _assertClass(x, WasmFpProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFpProverProof.__wrap(ret);
}

/**
* @param {Uint32Array} lgr_comm
* @param {WasmFqPlonkVerifierIndex} index
* @param {WasmFqProverProof} proof
* @returns {WasmFqOracles}
*/
export function fq_oracles_create(lgr_comm, index, proof) {
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
}

/**
* @returns {WasmFqOracles}
*/
export function fq_oracles_dummy() {
    const ret = wasm.fp_oracles_dummy();
    return WasmFqOracles.__wrap(ret);
}

/**
* @param {WasmFqProverProof} x
* @returns {WasmFqProverProof}
*/
export function fq_oracles_deep_copy(x) {
    _assertClass(x, WasmFqProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFqProverProof.__wrap(ret);
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @param {WasmVecVecFp} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFpProverProof}
*/
export function caml_pasta_fp_plonk_proof_create(index, witness, prev_challenges, prev_sgs) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFpPlonkIndex);
        _assertClass(witness, WasmVecVecFp);
        var ptr0 = witness.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(prev_challenges, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(prev_sgs, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fp_plonk_proof_create(retptr, index.ptr, ptr0, ptr1, len1, ptr2, len2);
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
}

/**
* @param {WasmFpPlonkVerifierIndex} index
* @param {WasmFpProverProof} proof
* @returns {boolean}
*/
export function caml_pasta_fp_plonk_proof_verify(index, proof) {
    _assertClass(index, WasmFpPlonkVerifierIndex);
    var ptr0 = index.__destroy_into_raw();
    _assertClass(proof, WasmFpProverProof);
    var ptr1 = proof.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_verify(ptr0, ptr1);
    return ret !== 0;
}

/**
* @param {Uint32Array} indexes
* @param {Uint32Array} proofs
* @returns {boolean}
*/
export function caml_pasta_fp_plonk_proof_batch_verify(indexes, proofs) {
    const ptr0 = passArray32ToWasm0(indexes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(proofs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_plonk_proof_batch_verify(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
* @returns {WasmFpProverProof}
*/
export function caml_pasta_fp_plonk_proof_dummy() {
    const ret = wasm.caml_pasta_fp_plonk_proof_dummy();
    return WasmFpProverProof.__wrap(ret);
}

/**
* @param {WasmFpProverProof} x
* @returns {WasmFpProverProof}
*/
export function caml_pasta_fp_plonk_proof_deep_copy(x) {
    _assertClass(x, WasmFpProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFpProverProof.__wrap(ret);
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @param {WasmVecVecFq} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFqProverProof}
*/
export function caml_pasta_fq_plonk_proof_create(index, witness, prev_challenges, prev_sgs) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        _assertClass(index, WasmPastaFqPlonkIndex);
        _assertClass(witness, WasmVecVecFq);
        var ptr0 = witness.__destroy_into_raw();
        const ptr1 = passArray8ToWasm0(prev_challenges, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(prev_sgs, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        wasm.caml_pasta_fq_plonk_proof_create(retptr, index.ptr, ptr0, ptr1, len1, ptr2, len2);
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
}

/**
* @param {WasmFqPlonkVerifierIndex} index
* @param {WasmFqProverProof} proof
* @returns {boolean}
*/
export function caml_pasta_fq_plonk_proof_verify(index, proof) {
    _assertClass(index, WasmFqPlonkVerifierIndex);
    var ptr0 = index.__destroy_into_raw();
    _assertClass(proof, WasmFqProverProof);
    var ptr1 = proof.__destroy_into_raw();
    const ret = wasm.caml_pasta_fq_plonk_proof_verify(ptr0, ptr1);
    return ret !== 0;
}

/**
* @param {Uint32Array} indexes
* @param {Uint32Array} proofs
* @returns {boolean}
*/
export function caml_pasta_fq_plonk_proof_batch_verify(indexes, proofs) {
    const ptr0 = passArray32ToWasm0(indexes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(proofs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_plonk_proof_batch_verify(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
* @returns {WasmFqProverProof}
*/
export function caml_pasta_fq_plonk_proof_dummy() {
    const ret = wasm.caml_pasta_fq_plonk_proof_dummy();
    return WasmFqProverProof.__wrap(ret);
}

/**
* @param {WasmFqProverProof} x
* @returns {WasmFqProverProof}
*/
export function caml_pasta_fq_plonk_proof_deep_copy(x) {
    _assertClass(x, WasmFqProverProof);
    var ptr0 = x.__destroy_into_raw();
    const ret = wasm.caml_pasta_fp_plonk_proof_deep_copy(ptr0);
    return WasmFqProverProof.__wrap(ret);
}

/**
* @param {string} s
* @param {number} _len
* @param {number} base
* @returns {Uint8Array}
*/
export function caml_bigint_256_of_numeral(s, _len, base) {
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
}

/**
* @param {string} s
* @returns {Uint8Array}
*/
export function caml_bigint_256_of_decimal_string(s) {
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
}

/**
* @returns {number}
*/
export function caml_bigint_256_num_limbs() {
    const ret = wasm.caml_bigint_256_num_limbs();
    return ret;
}

/**
* @returns {number}
*/
export function caml_bigint_256_bytes_per_limb() {
    const ret = wasm.caml_bigint_256_bytes_per_limb();
    return ret;
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_bigint_256_div(x, y) {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
export function caml_bigint_256_compare(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_bigint_256_compare(ptr0, len0, ptr1, len1);
    return ret;
}

/**
* @param {Uint8Array} x
*/
export function caml_bigint_256_print(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.caml_bigint_256_print(ptr0, len0);
}

/**
* @param {Uint8Array} x
* @returns {string}
*/
export function caml_bigint_256_to_string(x) {
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
}

/**
* @param {Uint8Array} x
* @param {number} i
* @returns {boolean}
*/
export function caml_bigint_256_test_bit(x, i) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_bigint_256_test_bit(ptr0, len0, i);
    return ret !== 0;
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_bigint_256_to_bytes(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_bigint_256_of_bytes(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_bigint_256_deep_copy(x) {
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
}

/**
* @param {string} name
*/
export function greet(name) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.greet(ptr0, len0);
}

/**
* @param {string} s
*/
export function console_log(s) {
    const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.console_log(ptr0, len0);
}

/**
* @returns {number}
*/
export function create_zero_u32_ptr() {
    const ret = wasm.create_zero_u32_ptr();
    return ret;
}

/**
* @param {number} ptr
*/
export function free_u32_ptr(ptr) {
    wasm.free_u32_ptr(ptr);
}

/**
* @param {number} ptr
* @param {number} arg
*/
export function set_u32_ptr(ptr, arg) {
    wasm.set_u32_ptr(ptr, arg);
}

/**
* @param {number} ptr
* @returns {number}
*/
export function wait_until_non_zero(ptr) {
    const ret = wasm.wait_until_non_zero(ptr);
    return ret >>> 0;
}

/**
* @param {WasmFpGateVector} gates
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFpSrs} srs
* @returns {WasmPastaFpPlonkIndex}
*/
export function caml_pasta_fp_plonk_index_create(gates, public_, prev_challenges, srs) {
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
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_max_degree(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_max_degree(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_public_inputs(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_public_inputs(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_domain_d1_size(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d1_size(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_domain_d4_size(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d4_size(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_domain_d8_size(index) {
    _assertClass(index, WasmPastaFpPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d8_size(index.ptr);
    return ret;
}

/**
* @param {number | undefined} offset
* @param {WasmFpSrs} srs
* @param {string} path
* @returns {WasmPastaFpPlonkIndex}
*/
export function caml_pasta_fp_plonk_index_read(offset, srs, path) {
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
}

/**
* @param {boolean | undefined} append
* @param {WasmPastaFpPlonkIndex} index
* @param {string} path
*/
export function caml_pasta_fp_plonk_index_write(append, index, path) {
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
}

/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {string}
*/
export function caml_pasta_fp_plonk_index_serialize(index) {
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
}

/**
* @param {WasmFqGateVector} gates
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFqSrs} srs
* @returns {WasmPastaFqPlonkIndex}
*/
export function caml_pasta_fq_plonk_index_create(gates, public_, prev_challenges, srs) {
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
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_max_degree(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_max_degree(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_public_inputs(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_public_inputs(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_domain_d1_size(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d1_size(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_domain_d4_size(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d4_size(index.ptr);
    return ret;
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_domain_d8_size(index) {
    _assertClass(index, WasmPastaFqPlonkIndex);
    const ret = wasm.caml_pasta_fp_plonk_index_domain_d8_size(index.ptr);
    return ret;
}

/**
* @param {number | undefined} offset
* @param {WasmFqSrs} srs
* @param {string} path
* @returns {WasmPastaFqPlonkIndex}
*/
export function caml_pasta_fq_plonk_index_read(offset, srs, path) {
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
}

/**
* @param {boolean | undefined} append
* @param {WasmPastaFqPlonkIndex} index
* @param {string} path
*/
export function caml_pasta_fq_plonk_index_write(append, index, path) {
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
}

/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {string}
*/
export function caml_pasta_fq_plonk_index_serialize(index) {
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
}

/**
* @returns {number}
*/
export function caml_pasta_fp_size_in_bits() {
    const ret = wasm.caml_pasta_fp_size_in_bits();
    return ret;
}

/**
* @returns {Uint8Array}
*/
export function caml_pasta_fp_size() {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_add(x, y) {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_sub(x, y) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_negate(x) {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_mul(x, y) {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_div(x, y) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fp_inv(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_square(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {boolean}
*/
export function caml_pasta_fp_is_square(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_is_square(ptr0, len0);
    return ret !== 0;
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fp_sqrt(x) {
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
}

/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_int(i) {
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
}

/**
* @param {Uint8Array} x
* @returns {string}
*/
export function caml_pasta_fp_to_string(x) {
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
}

/**
* @param {string} s
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_string(s) {
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
}

/**
* @param {Uint8Array} x
*/
export function caml_pasta_fp_print(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.caml_pasta_fp_print(ptr0, len0);
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
export function caml_pasta_fp_compare(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_compare(ptr0, len0, ptr1, len1);
    return ret;
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {boolean}
*/
export function caml_pasta_fp_equal(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fp_equal(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
* @returns {Uint8Array}
*/
export function caml_pasta_fp_random() {
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
}

/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fp_rng(i) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_to_bigint(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_bigint(x) {
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
}

/**
* @returns {Uint8Array}
*/
export function caml_pasta_fp_two_adic_root_of_unity() {
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
}

/**
* @param {number} log2_size
* @returns {Uint8Array}
*/
export function caml_pasta_fp_domain_generator(log2_size) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_to_bytes(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_bytes(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_deep_copy(x) {
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
}

/**
* @returns {number}
*/
export function caml_pasta_fq_size_in_bits() {
    const ret = wasm.caml_pasta_fp_size_in_bits();
    return ret;
}

/**
* @returns {Uint8Array}
*/
export function caml_pasta_fq_size() {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_add(x, y) {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_sub(x, y) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_negate(x) {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_mul(x, y) {
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
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_div(x, y) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fq_inv(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_square(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {boolean}
*/
export function caml_pasta_fq_is_square(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_is_square(ptr0, len0);
    return ret !== 0;
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fq_sqrt(x) {
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
}

/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_int(i) {
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
}

/**
* @param {Uint8Array} x
* @returns {string}
*/
export function caml_pasta_fq_to_string(x) {
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
}

/**
* @param {string} s
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_string(s) {
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
}

/**
* @param {Uint8Array} x
*/
export function caml_pasta_fq_print(x) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.caml_pasta_fq_print(ptr0, len0);
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
export function caml_pasta_fq_compare(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_compare(ptr0, len0, ptr1, len1);
    return ret;
}

/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {boolean}
*/
export function caml_pasta_fq_equal(x, y) {
    const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.caml_pasta_fq_equal(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
* @returns {Uint8Array}
*/
export function caml_pasta_fq_random() {
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
}

/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fq_rng(i) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_to_bigint(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_bigint(x) {
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
}

/**
* @returns {Uint8Array}
*/
export function caml_pasta_fq_two_adic_root_of_unity() {
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
}

/**
* @param {number} log2_size
* @returns {Uint8Array}
*/
export function caml_pasta_fq_domain_generator(log2_size) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_to_bytes(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_bytes(x) {
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
}

/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_deep_copy(x) {
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
}

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
export const CurrOrNext = Object.freeze({ Curr:0,"0":"Curr",Next:1,"1":"Next", });
/**
* The different types of gates the system supports.
* Note that all the gates are mutually exclusive:
* they cannot be used at the same time on single row.
* If we were ever to support this feature, we would have to make sure
* not to re-use powers of alpha across constraints.
*/
export const GateType = Object.freeze({
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
export class PoolBuilder {

    static __wrap(ptr) {
        const obj = Object.create(PoolBuilder.prototype);
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
        wasm.__wbg_poolbuilder_free(ptr);
    }
    /**
    * @returns {number}
    */
    numThreads() {
        const ret = wasm.poolbuilder_numThreads(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    receiver() {
        const ret = wasm.poolbuilder_receiver(this.ptr);
        return ret;
    }
    /**
    */
    build() {
        wasm.poolbuilder_build(this.ptr);
    }
}
/**
*/
export class WasmFpDomain {

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
    * @returns {number}
    */
    get log_size_of_group() {
        const ret = wasm.__wbg_get_wasmfpdomain_log_size_of_group(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set log_size_of_group(arg0) {
        wasm.__wbg_set_wasmfpdomain_log_size_of_group(this.ptr, arg0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
/**
*/
export class WasmFpGate {

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
    * @returns {number}
    */
    get typ() {
        const ret = wasm.__wbg_get_wasmfpgate_typ(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set typ(arg0) {
        wasm.__wbg_set_wasmfpgate_typ(this.ptr, arg0);
    }
    /**
    * @returns {WasmGateWires}
    */
    get wires() {
        const ret = wasm.__wbg_get_wasmfpgate_wires(this.ptr);
        return WasmGateWires.__wrap(ret);
    }
    /**
    * @param {WasmGateWires} arg0
    */
    set wires(arg0) {
        _assertClass(arg0, WasmGateWires);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpgate_wires(this.ptr, ptr0);
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
/**
*/
export class WasmFpGateVector {

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
/**
*/
export class WasmFpOpeningProof {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set z1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpopeningproof_z1(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
    * @returns {Uint32Array}
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
    * @returns {WasmGVesta}
    */
    get delta() {
        const ret = wasm.wasmfpopeningproof_delta(this.ptr);
        return WasmGVesta.__wrap(ret);
    }
    /**
    * @returns {WasmGVesta}
    */
    get sg() {
        const ret = wasm.wasmfpopeningproof_sg(this.ptr);
        return WasmGVesta.__wrap(ret);
    }
    /**
    * @param {Uint32Array} lr_0
    */
    set lr_0(lr_0) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpopeningproof_set_lr_0(this.ptr, ptr0, len0);
    }
    /**
    * @param {Uint32Array} lr_1
    */
    set lr_1(lr_1) {
        const ptr0 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpopeningproof_set_lr_1(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmGVesta} delta
    */
    set delta(delta) {
        _assertClass(delta, WasmGVesta);
        var ptr0 = delta.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_delta(this.ptr, ptr0);
    }
    /**
    * @param {WasmGVesta} sg
    */
    set sg(sg) {
        _assertClass(sg, WasmGVesta);
        var ptr0 = sg.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_sg(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFpOracles {

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
    * @returns {WasmFpRandomOracles}
    */
    get o() {
        const ret = wasm.__wbg_get_wasmfporacles_o(this.ptr);
        return WasmFpRandomOracles.__wrap(ret);
    }
    /**
    * @param {WasmFpRandomOracles} arg0
    */
    set o(arg0) {
        _assertClass(arg0, WasmFpRandomOracles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfporacles_o(this.ptr, ptr0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set p_eval0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_p_eval0(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set p_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfporacles_p_eval1(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
    * @param {Uint8Array} x
    */
    set opening_prechallenges(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfporacles_set_opening_prechallenges(this.ptr, ptr0, len0);
    }
}
/**
*/
export class WasmFpPlonkVerificationEvals {

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
    * @returns {Uint32Array}
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
    * @param {Uint32Array} x
    */
    set sigma_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpplonkverificationevals_set_sigma_comm(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint32Array}
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
    * @param {Uint32Array} x
    */
    set coefficients_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpplonkverificationevals_set_coefficients_comm(this.ptr, ptr0, len0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get generic_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set generic_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get psm_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set psm_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get complete_add_comm() {
        const ret = wasm.wasmfpplonkverificationevals_complete_add_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set complete_add_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_complete_add_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get mul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_mul_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set mul_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_mul_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get emul_comm() {
        const ret = wasm.wasmfpplonkverificationevals_emul_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set emul_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_emul_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get endomul_scalar_comm() {
        const ret = wasm.wasmfpplonkverificationevals_endomul_scalar_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set endomul_scalar_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_endomul_scalar_comm(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFpPlonkVerifierIndex {

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
    * @returns {WasmFpDomain}
    */
    get domain() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_domain(this.ptr);
        return WasmFpDomain.__wrap(ret);
    }
    /**
    * @param {WasmFpDomain} arg0
    */
    set domain(arg0) {
        _assertClass(arg0, WasmFpDomain);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpplonkverifierindex_domain(this.ptr, ptr0);
    }
    /**
    * @returns {number}
    */
    get max_poly_size() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_max_poly_size(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set max_poly_size(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_max_poly_size(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get public_() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_public_(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set public_(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_public_(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get prev_challenges() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_prev_challenges(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set prev_challenges(arg0) {
        wasm.__wbg_set_wasmfpplonkverifierindex_prev_challenges(this.ptr, arg0);
    }
    /**
    * @returns {WasmFpShifts}
    */
    get shifts() {
        const ret = wasm.__wbg_get_wasmfpplonkverifierindex_shifts(this.ptr);
        return WasmFpShifts.__wrap(ret);
    }
    /**
    * @param {WasmFpShifts} arg0
    */
    set shifts(arg0) {
        _assertClass(arg0, WasmFpShifts);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpplonkverifierindex_shifts(this.ptr, ptr0);
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
        const ret = wasm.wasmfpplonkverifierindex_new(domain.ptr, max_poly_size, public_, prev_challenges, srs.ptr, evals.ptr, shifts.ptr);
        return WasmFpPlonkVerifierIndex.__wrap(ret);
    }
    /**
    * @returns {WasmFpSrs}
    */
    get srs() {
        const ret = wasm.wasmfpplonkverifierindex_srs(this.ptr);
        return WasmFpSrs.__wrap(ret);
    }
    /**
    * @param {WasmFpSrs} x
    */
    set srs(x) {
        _assertClass(x, WasmFpSrs);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverifierindex_set_srs(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFpPlonkVerificationEvals}
    */
    get evals() {
        const ret = wasm.wasmfpplonkverifierindex_evals(this.ptr);
        return WasmFpPlonkVerificationEvals.__wrap(ret);
    }
    /**
    * @param {WasmFpPlonkVerificationEvals} x
    */
    set evals(x) {
        _assertClass(x, WasmFpPlonkVerificationEvals);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverifierindex_set_evals(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFpPolyComm {

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
    * @param {Uint32Array} x
    */
    set unshifted(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfppolycomm_set_unshifted(this.ptr, ptr0, len0);
    }
    /**
    * @returns {WasmGVesta | undefined}
    */
    get shifted() {
        const ret = wasm.__wbg_get_wasmfppolycomm_shifted(this.ptr);
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
        wasm.__wbg_set_wasmfppolycomm_shifted(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFpProverCommitments {

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
    * @returns {WasmFpPolyComm}
    */
    get z_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @returns {WasmFpPolyComm}
    */
    get t_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.ptr);
        return WasmFpPolyComm.__wrap(ret);
    }
    /**
    * @param {Uint32Array} x
    */
    set w_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpprovercommitments_set_w_comm(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set z_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.ptr, ptr0);
    }
    /**
    * @param {WasmFpPolyComm} x
    */
    set t_comm(x) {
        _assertClass(x, WasmFpPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFpProverProof {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set ft_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpproverproof_ft_eval1(this.ptr, ptr0, len0);
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
        const ret = wasm.wasmfpproverproof_commitments(this.ptr);
        return WasmFpProverCommitments.__wrap(ret);
    }
    /**
    * @returns {WasmFpOpeningProof}
    */
    get proof() {
        const ret = wasm.wasmfpproverproof_proof(this.ptr);
        return WasmFpOpeningProof.__wrap(ret);
    }
    /**
    * @returns {any}
    */
    get evals() {
        const ret = wasm.wasmfpproverproof_evals(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {Uint8Array}
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
    * @returns {WasmVecVecFp}
    */
    get prev_challenges_scalars() {
        const ret = wasm.wasmfpproverproof_prev_challenges_scalars(this.ptr);
        return WasmVecVecFp.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
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
    * @param {WasmFpProverCommitments} commitments
    */
    set commitments(commitments) {
        _assertClass(commitments, WasmFpProverCommitments);
        var ptr0 = commitments.__destroy_into_raw();
        wasm.wasmfpproverproof_set_commitments(this.ptr, ptr0);
    }
    /**
    * @param {WasmFpOpeningProof} proof
    */
    set proof(proof) {
        _assertClass(proof, WasmFpOpeningProof);
        var ptr0 = proof.__destroy_into_raw();
        wasm.wasmfpproverproof_set_proof(this.ptr, ptr0);
    }
    /**
    * @param {any} evals
    */
    set evals(evals) {
        wasm.wasmfpproverproof_set_evals(this.ptr, addHeapObject(evals));
    }
    /**
    * @param {Uint8Array} public_
    */
    set public_(public_) {
        const ptr0 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfpproverproof_set_public_(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmVecVecFp} prev_challenges_scalars
    */
    set prev_challenges_scalars(prev_challenges_scalars) {
        _assertClass(prev_challenges_scalars, WasmVecVecFp);
        var ptr0 = prev_challenges_scalars.__destroy_into_raw();
        wasm.wasmfpproverproof_set_prev_challenges_scalars(this.ptr, ptr0);
    }
    /**
    * @param {Uint32Array} prev_challenges_comms
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
/**
*/
export class WasmFpRandomOracles {

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
    * @returns {Uint8Array | undefined}
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
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner_chal(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_joint_combiner_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array | undefined}
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
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_joint_combiner(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set beta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_beta(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set gamma(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_gamma(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set alpha_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_alpha_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set alpha(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_alpha(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set zeta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_zeta(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set v(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_v(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set u(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_u(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set zeta_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_zeta_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set v_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfprandomoracles_v_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
/**
*/
export class WasmFpShifts {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpdomain_group_gen(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s1(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s2(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s3(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s3(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s4(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s4(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s5(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfpshifts_s5(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
/**
*/
export class WasmFpSrs {

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
/**
*/
export class WasmFqDomain {

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
    * @returns {number}
    */
    get log_size_of_group() {
        const ret = wasm.__wbg_get_wasmfqdomain_log_size_of_group(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set log_size_of_group(arg0) {
        wasm.__wbg_set_wasmfqdomain_log_size_of_group(this.ptr, arg0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
/**
*/
export class WasmFqGate {

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
    * @returns {number}
    */
    get typ() {
        const ret = wasm.__wbg_get_wasmfpgate_typ(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set typ(arg0) {
        wasm.__wbg_set_wasmfpgate_typ(this.ptr, arg0);
    }
    /**
    * @returns {WasmGateWires}
    */
    get wires() {
        const ret = wasm.__wbg_get_wasmfpgate_wires(this.ptr);
        return WasmGateWires.__wrap(ret);
    }
    /**
    * @param {WasmGateWires} arg0
    */
    set wires(arg0) {
        _assertClass(arg0, WasmGateWires);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfpgate_wires(this.ptr, ptr0);
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
/**
*/
export class WasmFqGateVector {

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
/**
*/
export class WasmFqOpeningProof {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set z1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqopeningproof_z1(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
    * @returns {Uint32Array}
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
    * @returns {WasmGPallas}
    */
    get delta() {
        const ret = wasm.wasmfpopeningproof_delta(this.ptr);
        return WasmGPallas.__wrap(ret);
    }
    /**
    * @returns {WasmGPallas}
    */
    get sg() {
        const ret = wasm.wasmfpopeningproof_sg(this.ptr);
        return WasmGPallas.__wrap(ret);
    }
    /**
    * @param {Uint32Array} lr_0
    */
    set lr_0(lr_0) {
        const ptr0 = passArray32ToWasm0(lr_0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqopeningproof_set_lr_0(this.ptr, ptr0, len0);
    }
    /**
    * @param {Uint32Array} lr_1
    */
    set lr_1(lr_1) {
        const ptr0 = passArray32ToWasm0(lr_1, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqopeningproof_set_lr_1(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmGPallas} delta
    */
    set delta(delta) {
        _assertClass(delta, WasmGPallas);
        var ptr0 = delta.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_delta(this.ptr, ptr0);
    }
    /**
    * @param {WasmGPallas} sg
    */
    set sg(sg) {
        _assertClass(sg, WasmGPallas);
        var ptr0 = sg.__destroy_into_raw();
        wasm.wasmfpopeningproof_set_sg(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFqOracles {

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
    * @returns {WasmFqRandomOracles}
    */
    get o() {
        const ret = wasm.__wbg_get_wasmfporacles_o(this.ptr);
        return WasmFqRandomOracles.__wrap(ret);
    }
    /**
    * @param {WasmFqRandomOracles} arg0
    */
    set o(arg0) {
        _assertClass(arg0, WasmFqRandomOracles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfporacles_o(this.ptr, ptr0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set p_eval0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_p_eval0(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set p_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqoracles_p_eval1(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
    * @param {Uint8Array} x
    */
    set opening_prechallenges(x) {
        const ptr0 = passArray8ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqoracles_set_opening_prechallenges(this.ptr, ptr0, len0);
    }
}
/**
*/
export class WasmFqPlonkVerificationEvals {

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
    * @returns {Uint32Array}
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
    * @param {Uint32Array} x
    */
    set sigma_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqplonkverificationevals_set_sigma_comm(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint32Array}
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
    * @param {Uint32Array} x
    */
    set coefficients_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqplonkverificationevals_set_coefficients_comm(this.ptr, ptr0, len0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get generic_comm() {
        const ret = wasm.wasmfqplonkverificationevals_generic_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set generic_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverificationevals_set_generic_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get psm_comm() {
        const ret = wasm.wasmfqplonkverificationevals_psm_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set psm_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverificationevals_set_psm_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get complete_add_comm() {
        const ret = wasm.wasmfqplonkverificationevals_complete_add_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set complete_add_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverificationevals_set_complete_add_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get mul_comm() {
        const ret = wasm.wasmfqplonkverificationevals_mul_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set mul_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverificationevals_set_mul_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get emul_comm() {
        const ret = wasm.wasmfqplonkverificationevals_emul_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set emul_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverificationevals_set_emul_comm(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get endomul_scalar_comm() {
        const ret = wasm.wasmfqplonkverificationevals_endomul_scalar_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set endomul_scalar_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverificationevals_set_endomul_scalar_comm(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFqPlonkVerifierIndex {

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
    * @returns {WasmFqDomain}
    */
    get domain() {
        const ret = wasm.__wbg_get_wasmfqplonkverifierindex_domain(this.ptr);
        return WasmFqDomain.__wrap(ret);
    }
    /**
    * @param {WasmFqDomain} arg0
    */
    set domain(arg0) {
        _assertClass(arg0, WasmFqDomain);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfqplonkverifierindex_domain(this.ptr, ptr0);
    }
    /**
    * @returns {number}
    */
    get max_poly_size() {
        const ret = wasm.__wbg_get_wasmfqplonkverifierindex_max_poly_size(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set max_poly_size(arg0) {
        wasm.__wbg_set_wasmfqplonkverifierindex_max_poly_size(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get public_() {
        const ret = wasm.__wbg_get_wasmfqplonkverifierindex_public_(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set public_(arg0) {
        wasm.__wbg_set_wasmfqplonkverifierindex_public_(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get prev_challenges() {
        const ret = wasm.__wbg_get_wasmfqplonkverifierindex_prev_challenges(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set prev_challenges(arg0) {
        wasm.__wbg_set_wasmfqplonkverifierindex_prev_challenges(this.ptr, arg0);
    }
    /**
    * @returns {WasmFqShifts}
    */
    get shifts() {
        const ret = wasm.__wbg_get_wasmfqplonkverifierindex_shifts(this.ptr);
        return WasmFqShifts.__wrap(ret);
    }
    /**
    * @param {WasmFqShifts} arg0
    */
    set shifts(arg0) {
        _assertClass(arg0, WasmFqShifts);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmfqplonkverifierindex_shifts(this.ptr, ptr0);
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
        const ret = wasm.wasmfqplonkverifierindex_new(domain.ptr, max_poly_size, public_, prev_challenges, srs.ptr, evals.ptr, shifts.ptr);
        return WasmFqPlonkVerifierIndex.__wrap(ret);
    }
    /**
    * @returns {WasmFqSrs}
    */
    get srs() {
        const ret = wasm.wasmfqplonkverifierindex_srs(this.ptr);
        return WasmFqSrs.__wrap(ret);
    }
    /**
    * @param {WasmFqSrs} x
    */
    set srs(x) {
        _assertClass(x, WasmFqSrs);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverifierindex_set_srs(this.ptr, ptr0);
    }
    /**
    * @returns {WasmFqPlonkVerificationEvals}
    */
    get evals() {
        const ret = wasm.wasmfqplonkverifierindex_evals(this.ptr);
        return WasmFqPlonkVerificationEvals.__wrap(ret);
    }
    /**
    * @param {WasmFqPlonkVerificationEvals} x
    */
    set evals(x) {
        _assertClass(x, WasmFqPlonkVerificationEvals);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfqplonkverifierindex_set_evals(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFqPolyComm {

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
    * @param {Uint32Array} x
    */
    set unshifted(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqpolycomm_set_unshifted(this.ptr, ptr0, len0);
    }
    /**
    * @returns {WasmGPallas | undefined}
    */
    get shifted() {
        const ret = wasm.__wbg_get_wasmfppolycomm_shifted(this.ptr);
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
        wasm.__wbg_set_wasmfppolycomm_shifted(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFqProverCommitments {

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
    * @returns {WasmFqPolyComm}
    */
    get z_comm() {
        const ret = wasm.wasmfpplonkverificationevals_generic_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @returns {WasmFqPolyComm}
    */
    get t_comm() {
        const ret = wasm.wasmfpplonkverificationevals_psm_comm(this.ptr);
        return WasmFqPolyComm.__wrap(ret);
    }
    /**
    * @param {Uint32Array} x
    */
    set w_comm(x) {
        const ptr0 = passArray32ToWasm0(x, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqprovercommitments_set_w_comm(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set z_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_generic_comm(this.ptr, ptr0);
    }
    /**
    * @param {WasmFqPolyComm} x
    */
    set t_comm(x) {
        _assertClass(x, WasmFqPolyComm);
        var ptr0 = x.__destroy_into_raw();
        wasm.wasmfpplonkverificationevals_set_psm_comm(this.ptr, ptr0);
    }
}
/**
*/
export class WasmFqProverProof {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set ft_eval1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqproverproof_ft_eval1(this.ptr, ptr0, len0);
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
        const ret = wasm.wasmfqproverproof_commitments(this.ptr);
        return WasmFqProverCommitments.__wrap(ret);
    }
    /**
    * @returns {WasmFqOpeningProof}
    */
    get proof() {
        const ret = wasm.wasmfpproverproof_proof(this.ptr);
        return WasmFqOpeningProof.__wrap(ret);
    }
    /**
    * @returns {any}
    */
    get evals() {
        const ret = wasm.wasmfqproverproof_evals(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {Uint8Array}
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
    * @returns {WasmVecVecFq}
    */
    get prev_challenges_scalars() {
        const ret = wasm.wasmfqproverproof_prev_challenges_scalars(this.ptr);
        return WasmVecVecFq.__wrap(ret);
    }
    /**
    * @returns {Uint32Array}
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
    * @param {WasmFqProverCommitments} commitments
    */
    set commitments(commitments) {
        _assertClass(commitments, WasmFqProverCommitments);
        var ptr0 = commitments.__destroy_into_raw();
        wasm.wasmfpproverproof_set_commitments(this.ptr, ptr0);
    }
    /**
    * @param {WasmFqOpeningProof} proof
    */
    set proof(proof) {
        _assertClass(proof, WasmFqOpeningProof);
        var ptr0 = proof.__destroy_into_raw();
        wasm.wasmfpproverproof_set_proof(this.ptr, ptr0);
    }
    /**
    * @param {any} evals
    */
    set evals(evals) {
        wasm.wasmfqproverproof_set_evals(this.ptr, addHeapObject(evals));
    }
    /**
    * @param {Uint8Array} public_
    */
    set public_(public_) {
        const ptr0 = passArray8ToWasm0(public_, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.wasmfqproverproof_set_public_(this.ptr, ptr0, len0);
    }
    /**
    * @param {WasmVecVecFq} prev_challenges_scalars
    */
    set prev_challenges_scalars(prev_challenges_scalars) {
        _assertClass(prev_challenges_scalars, WasmVecVecFq);
        var ptr0 = prev_challenges_scalars.__destroy_into_raw();
        wasm.wasmfpproverproof_set_prev_challenges_scalars(this.ptr, ptr0);
    }
    /**
    * @param {Uint32Array} prev_challenges_comms
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
/**
*/
export class WasmFqRandomOracles {

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
    * @returns {Uint8Array | undefined}
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
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner_chal(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_joint_combiner_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array | undefined}
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
    * @param {Uint8Array | undefined} arg0
    */
    set joint_combiner(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_joint_combiner(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set beta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_beta(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set gamma(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_gamma(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set alpha_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_alpha_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set alpha(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_alpha(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set zeta(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_zeta(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set v(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_v(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set u(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_u(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set zeta_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_zeta_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set v_chal(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqrandomoracles_v_chal(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
/**
*/
export class WasmFqShifts {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s0(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqdomain_group_gen(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s1(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s1(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s2(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s2(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s3(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s3(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s4(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s4(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set s5(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmfqshifts_s5(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
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
/**
*/
export class WasmFqSrs {

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
/**
*/
export class WasmGPallas {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set x(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgpallas_x(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set y(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgpallas_y(this.ptr, ptr0, len0);
    }
    /**
    * @returns {boolean}
    */
    get infinity() {
        const ret = wasm.__wbg_get_wasmgpallas_infinity(this.ptr);
        return ret !== 0;
    }
    /**
    * @param {boolean} arg0
    */
    set infinity(arg0) {
        wasm.__wbg_set_wasmgpallas_infinity(this.ptr, arg0);
    }
}
/**
*/
export class WasmGVesta {

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
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set x(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgvesta_x(this.ptr, ptr0, len0);
    }
    /**
    * @returns {Uint8Array}
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
    * @param {Uint8Array} arg0
    */
    set y(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_wasmgvesta_y(this.ptr, ptr0, len0);
    }
    /**
    * @returns {boolean}
    */
    get infinity() {
        const ret = wasm.__wbg_get_wasmgpallas_infinity(this.ptr);
        return ret !== 0;
    }
    /**
    * @param {boolean} arg0
    */
    set infinity(arg0) {
        wasm.__wbg_set_wasmgpallas_infinity(this.ptr, arg0);
    }
}
/**
*/
export class WasmGateWires {

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
    * @returns {Wire}
    */
    get 0() {
        const ret = wasm.__wbg_get_wasmgatewires_0(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 0(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_0(this.ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 1() {
        const ret = wasm.__wbg_get_wasmgatewires_1(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 1(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_1(this.ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 2() {
        const ret = wasm.__wbg_get_wasmgatewires_2(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 2(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_2(this.ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 3() {
        const ret = wasm.__wbg_get_wasmgatewires_3(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 3(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_3(this.ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 4() {
        const ret = wasm.__wbg_get_wasmgatewires_4(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 4(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_4(this.ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 5() {
        const ret = wasm.__wbg_get_wasmgatewires_5(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 5(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_wasmgatewires_5(this.ptr, ptr0);
    }
    /**
    * @returns {Wire}
    */
    get 6() {
        const ret = wasm.__wbg_get_wasmgatewires_6(this.ptr);
        return Wire.__wrap(ret);
    }
    /**
    * @param {Wire} arg0
    */
    set 6(arg0) {
        _assertClass(arg0, Wire);
        var ptr0 = arg0.__destroy_into_raw();
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
/**
*/
export class WasmPallasGProjective {

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
/**
* Boxed so that we don't store large proving indexes in the OCaml heap.
*/
export class WasmPastaFpPlonkIndex {

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
/**
* Boxed so that we don't store large proving indexes in the OCaml heap.
*/
export class WasmPastaFqPlonkIndex {

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
/**
*/
export class WasmVecVecFp {

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
/**
*/
export class WasmVecVecFpPolyComm {

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
/**
*/
export class WasmVecVecFq {

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
        const ret = wasm.wasmvecvecfp_create(n);
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
/**
*/
export class WasmVecVecFqPolyComm {

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
        const ret = wasm.wasmvecvecfp_create(n);
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
/**
*/
export class WasmVestaGProjective {

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
/**
* Wire documents the other cell that is wired to this one.
* If the cell represents an internal wire, an input to the circuit,
* or a final output of the circuit, the cell references itself.
*/
export class Wire {

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
    * @returns {number}
    */
    get row() {
        const ret = wasm.__wbg_get_wire_row(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set row(arg0) {
        wasm.__wbg_set_wire_row(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get col() {
        const ret = wasm.__wbg_get_wire_col(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
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

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function getImports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_startWorkers_f430e3766320935f = function(arg0, arg1, arg2) {
        const ret = startWorkers(takeObject(arg0), takeObject(arg1), PoolBuilder.__wrap(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_terminateWorkers_bf82de78d64704cb = function() {
        const ret = terminateWorkers();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_alert_ceb64c1bad1f3790 = function(arg0, arg1) {
        alert(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_log_bb81d0229855b402 = function(arg0, arg1) {
        console.log(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_new_abda76e883ba8a5f = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_658279fe44541cf6 = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_f851667af71bcfc6 = function(arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg_randomFillSync_6894564c2c334c42 = function() { return handleError(function (arg0, arg1, arg2) {
        getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_805f1c3d65988a5a = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_crypto_e1d53a1d73fb10b8 = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_process_038c26bf42b093f8 = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_ab37218d2f0b24a8 = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_080f4b19d15bc1fe = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbg_msCrypto_6e7d3e1f92610cbb = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_require_78a3dcfbdba9cbce = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbg_get_27fe3dac1c4d0224 = function(arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_e498fbc24f9c1d4f = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_new_b525de17f44a8943 = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newnoargs_2b8b6bd7753c76ba = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_95d1ea488d03e4e8 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_self_e7c1f827057f6584 = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_a09ec664e14b1b81 = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_87cbb8506fecf3a9 = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_c85a9259e621f3db = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg_set_17224bc548dd1d7b = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_isArray_39d28997bf6b96b4 = function(arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_a69f02ee4c4f5065 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_call_9495de66fdbe016b = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_buffer_cf65c07de34b9a08 = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_9fb2f11355ecadf5 = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_537b7341ce90bb31 = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_17499e8aa4003ebd = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_length_27a2afe8ab42b09f = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_01cebe79ca606cca = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_newwithlength_b56c882b57805732 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_subarray_7526649b91a252a6 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_module = function() {
        const ret = init.__wbindgen_wasm_module;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };

    return imports;
}

function initMemory(imports, maybe_memory) {
    imports.wbg.memory = maybe_memory || new WebAssembly.Memory({initial:19,maximum:65536,shared:true});
}

function finalizeInit(instance, module) {
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;

    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module, maybe_memory) {
    const imports = getImports();

    initMemory(imports, maybe_memory);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return finalizeInit(instance, module);
}

async function init(input, maybe_memory) {
    if (typeof input === 'undefined') {
        input = new URL('plonk_wasm_bg.wasm', import.meta.url);
    }
    const imports = getImports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    initMemory(imports, maybe_memory);

    const { instance, module } = await load(await input, imports);

    return finalizeInit(instance, module);
}

export { initSync }
export default init;
