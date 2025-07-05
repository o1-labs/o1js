// TODO: refactor Provable to use this kind of an interface (will save a lot of array slicing)
// TODO: this could also handle aux data in addition to fields
export class FieldsDecoder {
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
