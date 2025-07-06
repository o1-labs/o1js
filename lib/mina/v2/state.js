"use strict";
/* ZkApp State
 * -----------
 *
 * ZkApp State is typed using a StateLayout type variable, which is a mapped-type mapping from state
 * names to Provable type implementations. A top-level StateDefinition is defined by zkApp
 * developers and passed when constructing AccountUpdates (and related structures). The
 * StatePreconditions and StateDefinition types define the internal representation of State values
 * in preconditions and updates within AccountUpdates. There is also a GenericState representation
 * which maps to the standard field array representation which is used by the protocol.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = exports.StateReader = exports.StateMask = exports.GenericStateUpdates = exports.StateUpdates = exports.StateDefinition = exports.StatePreconditions = exports.GenericStatePreconditions = exports.StateValues = void 0;
// TODO: there is a lot of duplication here on the generic representation that we can reduce
const core_js_1 = require("./core.js");
const preconditions_js_1 = require("./preconditions.js");
const bool_js_1 = require("../../provable/bool.js");
const field_js_1 = require("../../provable/field.js");
const provable_js_1 = require("../../provable/provable.js");
const constants_js_1 = require("../v1/constants.js");
const { MAX_ZKAPP_STATE_FIELDS } = constants_js_1.ZkappConstants;
const CustomStateLayout = {
    project(Layout, f) {
        const entriesIn = Object.entries(Layout);
        const entriesOut = entriesIn.map(([key, T]) => [key, f(key, T)]);
        return Object.fromEntries(entriesOut);
    },
    // mapToArray<State extends CustomStateLayout, Out>(
    //   Layout: State,
    //   f: (key: keyof State, value: State[typeof key]) => Out
    // ): Out[] {
    //   const out: Out[] = [];
    //   const keys = Object.keys(Layout) as (keyof State)[];
    //   keys.forEach((key) => out.push(f(key, Layout[key])));
    //   return out;
    // }
};
const StateDefinition = {
    split2(definition, value1, value2, generic, custom) {
        if (definition === 'GenericState') {
            return generic(value1, value2);
        }
        else {
            return custom(definition.Layout, value1, value2);
        }
    },
    map(definition, value, generic, custom) {
        if (definition === 'GenericState') {
            return generic(value);
        }
        else {
            return custom(definition.Layout, value);
        }
    },
    map2(definition, value1, value2, generic, custom) {
        if (definition === 'GenericState') {
            return generic(value1, value2);
        }
        else {
            return custom(definition.Layout, value1, value2);
        }
    },
    project(definition, generic, custom) {
        return StateDefinition.map(definition, undefined, generic, custom);
    },
    convert(definition, value, generic, custom) {
        return StateDefinition.map(definition, value, generic, custom);
    },
};
exports.StateDefinition = StateDefinition;
// TODO: allow for explicit ordering/mapping of state field indices
function State(Layout) {
    // TODO: proxy provable definition out of Struct with helper
    // class StateDef extends Struct(Layout) {}
    // TODO: check sizeInFields
    const sizeInFields = Object.values(Layout)
        .map((T) => T.sizeInFields())
        .reduce((a, b) => a + b, 0);
    return {
        Layout,
        sizeInFields() {
            return sizeInFields;
        },
        toFields(x) {
            const fields = [];
            for (const key in Layout) {
                fields.push(...Layout[key].toFields(x[key]));
            }
            return fields;
        },
        toAuxiliary(x) {
            const aux = [];
            for (const key in Layout) {
                aux.push(Layout[key].toAuxiliary(x !== undefined ? x[key] : undefined));
            }
            return aux;
        },
        fromFields(_fields, _aux) {
            throw new Error('TODO');
        },
        toValue(x) {
            return x;
        },
        fromValue(x) {
            return x;
        },
        check(_x) {
            throw new Error('TODO');
        },
    };
    // TODO: ^ get rid of the type-cast here (typescript's error message here is very unhelpful)
}
exports.State = State;
const StatePreconditions = {
    empty(State) {
        return StateDefinition.project(State, GenericStatePreconditions.empty, (Layout) => CustomStateLayout.project(Layout, (_key, T) => preconditions_js_1.Precondition.Equals.disabled(T.empty())));
    },
    toGeneric(State, statePreconditions) {
        return StateDefinition.convert(State, statePreconditions, (x) => x, (Layout, preconditions) => {
            // const fieldPreconditions = CustomStateLayout.mapToArray<typeof Layout, Precondition.Equals<Field>>(
            //   Layout,
            //   (key: keyof State, T) => {
            //     const precondition = preconditions[key];
            //     const fields = T.toFields(precondition.value);
            //     return fields.map((field) => new Precondition.Equals(precondition.isEnabled, field));
            //   }
            // ).flat();
            const entries = Object.entries(Layout);
            const fieldPreconditions = entries.flatMap(([key, T]) => {
                const precondition = preconditions[key];
                const fields = T.toFields(precondition.value);
                return fields.map((field) => new preconditions_js_1.Precondition.Equals(precondition.isEnabled, field));
            });
            return new GenericStatePreconditions(fieldPreconditions);
        });
    },
    fromGeneric(statePreconditions, State) {
        return StateDefinition.project(State, () => statePreconditions, (Layout) => {
            // NB: this relies on the order of map being deterministic
            // TODO: make the order of custom state layout keys deterministic (lol)
            let i = 0;
            return CustomStateLayout.project(Layout, (_key, T) => {
                const fieldPreconditions = statePreconditions.preconditions.slice(i, i + T.sizeInFields());
                i += T.sizeInFields();
                if (fieldPreconditions.length === 0)
                    throw new Error('invalid state element field length');
                const isEnabled = fieldPreconditions[0].isEnabled;
                const allPreconditionsShareEnablement = bool_js_1.Bool.allTrue(fieldPreconditions.map((precondition) => precondition.isEnabled.equals(isEnabled)));
                if (allPreconditionsShareEnablement.not().toBoolean())
                    throw new Error('state field preconditions mapping to the same state field element were not all enabled/disabled equally');
                const fields = fieldPreconditions.map((precondition) => precondition.value);
                const value = T.fromFields(fields, /* TODO */ []);
                return new preconditions_js_1.Precondition.Equals(isEnabled, value);
            });
        });
    },
    toFieldPreconditions(State, preconditions) {
        return [...StatePreconditions.toGeneric(State, preconditions).preconditions];
    },
};
exports.StatePreconditions = StatePreconditions;
const StateUpdates = {
    empty(State) {
        return StateDefinition.project(State, GenericStateUpdates.empty, (Layout) => CustomStateLayout.project(Layout, (_key, T) => core_js_1.Update.disabled(T.empty())));
    },
    anyValuesAreSet(stateUpdates) {
        const updates = stateUpdates instanceof GenericStateUpdates
            ? stateUpdates.updates
            : Object.values(stateUpdates);
        return bool_js_1.Bool.anyTrue(updates.map((update) => update.set));
    },
    toGeneric(State, stateUpdates) {
        return StateDefinition.convert(State, stateUpdates, (x) => x, (Layout, updates) => {
            const entries = Object.entries(Layout);
            const fieldUpdates = entries.flatMap(([key, T]) => {
                const update = updates[key];
                const update2 = update === undefined
                    ? new core_js_1.Update(new bool_js_1.Bool(false), T.empty())
                    : update instanceof core_js_1.Update
                        ? update
                        : new core_js_1.Update(new bool_js_1.Bool(true), update);
                const fields = T.toFields(update2.value);
                return fields.map((field) => new core_js_1.Update(update2.set, field));
            });
            return new GenericStateUpdates(fieldUpdates);
        });
    },
    fromGeneric(stateUpdates, State) {
        return StateDefinition.project(State, () => stateUpdates, (Layout) => {
            // NB: this relies on the order of map being deterministic
            // TODO: make the order of custom state layout keys deterministic (lol)
            let i = 0;
            return CustomStateLayout.project(Layout, (_key, T) => {
                const fieldUpdates = stateUpdates.updates.slice(i, i + T.sizeInFields());
                i += T.sizeInFields();
                if (fieldUpdates.length === 0)
                    throw new Error('invalid state element field length');
                const set = fieldUpdates[0].set;
                const allUpdatesShareEnablement = bool_js_1.Bool.allTrue(fieldUpdates.map((precondition) => precondition.set.equals(set)));
                if (allUpdatesShareEnablement.not().toBoolean())
                    throw new Error('state field preconditions mapping to the same state field element were not all enabled/disabled equally');
                const fields = fieldUpdates.map((precondition) => precondition.value);
                const value = T.fromFields(fields, /* TODO */ []);
                return new core_js_1.Update(set, value);
            });
        });
    },
    toFieldUpdates(State, updates) {
        return [...StateUpdates.toGeneric(State, updates).updates];
    },
};
exports.StateUpdates = StateUpdates;
const StateValues = {
    empty(State) {
        return StateDefinition.project(State, GenericStateValues.empty, (Layout) => CustomStateLayout.project(Layout, (_key, T) => T.empty()));
    },
    toGeneric(State, stateValues) {
        return StateDefinition.convert(State, stateValues, (x) => x, (Layout, updates) => {
            const entries = Object.entries(Layout);
            const fieldValues = entries.flatMap(([key, T]) => {
                const value = updates[key];
                return T.toFields(value);
            });
            return new GenericStateValues(fieldValues);
        });
    },
    fromGeneric(stateValues, State) {
        return StateDefinition.project(State, () => stateValues, (Layout) => {
            // NB: this relies on the order of map being deterministic
            // TODO: make the order of custom state layout keys deterministic (lol)
            let i = 0;
            return CustomStateLayout.project(Layout, (_key, T) => {
                const fields = stateValues.values.slice(i, i + T.sizeInFields());
                i += T.sizeInFields();
                return T.fromFields(fields, /* TODO */ []);
            });
        });
    },
    checkPreconditions(State, stateValues, statePreconditions) {
        StateDefinition.split2(State, stateValues, statePreconditions, (values, preconditions) => {
            for (const i in values.values) {
                if (preconditions.preconditions[i].isSatisfied(values.values[i]).not().toBoolean())
                    throw new Error(`precondition for state field ${i} not satisfied`);
            }
        }, () => {
            // TODO: evaluate these directly on the custom state representation and give meaningful errors
            StateValues.checkPreconditions('GenericState', StateValues.toGeneric(State, stateValues), StatePreconditions.toGeneric(State, statePreconditions));
        });
        // if(State === 'GenericState') {
        //   // unsafely narrow types manually since typescript can't
        //   const state = (values as GenericStateValues).values;
        //   const statePreconditions = preconditions as GenericStatePreconditions;
        //   if(state.length !== MAX_ZKAPP_STATE_FIELDS)
        //     throw new Error('internal error: invalid number of generic state field values');
        //   if(state.length !== statePreconditions.preconditions.length)
        //     throw new Error('internal error: invalid number of generic state field preconditions');
        //   for(const i in state) {
        //     if(statePreconditions.preconditions[i].isSatisfied(state[i]).not().toBoolean())
        //       throw new Error(`precondition for state field ${i} not satisfied`);
        //   }
        // } else {
        //   // TODO: evaluate these directly on the custom state representation and give meaningful errors
        //   StateValues.checkPreconditions(
        //     'GenericState',
        //     StateValues.toGeneric(State, values),
        //     StatePreconditions.toGeneric(State, preconditions)
        //   );
        // }
    },
    applyUpdates(State, stateValues, stateUpdates) {
        return StateDefinition.map2(State, stateValues, stateUpdates, (values, updates) => values.map((value, i) => {
            const update = updates.updates[i];
            return update.set.toBoolean() ? update.value : value;
        }), (Layout, values, updates) => {
            const result = { ...values };
            for (const key in Layout) {
                const update = updates[key];
                if (update !== undefined) {
                    const updateValue = update instanceof core_js_1.Update ? update : new core_js_1.Update(new bool_js_1.Bool(true), update);
                    if (updateValue.set.toBoolean()) {
                        result[key] = updateValue.value;
                    }
                }
            }
            return result;
        });
    },
};
exports.StateValues = StateValues;
const StateMask = {
    create(State) {
        return StateDefinition.project(State, GenericStateMask.empty, () => ({}));
    },
};
exports.StateMask = StateMask;
const StateReader = {
    create(State, stateValues, stateMask) {
        if (State === 'GenericState') {
            const values = stateValues;
            const mask = stateMask;
            return new GenericStateReader(values, mask);
        }
        else {
            const values = stateValues;
            const mask = stateMask;
            return CustomStateLayout.project(State.Layout, (key, T) => () => {
                return provable_js_1.Provable.witness(T, () => {
                    const value = values.get()[key];
                    mask.get()[key] = value;
                    return value;
                });
            });
        }
    },
};
exports.StateReader = StateReader;
class StateFieldsArray {
    constructor(fieldElements, empty) {
        this.fieldElements = fieldElements;
        if (this.fieldElements.length > MAX_ZKAPP_STATE_FIELDS) {
            throw new Error('exceeded maximum number of state elements');
        }
        if (this.fieldElements.length < MAX_ZKAPP_STATE_FIELDS) {
            for (let i = this.fieldElements.length; i < MAX_ZKAPP_STATE_FIELDS; i++) {
                this.fieldElements.push(empty());
            }
        }
        if (this.fieldElements.length !== MAX_ZKAPP_STATE_FIELDS) {
            throw new Error('internal error: invariant broken');
        }
    }
    get fields() {
        return [...this.fieldElements];
    }
}
class GenericStateValues extends StateFieldsArray {
    constructor(values) {
        super(values, field_js_1.Field.empty);
    }
    get values() {
        return this.fields;
    }
    get(index) {
        if (index >= MAX_ZKAPP_STATE_FIELDS)
            throw new Error('zkapp state index out of bounds');
        return this.fields[index];
    }
    map(f) {
        return new GenericStateValues(this.values.map(f));
    }
    static empty() {
        return new GenericStateValues([]);
    }
}
class GenericStatePreconditions extends StateFieldsArray {
    constructor(preconditions) {
        super(preconditions, () => preconditions_js_1.Precondition.Equals.disabled(field_js_1.Field.empty()));
    }
    get preconditions() {
        return this.fields;
    }
    static empty() {
        return new GenericStatePreconditions([]);
    }
}
exports.GenericStatePreconditions = GenericStatePreconditions;
class GenericStateUpdates extends StateFieldsArray {
    constructor(updates) {
        super(updates, () => core_js_1.Update.disabled(field_js_1.Field.empty()));
    }
    get updates() {
        return this.fields;
    }
    static empty() {
        return new GenericStateUpdates([]);
    }
}
exports.GenericStateUpdates = GenericStateUpdates;
class GenericStateMask extends StateFieldsArray {
    constructor() {
        super([], () => undefined);
    }
    set(index, value) {
        if (index >= MAX_ZKAPP_STATE_FIELDS)
            throw new Error('zkapp state index out of bounds');
        this.fields[index] = value;
    }
    static empty() {
        return new GenericStateMask();
    }
}
class GenericStateReader {
    constructor(values, mask) {
        this.values = values;
        this.mask = mask;
    }
    read(index) {
        return provable_js_1.Provable.witness(field_js_1.Field, () => {
            const value = this.values.get().get(index);
            this.mask.get().set(index, value);
            return value;
        });
    }
}
