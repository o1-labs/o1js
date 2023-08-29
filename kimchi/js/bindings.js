/* global joo_global_object, plonk_wasm, caml_js_to_bool, caml_jsstring_of_string,
    caml_string_of_jsstring
    caml_create_bytes, caml_bytes_unsafe_set, caml_bytes_unsafe_get, caml_ml_bytes_length,
    UInt64, caml_int64_of_int32
*/

// Provides: tsBindings
var tsBindings = globalThis.__snarkyTsBindings;

// Provides: tsRustConversion
// Requires: tsBindings, plonk_wasm
var tsRustConversion = tsBindings.rustConversion(plonk_wasm);

// Provides: getTsBindings
// Requires: tsBindings
function getTsBindings() {
    return tsBindings;
}

// Provides: caml_bytes_of_uint8array
// Requires: caml_create_bytes, caml_bytes_unsafe_set
var caml_bytes_of_uint8array = function (uint8array) {
    var length = uint8array.length;
    var ocaml_bytes = caml_create_bytes(length);
    for (var i = 0; i < length; i++) {
        // No need to convert here: OCaml Char.t is just an int under the hood.
        caml_bytes_unsafe_set(ocaml_bytes, i, uint8array[i]);
    }
    return ocaml_bytes;
};

// Provides: caml_bytes_to_uint8array
// Requires: caml_ml_bytes_length, caml_bytes_unsafe_get
var caml_bytes_to_uint8array = function (ocaml_bytes) {
    var length = caml_ml_bytes_length(ocaml_bytes);
    var bytes = new joo_global_object.Uint8Array(length);
    for (var i = 0; i < length; i++) {
        // No need to convert here: OCaml Char.t is just an int under the hood.
        bytes[i] = caml_bytes_unsafe_get(ocaml_bytes, i);
    }
    return bytes;
};

// Provides: caml_bigint_256_of_numeral
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_bigint_256_of_numeral = function (s, len, base) {
    return plonk_wasm.caml_bigint_256_of_numeral(caml_jsstring_of_string(s), len, base);
};

// Provides: caml_bigint_256_of_decimal_string
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_bigint_256_of_decimal_string = function (s) {
    return plonk_wasm.caml_bigint_256_of_decimal_string(caml_jsstring_of_string(s));
};

// Provides: caml_bigint_256_num_limbs
// Requires: plonk_wasm
var caml_bigint_256_num_limbs = plonk_wasm.caml_bigint_256_num_limbs

// Provides: caml_bigint_256_bytes_per_limb
// Requires: plonk_wasm
var caml_bigint_256_bytes_per_limb = plonk_wasm.caml_bigint_256_bytes_per_limb

// Provides: caml_bigint_256_div
// Requires: plonk_wasm
var caml_bigint_256_div = plonk_wasm.caml_bigint_256_div

// Provides: caml_bigint_256_compare
// Requires: plonk_wasm
var caml_bigint_256_compare = plonk_wasm.caml_bigint_256_compare

// Provides: caml_bigint_256_print
// Requires: plonk_wasm
var caml_bigint_256_print = plonk_wasm.caml_bigint_256_print

// Provides: caml_bigint_256_to_string
// Requires: plonk_wasm, caml_string_of_jsstring
var caml_bigint_256_to_string = function (x) {
    return caml_string_of_jsstring(plonk_wasm.caml_bigint_256_to_string(x));
};

// Provides: caml_bigint_256_test_bit
// Requires: plonk_wasm, caml_js_to_bool
var caml_bigint_256_test_bit = function (x, i) {
    return caml_js_to_bool(plonk_wasm.caml_bigint_256_test_bit(x, i));
};

// Provides: caml_bigint_256_to_bytes
// Requires: plonk_wasm, caml_bytes_of_uint8array
var caml_bigint_256_to_bytes = function (x) {
    return caml_bytes_of_uint8array(plonk_wasm.caml_bigint_256_to_bytes(x));
};

// Provides: caml_bigint_256_of_bytes
// Requires: plonk_wasm, caml_bytes_to_uint8array
var caml_bigint_256_of_bytes = function (ocaml_bytes) {
    return plonk_wasm.caml_bigint_256_of_bytes(caml_bytes_to_uint8array(ocaml_bytes));
};

// Provides: caml_bigint_256_deep_copy
// Requires: plonk_wasm
var caml_bigint_256_deep_copy = plonk_wasm.caml_bigint_256_deep_copy





// Provides: caml_pasta_fp_copy
var caml_pasta_fp_copy = function (x, y) {
    for (var i = 0, l = x.length; i < l; i++) {
        x[i] = y[i];
    }
};

// Provides: caml_option_of_maybe_undefined
var caml_option_of_maybe_undefined = function (x) {
    if (x === undefined) {
        return 0; // None
    } else {
        return [0, x]; // Some(x)
    }
};

// Provides: caml_option_to_maybe_undefined
var caml_option_to_maybe_undefined = function (x) {
    if (x === 0) { // None
        return undefined;
    } else {
        return x[1];
    }
};

// Provides: caml_pasta_fp_size_in_bits
// Requires: plonk_wasm
var caml_pasta_fp_size_in_bits = plonk_wasm.caml_pasta_fp_size_in_bits

// Provides: caml_pasta_fp_size
// Requires: plonk_wasm
var caml_pasta_fp_size = plonk_wasm.caml_pasta_fp_size

// Provides: caml_pasta_fp_add
// Requires: plonk_wasm
var caml_pasta_fp_add = plonk_wasm.caml_pasta_fp_add

// Provides: caml_pasta_fp_sub
// Requires: plonk_wasm
var caml_pasta_fp_sub = plonk_wasm.caml_pasta_fp_sub

// Provides: caml_pasta_fp_negate
// Requires: plonk_wasm
var caml_pasta_fp_negate = plonk_wasm.caml_pasta_fp_negate

// Provides: caml_pasta_fp_mul
// Requires: plonk_wasm
var caml_pasta_fp_mul = plonk_wasm.caml_pasta_fp_mul

// Provides: caml_pasta_fp_div
// Requires: plonk_wasm
var caml_pasta_fp_div = plonk_wasm.caml_pasta_fp_div

// Provides: caml_pasta_fp_inv
// Requires: plonk_wasm, caml_option_of_maybe_undefined
var caml_pasta_fp_inv = function (x) {
    return caml_option_of_maybe_undefined(plonk_wasm.caml_pasta_fp_inv(x));
};

// Provides: caml_pasta_fp_square
// Requires: plonk_wasm
var caml_pasta_fp_square = plonk_wasm.caml_pasta_fp_square

// Provides: caml_pasta_fp_is_square
// Requires: plonk_wasm, caml_js_to_bool
var caml_pasta_fp_is_square = function (x) {
    return caml_js_to_bool(plonk_wasm.caml_pasta_fp_is_square(x));
};

// Provides: caml_pasta_fp_sqrt
// Requires: plonk_wasm, caml_option_of_maybe_undefined
var caml_pasta_fp_sqrt = function (x) {
    return caml_option_of_maybe_undefined(plonk_wasm.caml_pasta_fp_sqrt(x));
};

// Provides: caml_pasta_fp_of_int
// Requires: plonk_wasm
var caml_pasta_fp_of_int = plonk_wasm.caml_pasta_fp_of_int

// Provides: caml_pasta_fp_to_string
// Requires: plonk_wasm, caml_string_of_jsstring
var caml_pasta_fp_to_string = function (x) {
    return caml_string_of_jsstring(plonk_wasm.caml_pasta_fp_to_string(x));
};

// Provides: caml_pasta_fp_of_string
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_pasta_fp_of_string = function (x) {
    return plonk_wasm.caml_pasta_fp_of_string(caml_jsstring_of_string(x));
};

// Provides: caml_pasta_fp_print
// Requires: plonk_wasm
var caml_pasta_fp_print = plonk_wasm.caml_pasta_fp_print

// Provides: caml_pasta_fp_mut_add
// Requires: caml_pasta_fp_copy, caml_pasta_fp_add
var caml_pasta_fp_mut_add = function (x, y) {
    caml_pasta_fp_copy(x, caml_pasta_fp_add(x, y));
};

// Provides: caml_pasta_fp_mut_sub
// Requires: caml_pasta_fp_copy, caml_pasta_fp_sub
var caml_pasta_fp_mut_sub = function (x, y) {
    caml_pasta_fp_copy(x, caml_pasta_fp_sub(x, y));
};

// Provides: caml_pasta_fp_mut_mul
// Requires: caml_pasta_fp_copy, caml_pasta_fp_mul
var caml_pasta_fp_mut_mul = function (x, y) {
    caml_pasta_fp_copy(x, caml_pasta_fp_mul(x, y));
};

// Provides: caml_pasta_fp_mut_square
// Requires: caml_pasta_fp_copy, caml_pasta_fp_square
var caml_pasta_fp_mut_square = function (x) {
    caml_pasta_fp_copy(x, caml_pasta_fp_square(x));
};

// Provides: caml_pasta_fp_compare
// Requires: plonk_wasm
var caml_pasta_fp_compare = plonk_wasm.caml_pasta_fp_compare

// Provides: caml_pasta_fp_equal
// Requires: plonk_wasm
var caml_pasta_fp_equal = plonk_wasm.caml_pasta_fp_equal

// Provides: caml_pasta_fp_random
// Requires: plonk_wasm
var caml_pasta_fp_random = plonk_wasm.caml_pasta_fp_random

// Provides: caml_pasta_fp_rng
// Requires: plonk_wasm
var caml_pasta_fp_rng = plonk_wasm.caml_pasta_fp_rng

// Provides: caml_pasta_fp_to_bigint
// Requires: plonk_wasm
var caml_pasta_fp_to_bigint = plonk_wasm.caml_pasta_fp_to_bigint

// Provides: caml_pasta_fp_of_bigint
// Requires: plonk_wasm
var caml_pasta_fp_of_bigint = plonk_wasm.caml_pasta_fp_of_bigint

// Provides: caml_pasta_fp_two_adic_root_of_unity
// Requires: plonk_wasm
var caml_pasta_fp_two_adic_root_of_unity = plonk_wasm.caml_pasta_fp_two_adic_root_of_unity

// Provides: caml_pasta_fp_domain_generator
// Requires: plonk_wasm
var caml_pasta_fp_domain_generator = plonk_wasm.caml_pasta_fp_domain_generator

// Provides: caml_pasta_fp_to_bytes
// Requires: plonk_wasm, caml_bytes_of_uint8array
var caml_pasta_fp_to_bytes = function (x) {
    var res = plonk_wasm.caml_pasta_fp_to_bytes(x);
    return caml_bytes_of_uint8array(plonk_wasm.caml_pasta_fp_to_bytes(x));
};

// Provides: caml_pasta_fp_of_bytes
// Requires: plonk_wasm, caml_bytes_to_uint8array
var caml_pasta_fp_of_bytes = function (ocaml_bytes) {
    return plonk_wasm.caml_pasta_fp_of_bytes(caml_bytes_to_uint8array(ocaml_bytes));
};

// Provides: caml_pasta_fp_deep_copy
// Requires: plonk_wasm
var caml_pasta_fp_deep_copy = plonk_wasm.caml_pasta_fp_deep_copy





// Provides: caml_pasta_fq_copy
var caml_pasta_fq_copy = function (x, y) {
    for (var i = 0, l = x.length; i < l; i++) {
        x[i] = y[i];
    }
};

// Provides: caml_pasta_fq_size_in_bits
// Requires: plonk_wasm
var caml_pasta_fq_size_in_bits = plonk_wasm.caml_pasta_fq_size_in_bits

// Provides: caml_pasta_fq_size
// Requires: plonk_wasm
var caml_pasta_fq_size = plonk_wasm.caml_pasta_fq_size

// Provides: caml_pasta_fq_add
// Requires: plonk_wasm
var caml_pasta_fq_add = plonk_wasm.caml_pasta_fq_add

// Provides: caml_pasta_fq_sub
// Requires: plonk_wasm
var caml_pasta_fq_sub = plonk_wasm.caml_pasta_fq_sub

// Provides: caml_pasta_fq_negate
// Requires: plonk_wasm
var caml_pasta_fq_negate = plonk_wasm.caml_pasta_fq_negate

// Provides: caml_pasta_fq_mul
// Requires: plonk_wasm
var caml_pasta_fq_mul = plonk_wasm.caml_pasta_fq_mul

// Provides: caml_pasta_fq_div
// Requires: plonk_wasm
var caml_pasta_fq_div = plonk_wasm.caml_pasta_fq_div

// Provides: caml_pasta_fq_inv
// Requires: plonk_wasm, caml_option_of_maybe_undefined
var caml_pasta_fq_inv = function (x) {
    return caml_option_of_maybe_undefined(plonk_wasm.caml_pasta_fq_inv(x));
};

// Provides: caml_pasta_fq_square
// Requires: plonk_wasm
var caml_pasta_fq_square = plonk_wasm.caml_pasta_fq_square

// Provides: caml_pasta_fq_is_square
// Requires: plonk_wasm, caml_js_to_bool
var caml_pasta_fq_is_square = function (x) {
    return caml_js_to_bool(plonk_wasm.caml_pasta_fq_is_square(x));
};

// Provides: caml_pasta_fq_sqrt
// Requires: plonk_wasm, caml_option_of_maybe_undefined
var caml_pasta_fq_sqrt = function (x) {
    return caml_option_of_maybe_undefined(plonk_wasm.caml_pasta_fq_sqrt(x));
};

// Provides: caml_pasta_fq_of_int
// Requires: plonk_wasm
var caml_pasta_fq_of_int = plonk_wasm.caml_pasta_fq_of_int

// Provides: caml_pasta_fq_to_string
// Requires: plonk_wasm, caml_string_of_jsstring
var caml_pasta_fq_to_string = function (x) {
    return caml_string_of_jsstring(plonk_wasm.caml_pasta_fq_to_string(x));
};

// Provides: caml_pasta_fq_of_string
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_pasta_fq_of_string = function (x) {
    return plonk_wasm.caml_pasta_fq_of_string(caml_jsstring_of_string(x));
};

// Provides: caml_pasta_fq_print
// Requires: plonk_wasm
var caml_pasta_fq_print = plonk_wasm.caml_pasta_fq_print

// Provides: caml_pasta_fq_mut_add
// Requires: caml_pasta_fq_copy, caml_pasta_fq_add
var caml_pasta_fq_mut_add = function (x, y) {
    caml_pasta_fq_copy(x, caml_pasta_fq_add(x, y));
};

// Provides: caml_pasta_fq_mut_sub
// Requires: caml_pasta_fq_copy, caml_pasta_fq_sub
var caml_pasta_fq_mut_sub = function (x, y) {
    caml_pasta_fq_copy(x, caml_pasta_fq_sub(x, y));
};

// Provides: caml_pasta_fq_mut_mul
// Requires: caml_pasta_fq_copy, caml_pasta_fq_mul
var caml_pasta_fq_mut_mul = function (x, y) {
    caml_pasta_fq_copy(x, caml_pasta_fq_mul(x, y));
};

// Provides: caml_pasta_fq_mut_square
// Requires: caml_pasta_fq_copy, caml_pasta_fq_square
var caml_pasta_fq_mut_square = function (x) {
    caml_pasta_fq_copy(x, caml_pasta_fq_square(x));
};

// Provides: caml_pasta_fq_compare
// Requires: plonk_wasm
var caml_pasta_fq_compare = plonk_wasm.caml_pasta_fq_compare

// Provides: caml_pasta_fq_equal
// Requires: plonk_wasm
var caml_pasta_fq_equal = plonk_wasm.caml_pasta_fq_equal

// Provides: caml_pasta_fq_random
// Requires: plonk_wasm
var caml_pasta_fq_random = plonk_wasm.caml_pasta_fq_random

// Provides: caml_pasta_fq_rng
// Requires: plonk_wasm
var caml_pasta_fq_rng = plonk_wasm.caml_pasta_fq_rng

// Provides: caml_pasta_fq_to_bigint
// Requires: plonk_wasm
var caml_pasta_fq_to_bigint = plonk_wasm.caml_pasta_fq_to_bigint

// Provides: caml_pasta_fq_of_bigint
// Requires: plonk_wasm
var caml_pasta_fq_of_bigint = plonk_wasm.caml_pasta_fq_of_bigint

// Provides: caml_pasta_fq_two_adic_root_of_unity
// Requires: plonk_wasm
var caml_pasta_fq_two_adic_root_of_unity = plonk_wasm.caml_pasta_fq_two_adic_root_of_unity

// Provides: caml_pasta_fq_domain_generator
// Requires: plonk_wasm
var caml_pasta_fq_domain_generator = plonk_wasm.caml_pasta_fq_domain_generator

// Provides: caml_pasta_fq_to_bytes
// Requires: plonk_wasm, caml_bytes_of_uint8array
var caml_pasta_fq_to_bytes = function (x) {
    var res = plonk_wasm.caml_pasta_fq_to_bytes(x);
    return caml_bytes_of_uint8array(plonk_wasm.caml_pasta_fq_to_bytes(x));
};

// Provides: caml_pasta_fq_of_bytes
// Requires: plonk_wasm, caml_bytes_to_uint8array
var caml_pasta_fq_of_bytes = function (ocaml_bytes) {
    return plonk_wasm.caml_pasta_fq_of_bytes(caml_bytes_to_uint8array(ocaml_bytes));
};

// Provides: caml_pasta_fq_deep_copy
// Requires: plonk_wasm
var caml_pasta_fq_deep_copy = plonk_wasm.caml_pasta_fq_deep_copy







// Provides: caml_fp_vector_create
var caml_fp_vector_create = function () {
    return [0]; // OCaml tag for arrays, so that we can use the same utility fns on both
};

// Provides: caml_fp_vector_length
var caml_fp_vector_length = function (v) {
    return v.length - 1;
};

// Provides: caml_fp_vector_emplace_back
var caml_fp_vector_emplace_back = function (v, x) {
    v.push(x);
}

// Provides: caml_fp_vector_get
var caml_fp_vector_get = function (v, i) {
    var value = v[i + 1];
    if (value === undefined) {
      throw Error('caml_fp_vector_get: Index out of bounds, got ' + i + '/' + (v.length - 1));
    }
    return new joo_global_object.Uint8Array(value);
}





// Provides: caml_fq_vector_create
var caml_fq_vector_create = function () {
    return [0]; // OCaml tag for arrays, so that we can use the same utility fns on both
};

// Provides: caml_fq_vector_length
var caml_fq_vector_length = function (v) {
    return v.length - 1;
};

// Provides: caml_fq_vector_emplace_back
var caml_fq_vector_emplace_back = function (v, x) {
    v.push(x);
}

// Provides: caml_fq_vector_get
var caml_fq_vector_get = function (v, i) {
    var value = v[i + 1];
    if (value === undefined) {
      throw Error('caml_fq_vector_get: Index out of bounds, got ' + i + '/' + (v.length - 1));
    }
    return new joo_global_object.Uint8Array(value);
}





// Provides: free_finalization_registry
var free_finalization_registry =
    new joo_global_object.FinalizationRegistry(function (instance_representative) {
        instance_representative.free();
    });

// Provides: free_on_finalize
// Requires: free_finalization_registry
var free_on_finalize = function (x) {
    // This is an unfortunate hack: we're creating a second instance of the
    // class to be able to call free on it. We can't pass the value itself,
    // since the registry holds a strong reference to the representative value.
    //
    // However, the class is only really a wrapper around a pointer, with a
    // reference to the class' prototype as its __prototype__.
    //
    // It might seem cleaner to call the destructor here on the pointer
    // directly, but unfortunately the destructor name is some mangled internal
    // string generated by wasm_bindgen. For now, this is the best,
    // least-brittle way to free once the original class instance gets collected.
    var instance_representative = x.constructor.__wrap(x.ptr)
    free_finalization_registry.register(x, instance_representative, x);
    return x;
};





// Provides: rust_affine_to_caml_affine
var rust_affine_to_caml_affine = function (pt) {
    var infinity = pt.infinity;
    if (infinity) {
        pt.free();
        return 0;
    } else {
        var x = pt.x;
        var y = pt.y;
        pt.free();
        return [0, [0, x, y]];
    }
};

// Provides: rust_affine_of_caml_affine
var rust_affine_of_caml_affine = function (pt, klass) {
    var res = new klass();
    if (pt === 0) {
        res.infinity = true;
    } else {
        // Layout is [0, [0, x, y]]
        // First 0 is the tag (it's the 0th constructor that takes arguments)
        // Second 0 is the block marker for the anonymous tuple arguments
        res.x = pt[1][1];
        res.y = pt[1][2];
    }
    return res;
};





// Provides: caml_pallas_one
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_one = function () {
    var res = plonk_wasm.caml_pallas_one();
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_add
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_add = function (x, y) {
    var res = plonk_wasm.caml_pallas_add(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_sub
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_sub = function (x, y) {
    var res = plonk_wasm.caml_pallas_sub(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_negate
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_negate = function (x) {
    var res = plonk_wasm.caml_pallas_negate(x);
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_double
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_double = function (x) {
    var res = plonk_wasm.caml_pallas_double(x);
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_scale
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_scale = function (x, y) {
    var res = plonk_wasm.caml_pallas_scale(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_random
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_random = function () {
    var res = plonk_wasm.caml_pallas_random();
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_rng
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_rng = function (i) {
    var res = plonk_wasm.caml_pallas_rng(i);
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_to_affine
// Requires: plonk_wasm, rust_affine_to_caml_affine
var caml_pallas_to_affine = function (pt) {
    var res = plonk_wasm.caml_pallas_to_affine(pt);
    return rust_affine_to_caml_affine(res);
};

// Provides: caml_pallas_of_affine
// Requires: plonk_wasm, rust_affine_of_caml_affine, free_on_finalize
var caml_pallas_of_affine = function (pt) {
    var res = plonk_wasm.caml_pallas_of_affine(rust_affine_of_caml_affine(pt, plonk_wasm.caml_pallas_affine_one));
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_of_affine_coordinates
// Requires: plonk_wasm, free_on_finalize
var caml_pallas_of_affine_coordinates = function (x, y) {
    var res = plonk_wasm.caml_pallas_of_affine_coordinates(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_pallas_endo_base
// Requires: plonk_wasm
var caml_pallas_endo_base = plonk_wasm.caml_pallas_endo_base;

// Provides: caml_pallas_endo_scalar
// Requires: plonk_wasm
var caml_pallas_endo_scalar = plonk_wasm.caml_pallas_endo_scalar;

// Provides: caml_pallas_affine_deep_copy
// Requires: plonk_wasm, rust_affine_of_caml_affine, rust_affine_to_caml_affine
var caml_pallas_affine_deep_copy = function (pt) {
    return rust_affine_to_caml_affine(plonk_wasm.caml_pallas_affine_deep_copy(rust_affine_of_caml_affine(pt, plonk_wasm.caml_pallas_affine_one)));
};





// Provides: caml_vesta_one
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_one = function () {
    var res = plonk_wasm.caml_vesta_one();
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_add
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_add = function (x, y) {
    var res = plonk_wasm.caml_vesta_add(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_sub
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_sub = function (x, y) {
    var res = plonk_wasm.caml_vesta_sub(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_negate
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_negate = function (x) {
    var res = plonk_wasm.caml_vesta_negate(x);
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_double
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_double = function (x) {
    var res = plonk_wasm.caml_vesta_double(x);
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_scale
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_scale = function (x, y) {
    var res = plonk_wasm.caml_vesta_scale(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_random
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_random = function () {
    var res = plonk_wasm.caml_vesta_random();
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_rng
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_rng = function (i) {
    var res = plonk_wasm.caml_vesta_rng(i);
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_to_affine
// Requires: plonk_wasm, rust_affine_to_caml_affine
var caml_vesta_to_affine = function (pt) {
    var res = plonk_wasm.caml_vesta_to_affine(pt);
    return rust_affine_to_caml_affine(res);
};

// Provides: caml_vesta_of_affine
// Requires: plonk_wasm, rust_affine_of_caml_affine, free_on_finalize
var caml_vesta_of_affine = function (pt) {
    var res = plonk_wasm.caml_vesta_of_affine(rust_affine_of_caml_affine(pt, plonk_wasm.caml_vesta_affine_one));
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_of_affine_coordinates
// Requires: plonk_wasm, free_on_finalize
var caml_vesta_of_affine_coordinates = function (x, y) {
    var res = plonk_wasm.caml_vesta_of_affine_coordinates(x, y);
    free_on_finalize(res);
    return res;
};

// Provides: caml_vesta_endo_base
// Requires: plonk_wasm
var caml_vesta_endo_base = plonk_wasm.caml_vesta_endo_base;

// Provides: caml_vesta_endo_scalar
// Requires: plonk_wasm
var caml_vesta_endo_scalar = plonk_wasm.caml_vesta_endo_scalar;

// Provides: caml_vesta_affine_deep_copy
// Requires: plonk_wasm, rust_affine_of_caml_affine, rust_affine_to_caml_affine
var caml_vesta_affine_deep_copy = function (pt) {
    return rust_affine_to_caml_affine(plonk_wasm.caml_vesta_affine_deep_copy(rust_affine_of_caml_affine(pt, plonk_wasm.caml_vesta_affine_one)));
};





// srs

// Provides: caml_fp_srs_create
// Requires: plonk_wasm, free_on_finalize
var caml_fp_srs_create = function (i) {
    return free_on_finalize(plonk_wasm.caml_fp_srs_create(i));
};

// Provides: caml_fp_srs_write
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_fp_srs_write = function (append, t, path) {
    if (append === 0) {
        append = undefined;
    } else {
        append = append[1];
    }
    return plonk_wasm.caml_fp_srs_write(append, t, caml_jsstring_of_string(path));
};

// Provides: caml_fp_srs_read
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_fp_srs_read = function (offset, path) {
    if (offset === 0) {
        offset = undefined;
    } else {
        offset = offset[1];
    }
    var res = plonk_wasm.caml_fp_srs_read(offset, caml_jsstring_of_string(path));
    if (res) {
        return [0, res]; // Some(res)
    } else {
        return 0; // None
    }
};

// Provides: caml_fp_srs_lagrange_commitment
// Requires: plonk_wasm, tsRustConversion
var caml_fp_srs_lagrange_commitment = function (t, domain_size, i) {
    var res = plonk_wasm.caml_fp_srs_lagrange_commitment(t, domain_size, i);
    return tsRustConversion.fp.polyCommFromRust(res);
};

// Provides: caml_fp_srs_commit_evaluations
// Requires: plonk_wasm, tsRustConversion
var caml_fp_srs_commit_evaluations = function (t, domain_size, fps) {
    var res = plonk_wasm.caml_fp_srs_commit_evaluations(t, domain_size, tsRustConversion.fp.vectorToRust(fps));
    return tsRustConversion.fp.polyCommFromRust(res);
};

// Provides: caml_fp_srs_b_poly_commitment
// Requires: plonk_wasm, tsRustConversion
var caml_fp_srs_b_poly_commitment = function (srs, chals) {
    var res = plonk_wasm.caml_fp_srs_b_poly_commitment(srs, tsRustConversion.fieldsToRustFlat(chals));
    return tsRustConversion.fp.polyCommFromRust(res);
};

// Provides: caml_fp_srs_batch_accumulator_check
// Requires: plonk_wasm, tsRustConversion
var caml_fp_srs_batch_accumulator_check = function (srs, comms, chals) {
    var rust_comms = tsRustConversion.fp.pointsToRust(comms);
    var rust_chals = tsRustConversion.fp.vectorToRust(chals);
    var ok = plonk_wasm.caml_fp_srs_batch_accumulator_check(srs, rust_comms, rust_chals);
    return ok;
};

// Provides: caml_fp_srs_batch_accumulator_generate
// Requires: plonk_wasm, tsRustConversion
var caml_fp_srs_batch_accumulator_generate = function (srs, n_comms, chals) {
    var rust_chals = tsRustConversion.fp.vectorToRust(chals);
    var rust_comms = plonk_wasm.caml_fp_srs_batch_accumulator_generate(srs, n_comms, rust_chals);
    return tsRustConversion.fp.pointsFromRust(rust_comms);
};

// Provides: caml_fp_srs_h
// Requires: plonk_wasm, tsRustConversion
var caml_fp_srs_h = function (t) {
    return tsRustConversion.fp.pointFromRust(plonk_wasm.caml_fp_srs_h(t));
};





// Provides: caml_fq_srs_create
// Requires: plonk_wasm, free_on_finalize
var caml_fq_srs_create = function (i) {
    return free_on_finalize(plonk_wasm.caml_fq_srs_create(i));
};

// Provides: caml_fq_srs_write
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_fq_srs_write = function (append, t, path) {
    if (append === 0) {
        append = undefined;
    } else {
        append = append[1];
    }
    return plonk_wasm.caml_fq_srs_write(append, t, caml_jsstring_of_string(path));
};

// Provides: caml_fq_srs_read
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_fq_srs_read = function (offset, path) {
    if (offset === 0) {
        offset = undefined;
    } else {
        offset = offset[1];
    }
    var res = plonk_wasm.caml_fq_srs_read(offset, caml_jsstring_of_string(path));
    if (res) {
        return [0, res]; // Some(res)
    } else {
        return 0; // None
    }
};

// Provides: caml_fq_srs_lagrange_commitment
// Requires: plonk_wasm, tsRustConversion
var caml_fq_srs_lagrange_commitment = function (t, domain_size, i) {
    var res = plonk_wasm.caml_fq_srs_lagrange_commitment(t, domain_size, i);
    return tsRustConversion.fq.polyCommFromRust(res);
};

// Provides: caml_fq_srs_commit_evaluations
// Requires: plonk_wasm, tsRustConversion
var caml_fq_srs_commit_evaluations = function (t, domain_size, fqs) {
    var res = plonk_wasm.caml_fq_srs_commit_evaluations(t, domain_size, tsRustConversion.fq.vectorToRust(fqs));
    return tsRustConversion.fq.polyCommFromRust(res);
};

// Provides: caml_fq_srs_b_poly_commitment
// Requires: plonk_wasm, tsRustConversion
var caml_fq_srs_b_poly_commitment = function (srs, chals) {
    var res = plonk_wasm.caml_fq_srs_b_poly_commitment(srs, tsRustConversion.fieldsToRustFlat(chals));
    return tsRustConversion.fq.polyCommFromRust(res);
};

// Provides: caml_fq_srs_batch_accumulator_check
// Requires: plonk_wasm, tsRustConversion
var caml_fq_srs_batch_accumulator_check = function (srs, comms, chals) {
    var rust_comms = tsRustConversion.fq.pointsToRust(comms);
    var rust_chals = tsRustConversion.fq.vectorToRust(chals);
    var ok = plonk_wasm.caml_fq_srs_batch_accumulator_check(srs, rust_comms, rust_chals);
    return ok;
};

// Provides: caml_fq_srs_batch_accumulator_generate
// Requires: plonk_wasm, tsRustConversion
var caml_fq_srs_batch_accumulator_generate = function (srs, comms, chals) {
    var rust_chals = tsRustConversion.fq.vectorToRust(chals);
    var rust_comms = plonk_wasm.caml_fq_srs_batch_accumulator_generate(srs, comms, rust_chals);
    return tsRustConversion.fq.pointsFromRust(rust_comms);
};

// Provides: caml_fq_srs_h
// Requires: plonk_wasm, tsRustConversion
var caml_fq_srs_h = function (t) {
    return tsRustConversion.fq.pointFromRust(plonk_wasm.caml_fq_srs_h(t));
};

// Provides: caml_fq_srs_add_lagrange_basis
// Requires: plonk_wasm
function caml_fq_srs_add_lagrange_basis(srs, log2_size) {
    return plonk_wasm.caml_fq_srs_add_lagrange_basis(srs, log2_size);
}



// gate vector

// Provides: caml_pasta_fp_plonk_gate_vector_create
// Requires: plonk_wasm, free_on_finalize
var caml_pasta_fp_plonk_gate_vector_create = function () {
    return free_on_finalize(plonk_wasm.caml_pasta_fp_plonk_gate_vector_create());
};

// Provides: caml_pasta_fp_plonk_gate_vector_add
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_gate_vector_add = function (v, x) {
    return plonk_wasm.caml_pasta_fp_plonk_gate_vector_add(v, tsRustConversion.fp.gateToRust(x));
};

// Provides: caml_pasta_fp_plonk_gate_vector_get
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_gate_vector_get = function (v, i) {
    return tsRustConversion.gateFromRust(plonk_wasm.caml_pasta_fp_plonk_gate_vector_get(v, i));
};

// Provides: caml_pasta_fp_plonk_gate_vector_len
// Requires: plonk_wasm
var caml_pasta_fp_plonk_gate_vector_len = function (v) {
    return plonk_wasm.caml_pasta_fp_plonk_gate_vector_len(v);
};

// Provides: caml_pasta_fp_plonk_gate_vector_wrap
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_gate_vector_wrap = function (v, x, y) {
    return plonk_wasm.caml_pasta_fp_plonk_gate_vector_wrap(v, tsRustConversion.wireToRust(x), tsRustConversion.wireToRust(y));
};

// Provides: caml_pasta_fp_plonk_gate_vector_digest
// Requires: plonk_wasm, caml_bytes_of_uint8array
var caml_pasta_fp_plonk_gate_vector_digest = function (public_input_size, gate_vector) {
    var uint8array = plonk_wasm.caml_pasta_fp_plonk_gate_vector_digest(public_input_size, gate_vector);
    return caml_bytes_of_uint8array(uint8array);
}

// Provides: caml_pasta_fp_plonk_circuit_serialize
// Requires: plonk_wasm, caml_string_of_jsstring
var caml_pasta_fp_plonk_circuit_serialize = function (public_input_size, gate_vector) {
    return caml_string_of_jsstring(plonk_wasm.caml_pasta_fp_plonk_circuit_serialize(public_input_size, gate_vector));
}



// prover index

// Provides: caml_pasta_fq_plonk_gate_vector_create
// Requires: plonk_wasm, free_on_finalize
var caml_pasta_fq_plonk_gate_vector_create = function () {
    return free_on_finalize(plonk_wasm.caml_pasta_fq_plonk_gate_vector_create());
};

// Provides: caml_pasta_fq_plonk_gate_vector_add
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_gate_vector_add = function (v, x) {
    return plonk_wasm.caml_pasta_fq_plonk_gate_vector_add(v, tsRustConversion.fq.gateToRust(x));
};

// Provides: caml_pasta_fq_plonk_gate_vector_get
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_gate_vector_get = function (v, i) {
    return tsRustConversion.gateFromRust(plonk_wasm.caml_pasta_fq_plonk_gate_vector_get(v, i));
};

// Provides: caml_pasta_fq_plonk_gate_vector_len
// Requires: plonk_wasm
var caml_pasta_fq_plonk_gate_vector_len = function (v) {
    return plonk_wasm.caml_pasta_fq_plonk_gate_vector_len(v);
};

// Provides: caml_pasta_fq_plonk_gate_vector_wrap
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_gate_vector_wrap = function (v, x, y) {
    return plonk_wasm.caml_pasta_fq_plonk_gate_vector_wrap(v, tsRustConversion.wireToRust(x), tsRustConversion.wireToRust(y));
};

// Provides: caml_pasta_fq_plonk_gate_vector_digest
// Requires: plonk_wasm, caml_bytes_of_uint8array
var caml_pasta_fq_plonk_gate_vector_digest = function (public_input_size, gate_vector) {
    var uint8array = plonk_wasm.caml_pasta_fq_plonk_gate_vector_digest(public_input_size, gate_vector);
    return caml_bytes_of_uint8array(uint8array);
}

// Provides: caml_pasta_fq_plonk_circuit_serialize
// Requires: plonk_wasm, caml_string_of_jsstring
var caml_pasta_fq_plonk_circuit_serialize = function (public_input_size, gate_vector) {
    return caml_string_of_jsstring(plonk_wasm.caml_pasta_fq_plonk_circuit_serialize(public_input_size, gate_vector));
}


// Provides: caml_pasta_fp_plonk_index_create
// Requires: plonk_wasm, free_on_finalize
var caml_pasta_fp_plonk_index_create = function (gates, public_inputs, prev_challenges, urs) {
    var t = plonk_wasm.caml_pasta_fp_plonk_index_create(gates, public_inputs, prev_challenges, urs);
    return free_on_finalize(t);
};

// Provides: caml_pasta_fp_plonk_index_max_degree
// Requires: plonk_wasm
var caml_pasta_fp_plonk_index_max_degree = plonk_wasm.caml_pasta_fp_plonk_index_max_degree;

// Provides: caml_pasta_fp_plonk_index_public_inputs
// Requires: plonk_wasm
var caml_pasta_fp_plonk_index_public_inputs = plonk_wasm.caml_pasta_fp_plonk_index_public_inputs;

// Provides: caml_pasta_fp_plonk_index_domain_d1_size
// Requires: plonk_wasm
var caml_pasta_fp_plonk_index_domain_d1_size = plonk_wasm.caml_pasta_fp_plonk_index_domain_d1_size;

// Provides: caml_pasta_fp_plonk_index_domain_d4_size
// Requires: plonk_wasm
var caml_pasta_fp_plonk_index_domain_d4_size = plonk_wasm.caml_pasta_fp_plonk_index_domain_d4_size;

// Provides: caml_pasta_fp_plonk_index_domain_d8_size
// Requires: plonk_wasm
var caml_pasta_fp_plonk_index_domain_d8_size = plonk_wasm.caml_pasta_fp_plonk_index_domain_d8_size;

// Provides: caml_pasta_fp_plonk_index_read
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_pasta_fp_plonk_index_read = function (offset, urs, path) {
    if (offset === 0) {
        offset = undefined;
    } else {
        offset = offset[1];
    }
    return plonk_wasm.caml_pasta_fp_plonk_index_read(offset, urs, caml_jsstring_of_string(path));
};

// Provides: caml_pasta_fp_plonk_index_write
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_pasta_fp_plonk_index_write = function (append, t, path) {
    if (append === 0) {
        append = undefined;
    } else {
        append = append[1];
    }
    return plonk_wasm.caml_pasta_fp_plonk_index_write(append, t, caml_jsstring_of_string(path));
};



// Provides: caml_pasta_fq_plonk_index_create
// Requires: plonk_wasm, free_on_finalize
var caml_pasta_fq_plonk_index_create = function (gates, public_inputs, prev_challenges, urs) {
    return free_on_finalize(plonk_wasm.caml_pasta_fq_plonk_index_create(gates, public_inputs, prev_challenges, urs));
}

// Provides: caml_pasta_fq_plonk_index_max_degree
// Requires: plonk_wasm
var caml_pasta_fq_plonk_index_max_degree = plonk_wasm.caml_pasta_fq_plonk_index_max_degree;

// Provides: caml_pasta_fq_plonk_index_public_inputs
// Requires: plonk_wasm
var caml_pasta_fq_plonk_index_public_inputs = plonk_wasm.caml_pasta_fq_plonk_index_public_inputs;

// Provides: caml_pasta_fq_plonk_index_domain_d1_size
// Requires: plonk_wasm
var caml_pasta_fq_plonk_index_domain_d1_size = plonk_wasm.caml_pasta_fq_plonk_index_domain_d1_size;

// Provides: caml_pasta_fq_plonk_index_domain_d4_size
// Requires: plonk_wasm
var caml_pasta_fq_plonk_index_domain_d4_size = plonk_wasm.caml_pasta_fq_plonk_index_domain_d4_size;

// Provides: caml_pasta_fq_plonk_index_domain_d8_size
// Requires: plonk_wasm
var caml_pasta_fq_plonk_index_domain_d8_size = plonk_wasm.caml_pasta_fq_plonk_index_domain_d8_size;

// Provides: caml_pasta_fq_plonk_index_read
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_pasta_fq_plonk_index_read = function (offset, urs, path) {
    if (offset === 0) {
        offset = undefined;
    } else {
        offset = offset[1];
    }
    return plonk_wasm.caml_pasta_fq_plonk_index_read(offset, urs, caml_jsstring_of_string(path));
};

// Provides: caml_pasta_fq_plonk_index_write
// Requires: plonk_wasm, caml_jsstring_of_string
var caml_pasta_fq_plonk_index_write = function (append, t, path) {
    if (append === 0) {
        append = undefined;
    } else {
        append = append[1];
    }
    return plonk_wasm.caml_pasta_fq_plonk_index_write(append, t, caml_jsstring_of_string(path));
};



// verifier index

// Provides: caml_pasta_fp_plonk_verifier_index_create
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_verifier_index_create = function (x) {
    var vk = plonk_wasm.caml_pasta_fp_plonk_verifier_index_create(x);
    return tsRustConversion.fp.verifierIndexFromRust(vk);
};

// Provides: caml_pasta_fp_plonk_verifier_index_read
// Requires: plonk_wasm, caml_jsstring_of_string, tsRustConversion
var caml_pasta_fp_plonk_verifier_index_read = function (offset, urs, path) {
    if (offset === 0) {
        offset = undefined;
    } else {
        offset = offset[1];
    }
    return tsRustConversion.fp.verifierIndexFromRust(plonk_wasm.caml_pasta_fp_plonk_verifier_index_read(offset, urs, caml_jsstring_of_string(path)));
};

// Provides: caml_pasta_fp_plonk_verifier_index_write
// Requires: plonk_wasm, caml_jsstring_of_string, tsRustConversion
var caml_pasta_fp_plonk_verifier_index_write = function (append, t, path) {
    if (append === 0) {
        append = undefined;
    } else {
        append = append[1];
    }
    return plonk_wasm.caml_pasta_fp_plonk_verifier_index_write(append, tsRustConversion.fp.verifierIndexToRust(t), caml_jsstring_of_string(path));
};

// Provides: caml_pasta_fp_plonk_verifier_index_shifts
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_verifier_index_shifts = function (log2_size) {
    return tsRustConversion.fp.shiftsFromRust(plonk_wasm.caml_pasta_fp_plonk_verifier_index_shifts(log2_size));
};

// Provides: caml_pasta_fp_plonk_verifier_index_dummy
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_verifier_index_dummy = function () {
    var res = plonk_wasm.caml_pasta_fp_plonk_verifier_index_dummy();
    return tsRustConversion.fp.verifierIndexFromRust(res);
};

// Provides: caml_pasta_fp_plonk_verifier_index_deep_copy
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_verifier_index_deep_copy = function (x) {
    return tsRustConversion.fp.verifierIndexFromRust(plonk_wasm.caml_pasta_fp_plonk_verifier_index_deep_copy(tsRustConversion.fp.verifierIndexToRust(x)));
};




// Provides: caml_pasta_fq_plonk_verifier_index_create
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_verifier_index_create = function (x) {
    return tsRustConversion.fq.verifierIndexFromRust(plonk_wasm.caml_pasta_fq_plonk_verifier_index_create(x));
};

// Provides: caml_pasta_fq_plonk_verifier_index_read
// Requires: plonk_wasm, caml_jsstring_of_string, tsRustConversion
var caml_pasta_fq_plonk_verifier_index_read = function (offset, urs, path) {
    if (offset === 0) {
        offset = undefined;
    } else {
        offset = offset[1];
    }
    return tsRustConversion.fq.verifierIndexFromRust(plonk_wasm.caml_pasta_fq_plonk_verifier_index_read(offset, urs, caml_jsstring_of_string(path)));
};

// Provides: caml_pasta_fq_plonk_verifier_index_write
// Requires: plonk_wasm, caml_jsstring_of_string, tsRustConversion
var caml_pasta_fq_plonk_verifier_index_write = function (append, t, path) {
    if (append === 0) {
        append = undefined;
    } else {
        append = append[1];
    }
    return plonk_wasm.caml_pasta_fq_plonk_verifier_index_write(append, tsRustConversion.fq.verifierIndexToRust(t), caml_jsstring_of_string(path));
};

// Provides: caml_pasta_fq_plonk_verifier_index_shifts
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_verifier_index_shifts = function (log2_size) {
    return tsRustConversion.fq.shiftsFromRust(plonk_wasm.caml_pasta_fq_plonk_verifier_index_shifts(log2_size));
};

// Provides: caml_pasta_fq_plonk_verifier_index_dummy
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_verifier_index_dummy = function () {
    return tsRustConversion.fq.verifierIndexFromRust(plonk_wasm.caml_pasta_fq_plonk_verifier_index_dummy());
};

// Provides: caml_pasta_fq_plonk_verifier_index_deep_copy
// Requires: plonk_wasm, tsRustConversion, tsRustConversion
var caml_pasta_fq_plonk_verifier_index_deep_copy = function (x) {
    return tsRustConversion.fq.verifierIndexFromRust(plonk_wasm.caml_pasta_fq_plonk_verifier_index_deep_copy(tsRustConversion.fq.verifierIndexToRust(x)));
};



// proof

// Provides: caml_pasta_fp_plonk_proof_create
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_proof_create = function (index, witness_cols, prev_challenges, prev_sgs) {
    var w = new plonk_wasm.WasmVecVecFp(witness_cols.length - 1);
    for (var i = 1; i < witness_cols.length; i++) {
        w.push(tsRustConversion.fp.vectorToRust(witness_cols[i]));
    }
    witness_cols = w;
    prev_challenges = tsRustConversion.fp.vectorToRust(prev_challenges);
    prev_sgs = tsRustConversion.fp.pointsToRust(prev_sgs);
    var proof = plonk_wasm.caml_pasta_fp_plonk_proof_create(index, witness_cols, prev_challenges, prev_sgs);
    return tsRustConversion.fp.proofFromRust(proof);
};

// Provides: caml_pasta_fp_plonk_proof_verify
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_proof_verify = function (index, proof) {
    index = tsRustConversion.fp.verifierIndexToRust(index);
    proof = tsRustConversion.fp.proofToRust(proof);
    return plonk_wasm.caml_pasta_fp_plonk_proof_verify(index, proof);
};

// Provides: caml_pasta_fp_plonk_proof_batch_verify
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_proof_batch_verify = function (indexes, proofs) {
    indexes = tsRustConversion.mapMlArrayToRustVector(indexes, tsRustConversion.fp.verifierIndexToRust);
    proofs = tsRustConversion.mapMlArrayToRustVector(proofs, tsRustConversion.fp.proofToRust);
    return plonk_wasm.caml_pasta_fp_plonk_proof_batch_verify(indexes, proofs);
};

// Provides: caml_pasta_fp_plonk_proof_dummy
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_proof_dummy = function () {
    return tsRustConversion.fp.proofFromRust(plonk_wasm.caml_pasta_fp_plonk_proof_dummy());
};

// Provides: caml_pasta_fp_plonk_proof_deep_copy
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fp_plonk_proof_deep_copy = function (proof) {
    return tsRustConversion.fp.proofFromRust(plonk_wasm.caml_pasta_fp_plonk_proof_deep_copy(tsRustConversion.fp.proofToRust(proof)));
};



// Provides: caml_pasta_fq_plonk_proof_create
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_proof_create = function (index, witness_cols, prev_challenges, prev_sgs) {
    var w = new plonk_wasm.WasmVecVecFq(witness_cols.length - 1);
    for (var i = 1; i < witness_cols.length; i++) {
        w.push(tsRustConversion.fq.vectorToRust(witness_cols[i]));
    }
    witness_cols = w;
    prev_challenges = tsRustConversion.fq.vectorToRust(prev_challenges);
    prev_sgs = tsRustConversion.fq.pointsToRust(prev_sgs);
    var proof = plonk_wasm.caml_pasta_fq_plonk_proof_create(index, witness_cols, prev_challenges, prev_sgs);
    return tsRustConversion.fq.proofFromRust(proof);
};

// Provides: caml_pasta_fq_plonk_proof_verify
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_proof_verify = function (index, proof) {
    index = tsRustConversion.fq.verifierIndexToRust(index);
    proof = tsRustConversion.fq.proofToRust(proof);
    return plonk_wasm.caml_pasta_fq_plonk_proof_verify(index, proof);
};

// Provides: caml_pasta_fq_plonk_proof_batch_verify
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_proof_batch_verify = function (indexes, proofs) {
    indexes = tsRustConversion.mapMlArrayToRustVector(indexes, tsRustConversion.fq.verifierIndexToRust);
    proofs = tsRustConversion.mapMlArrayToRustVector(proofs, tsRustConversion.fq.proofToRust);
    return plonk_wasm.caml_pasta_fq_plonk_proof_batch_verify(indexes, proofs);
};

// Provides: caml_pasta_fq_plonk_proof_dummy
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_proof_dummy = function () {
    return tsRustConversion.fq.proofFromRust(plonk_wasm.caml_pasta_fq_plonk_proof_dummy());
};

// Provides: caml_pasta_fq_plonk_proof_deep_copy
// Requires: plonk_wasm, tsRustConversion
var caml_pasta_fq_plonk_proof_deep_copy = function (proof) {
    return tsRustConversion.fq.proofFromRust(plonk_wasm.caml_pasta_fq_plonk_proof_deep_copy(tsRustConversion.fq.proofToRust(proof)));
};



// oracles

// Provides: fp_oracles_create
// Requires: plonk_wasm, tsRustConversion
var fp_oracles_create = function (lgr_comm, verifier_index, proof) {
    return tsRustConversion.fp.oraclesFromRust(plonk_wasm.fp_oracles_create(
        tsRustConversion.fp.polyCommsToRust(lgr_comm),
        tsRustConversion.fp.verifierIndexToRust(verifier_index),
        tsRustConversion.fp.proofToRust(proof)
    ));
};

// Provides: fp_oracles_dummy
// Requires: plonk_wasm, tsRustConversion
var fp_oracles_dummy = function () {
    return tsRustConversion.fp.oraclesFromRust(plonk_wasm.fp_oracles_dummy());
};

// Provides: fp_oracles_deep_copy
// Requires: plonk_wasm, tsRustConversion
var fp_oracles_deep_copy = function (x) {
    return tsRustConversion.fp.oraclesFromRust(
        plonk_wasm.fp_oracles_deep_copy(tsRustConversion.fp.oraclesToRust(x))
    );
};



// Provides: fq_oracles_create
// Requires: plonk_wasm, tsRustConversion
var fq_oracles_create = function (lgr_comm, verifier_index, proof) {
    return tsRustConversion.fq.oraclesFromRust(plonk_wasm.fq_oracles_create(
        tsRustConversion.fq.polyCommsToRust(lgr_comm),
        tsRustConversion.fq.verifierIndexToRust(verifier_index),
        tsRustConversion.fq.proofToRust(proof)
    ));
};

// Provides: fq_oracles_dummy
// Requires: plonk_wasm, tsRustConversion
var fq_oracles_dummy = function () {
    return tsRustConversion.fq.oraclesFromRust(plonk_wasm.fq_oracles_dummy());
};

// Provides: fq_oracles_deep_copy
// Requires: plonk_wasm, tsRustConversion
var fq_oracles_deep_copy = function (x) {
    return tsRustConversion.fq.oraclesFromRust(
        plonk_wasm.fq_oracles_deep_copy(tsRustConversion.fq.oraclesToRust(x))
    );
};


// This is fake -- parameters are only needed on the Rust side, so no need to return something meaningful
// Provides: caml_pasta_fp_poseidon_params_create
function caml_pasta_fp_poseidon_params_create() {
    return [0];
}
// Provides: caml_pasta_fq_poseidon_params_create
function caml_pasta_fq_poseidon_params_create() {
    return [0];
}

// Provides: caml_pasta_fp_poseidon_block_cipher
// Requires: plonk_wasm, tsRustConversion, tsRustConversion
function caml_pasta_fp_poseidon_block_cipher(_fake_params, fp_vector) {
    // 1. get permuted field vector from rust
    var wasm_flat_vector = plonk_wasm.caml_pasta_fp_poseidon_block_cipher(tsRustConversion.fp.vectorToRust(fp_vector));
    var new_fp_vector = tsRustConversion.fp.vectorFromRust(wasm_flat_vector);
    // 2. write back modified field vector to original one
    new_fp_vector.forEach(function (a, i) {
        fp_vector[i] = a;
    });
}
// Provides: caml_pasta_fq_poseidon_block_cipher
// Requires: plonk_wasm, tsRustConversion, tsRustConversion
function caml_pasta_fq_poseidon_block_cipher(_fake_params, fq_vector) {
    // 1. get permuted field vector from rust
    var wasm_flat_vector = plonk_wasm.caml_pasta_fq_poseidon_block_cipher(tsRustConversion.fq.vectorToRust(fq_vector));
    var new_fq_vector = tsRustConversion.fq.vectorFromRust(wasm_flat_vector);
    // 2. write back modified field vector to original one
    new_fq_vector.forEach(function (a, i) {
        fq_vector[i] = a;
    });
}


// Provides: prover_to_json
// Requires: plonk_wasm
var prover_to_json = plonk_wasm.prover_to_json;

// Provides: integers_uint64_of_uint32
// Requires: UInt64, caml_int64_of_int32
function integers_uint64_of_uint32(i) {
    // Same as integers_uint64_of_int
    return new UInt64(caml_int64_of_int32(i));
}


/////////////////////////////////////////////////////////////////////////////
// The *_example_* functions below are only used in the pickles unit tests //
/////////////////////////////////////////////////////////////////////////////


// Provides: caml_pasta_fp_plonk_proof_example_with_ffadd
function caml_pasta_fp_plonk_proof_example_with_ffadd() {
    throw new Error("Unimplemented caml_pasta_fp_plonk_proof_example_with_ffadd");
}


// Provides: caml_pasta_fp_plonk_proof_example_with_foreign_field_mul
function caml_pasta_fp_plonk_proof_example_with_foreign_field_mul() {
    throw new Error("Unimplemented caml_pasta_fp_plonk_proof_example_with_foreign_field_mul");
}


// Provides: caml_pasta_fp_plonk_proof_example_with_range_check
function caml_pasta_fp_plonk_proof_example_with_range_check() {
    throw new Error("Unimplemented caml_pasta_fp_plonk_proof_example_with_range_check");
}


// Provides: caml_pasta_fp_plonk_proof_example_with_range_check0
function caml_pasta_fp_plonk_proof_example_with_range_check0() {
    throw new Error("Unimplemented caml_pasta_fp_plonk_proof_example_with_range_check0");
}


// Provides: caml_pasta_fp_plonk_proof_example_with_rot
function caml_pasta_fp_plonk_proof_example_with_rot() {
    throw new Error("Unimplemented caml_pasta_fp_plonk_proof_example_with_rot");
}


// Provides: caml_pasta_fp_plonk_proof_example_with_xor
function caml_pasta_fp_plonk_proof_example_with_xor() {
    throw new Error("Unimplemented caml_pasta_fp_plonk_proof_example_with_xor");
}


// Provides: caml_pasta_fp_plonk_proof_example_with_lookup
function caml_pasta_fp_plonk_proof_example_with_lookup() {
    throw new Error("Unimplemented caml_pasta_fp_plonk_proof_example_with_lookup");
}
