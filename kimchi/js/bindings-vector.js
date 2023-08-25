
// fp

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
  return value;
}

// fq

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
  return value;
}