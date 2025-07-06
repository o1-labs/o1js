"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldsDecoder = void 0;
// TODO: refactor Provable to use this kind of an interface (will save a lot of array slicing)
// TODO: this could also handle aux data in addition to fields
class FieldsDecoder {
    fields;
    index;
    constructor(fields, index = 0) {
        this.fields = fields;
        this.index = index;
    }
    decode(size, f) {
        const subFields = this.fields.slice(this.index, this.index + size);
        this.index += size;
        return f(subFields);
    }
}
exports.FieldsDecoder = FieldsDecoder;
