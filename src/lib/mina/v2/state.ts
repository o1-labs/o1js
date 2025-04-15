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

// TODO: there is a lot of duplication here on the generic representation that we can reduce

import { Empty, Eq, ProvableInstance, Update } from './core.js';
import { Precondition } from './preconditions.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Provable } from '../../provable/provable.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { ZkappConstants } from '../v1/constants.js';

export {
  StateValues,
  GenericStatePreconditions,
  StatePreconditions,
  StateDefinition,
  StateUpdates,
  StateLayout,
  GenericStateUpdates,
  StateMask,
  StateReader,
  State,
};

const { MAX_ZKAPP_STATE_FIELDS } = ZkappConstants;

// TODO IMMEDIATELY: This representation doesn't actually work, because if you specify a state
//                   element in a custom state layout that doesn't satisfy the StateElement type,
//                   typescript will just replace the state element types in the layout with `any`.
//                   Fucking typescript.
/**
 * A type that represents a state element in a custom state layout.
 */
type StateElement<T extends Eq<T>> = Provable<T> & Empty<T>;
// type StateElementInstance<E> = E extends StateElement<infer T> ? T : never;
// TODO: custom state layouts need to specify the order of their keys
type CustomStateLayout = { [name: string]: Provable<any> & Empty<any> };
type StateLayout = 'GenericState' | CustomStateLayout;

const CustomStateLayout = {
  project<StateIn extends CustomStateLayout, StateOut extends { [name in keyof StateIn]: unknown }>(
    Layout: StateIn,
    f: (key: keyof StateIn, value: StateIn[typeof key]) => StateOut[typeof key]
  ): StateOut {
    const entriesIn = Object.entries(Layout) as [keyof StateIn, Provable<any>][];
    const entriesOut = entriesIn.map(([key, T]) => [key, f(key, T as StateIn[typeof key])]);
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

/**
 * Definition for a custom State layout.
 */
type CustomStateDefinition<State extends CustomStateLayout> = {
  Layout: State;
} & Provable<{
  [name in keyof State]: ProvableInstance<State[name]>;
}>;
type GenericStateDefinition = 'GenericState';
type StateDefinition<State extends StateLayout> = State extends GenericStateDefinition
  ? GenericStateDefinition
  : CustomStateDefinition<Exclude<State, 'GenericState'>>;

const StateDefinition = {
  split2<State extends StateLayout, Generic1, Custom1, Generic2, Custom2>(
    definition: StateDefinition<State>,
    value1: State extends 'GenericState' ? Generic1 : Custom1,
    value2: State extends 'GenericState' ? Generic2 : Custom2,
    generic: (x1: Generic1, x2: Generic2) => void,
    custom: (layout: CustomStateLayout, x1: Custom1, x2: Custom2) => void
  ) {
    if (definition === 'GenericState') {
      return generic(value1 as Generic1, value2 as Generic2);
    } else {
      return custom(definition.Layout, value1 as Custom1, value2 as Custom2);
    }
  },

  map<State extends StateLayout, GenericIn, CustomIn, GenericOut, CustomOut>(
    definition: StateDefinition<State>,
    value: State extends 'GenericState' ? GenericIn : CustomIn,
    generic: (x: GenericIn) => GenericOut,
    custom: (layout: CustomStateLayout, x: CustomIn) => CustomOut
  ): State extends 'GenericState' ? GenericOut : CustomOut {
    if (definition === 'GenericState') {
      return generic(value as GenericIn) as State extends 'GenericState' ? GenericOut : CustomOut;
    } else {
      return custom(definition.Layout, value as CustomIn) as State extends 'GenericState'
        ? GenericOut
        : CustomOut;
    }
  },

  map2<
    State extends StateLayout,
    GenericIn1,
    CustomIn1,
    GenericIn2,
    CustomIn2,
    GenericOut,
    CustomOut
  >(
    definition: StateDefinition<State>,
    value1: State extends 'GenericState' ? GenericIn1 : CustomIn1,
    value2: State extends 'GenericState' ? GenericIn2 : CustomIn2,
    generic: (x1: GenericIn1, x2: GenericIn2) => GenericOut,
    custom: (layout: CustomStateLayout, x1: CustomIn1, x2: CustomIn2) => CustomOut
  ): State extends 'GenericState' ? GenericOut : CustomOut {
    if (definition === 'GenericState') {
      return generic(value1 as GenericIn1, value2 as GenericIn2) as State extends 'GenericState'
        ? GenericOut
        : CustomOut;
    } else {
      return custom(
        definition.Layout,
        value1 as CustomIn1,
        value2 as CustomIn2
      ) as State extends 'GenericState' ? GenericOut : CustomOut;
    }
  },

  project<State extends StateLayout, Generic, Custom>(
    definition: StateDefinition<State>,
    generic: () => Generic,
    custom: (layout: CustomStateLayout) => Custom
  ): State extends 'GenericState' ? Generic : Custom {
    return StateDefinition.map(definition, undefined, generic, custom);
  },

  convert<State extends StateLayout, Generic, Custom, Out>(
    definition: StateDefinition<State>,
    value: State extends 'GenericState' ? Generic : Custom,
    generic: (x: Generic) => Out,
    custom: (layout: CustomStateLayout, x: Custom) => Out
  ): Out {
    return StateDefinition.map(definition, value, generic, custom);
  },
};

/**
 * Helper type to define
 */
type StateValue<Layout extends CustomStateLayout> = {
  [K in keyof Layout]: ProvableInstance<Layout[K]>;
};

/**
 * Create a {@link Provable} from a {@link CustomStateLayout} layout.
 */
function createProvableFromLayout<State extends CustomStateLayout>(
  layout: State
): Provable<{ [K in keyof State]: ProvableInstance<State[K]> }> {
  // TODO: Check sizeInFields
  const sizeInFields = Object.values(layout)
    .map((T) => T.sizeInFields())
    .reduce((a, b) => a + b, 0);

  return {
    sizeInFields(): number {
      return sizeInFields;
    },
    toFields(x: StateValue<State>): Field[] {
      const fields: Field[] = [];
      for (const key in layout) {
        fields.push(...layout[key].toFields(x[key]));
      }
      return fields;
    },
    toAuxiliary(x?: StateValue<State>): any[] {
      const aux = [];
      for (const key in layout) {
        aux.push(layout[key].toAuxiliary(x !== undefined ? x[key] : undefined));
      }
      return aux;
    },
    fromFields(_fields: Field[], _aux: any[]): StateValue<State> {
      const result: Partial<StateValue<State>> = {};
      let fieldIndex = 0;
      for (const key in layout) {
        const fieldCount = layout[key].sizeInFields();
        const fieldsForKey = _fields.slice(fieldIndex, fieldIndex + fieldCount);
        result[key] = layout[key].fromFields(fieldsForKey, _aux);
        fieldIndex += fieldCount;
      }
      return result as StateValue<State>;
    },
    toValue(x: StateValue<State>): StateValue<State> {
      return x;
    },
    fromValue(x: StateValue<State>): StateValue<State> {
      return x;
    },
    check(x: StateValue<State>): void {
      for (const key in layout) {
        layout[key].check(x[key]);
      }
    },
  };
}

/**
 * Helper function to define a valid {@link StateDefinition} when using a custom state layout.
 *
 * @note If using a {@link GenericStateDefinition} then the StateDefinition is always `GenericState`
 * and there's not need to call this function to calculate it.
 */
// TODO: allow for explicit ordering/mapping of state field indices
function State<State extends CustomStateLayout>(Layout: State): CustomStateDefinition<State> {
  // TODO: proxy provable definition out of Struct with helper
  // class StateDef extends Struct(Layout) {}
  const provable = createProvableFromLayout(Layout);

  return {
    Layout,
    ...provable,
  };
}

type StatePreconditions<State extends StateLayout> = State extends 'GenericState'
  ? GenericStatePreconditions
  : {
      [name in keyof State]: Precondition.Equals<
        ProvableInstance<State[name]> & Eq<ProvableInstance<State[name]>>
      >;
    };

const StatePreconditions = {
  empty<State extends StateLayout>(State: StateDefinition<State>): StatePreconditions<State> {
    return StateDefinition.project(
      State,
      GenericStatePreconditions.empty,
      (Layout: CustomStateLayout) =>
        CustomStateLayout.project(Layout, (_key, T) => Precondition.Equals.disabled(T.empty()))
    );
  },

  toGeneric<State extends StateLayout>(
    State: StateDefinition<State>,
    statePreconditions: StatePreconditions<State>
  ): StatePreconditions<'GenericState'> {
    return StateDefinition.convert(
      State,
      statePreconditions,
      (x: GenericStatePreconditions) => x as StatePreconditions<'GenericState'>,
      (
        Layout: CustomStateLayout,
        preconditions: {
          [name in keyof State]: Precondition.Equals<
            ProvableInstance<State[name]> & Eq<ProvableInstance<State[name]>>
          >;
        }
      ) => {
        // const fieldPreconditions = CustomStateLayout.mapToArray<typeof Layout, Precondition.Equals<Field>>(
        //   Layout,
        //   (key: keyof State, T) => {
        //     const precondition = preconditions[key];
        //     const fields = T.toFields(precondition.value);
        //     return fields.map((field) => new Precondition.Equals(precondition.isEnabled, field));
        //   }
        // ).flat();

        const entries = Object.entries(Layout) as [keyof State, StateElement<any>][];
        const fieldPreconditions = entries.flatMap(([key, T]) => {
          const precondition = preconditions[key];
          const fields = T.toFields(precondition.value);
          return fields.map((field) => new Precondition.Equals(precondition.isEnabled, field));
        });

        return new GenericStatePreconditions(fieldPreconditions);
      }
    );
  },

  fromGeneric<State extends StateLayout>(
    statePreconditions: StatePreconditions<'GenericState'>,
    State: StateDefinition<State>
  ): StatePreconditions<State> {
    return StateDefinition.project(
      State,
      () => statePreconditions,
      (Layout: CustomStateLayout) => {
        // NB: this relies on the order of map being deterministic
        // TODO: make the order of custom state layout keys deterministic (lol)
        let i = 0;
        return CustomStateLayout.project(Layout, (_key, T) => {
          const fieldPreconditions = statePreconditions.preconditions.slice(
            i,
            i + T.sizeInFields()
          );
          i += T.sizeInFields();
          if (fieldPreconditions.length === 0)
            throw new Error('invalid state element field length');

          const isEnabled = fieldPreconditions[0].isEnabled;
          const allPreconditionsShareEnablement = Bool.allTrue(
            fieldPreconditions.map((precondition) => precondition.isEnabled.equals(isEnabled))
          );
          if (allPreconditionsShareEnablement.not().toBoolean())
            throw new Error(
              'state field preconditions mapping to the same state field element were not all enabled/disabled equally'
            );

          const fields = fieldPreconditions.map((precondition) => precondition.value);
          const value = T.fromFields(fields, /* TODO */ []);

          return new Precondition.Equals(isEnabled, value);
        });
      }
    );
  },

  toFieldPreconditions<State extends StateLayout>(
    State: StateDefinition<State>,
    preconditions: StatePreconditions<State>
  ): Precondition.Equals<Field>[] {
    return [...StatePreconditions.toGeneric(State, preconditions).preconditions];
  },
};

type StateUpdates<State extends StateLayout> = State extends 'GenericState'
  ? GenericStateUpdates
  : {
      [name in keyof State]?: ProvableInstance<State[name]> | Update<ProvableInstance<State[name]>>;
    };

const StateUpdates = {
  empty<State extends StateLayout>(State: StateDefinition<State>): StateUpdates<State> {
    return StateDefinition.project(State, GenericStateUpdates.empty, (Layout: CustomStateLayout) =>
      CustomStateLayout.project(Layout, (_key, T) => Update.disabled(T.empty()))
    );
  },

  anyValuesAreSet<State extends StateLayout>(stateUpdates: StateUpdates<State>): Bool {
    const updates: Update<unknown>[] =
      stateUpdates instanceof GenericStateUpdates
        ? stateUpdates.updates
        : Object.values(stateUpdates);
    return Bool.anyTrue(updates.map((update) => update.set));
  },

  toGeneric<State extends StateLayout>(
    State: StateDefinition<State>,
    stateUpdates: StateUpdates<State>
  ): StateUpdates<'GenericState'> {
    return StateDefinition.convert(
      State,
      stateUpdates,
      (x: GenericStateUpdates) => x as StateUpdates<'GenericState'>,
      (
        Layout: CustomStateLayout,
        updates: {
          [name in keyof State]?:
            | ProvableInstance<State[name]>
            | Update<ProvableInstance<State[name]>>;
        }
      ) => {
        const entries = Object.entries(Layout) as [keyof State, Provable<any> & Empty<any>][];
        const fieldUpdates = entries.flatMap(([key, T]) => {
          const update = updates[key];
          const update2 =
            update === undefined
              ? new Update(new Bool(false), T.empty())
              : update instanceof Update
              ? update
              : new Update(new Bool(true), update);
          const fields = T.toFields(update2.value);
          return fields.map((field) => new Update(update2.set, field));
        });

        return new GenericStateUpdates(fieldUpdates);
      }
    );
  },

  fromGeneric<State extends StateLayout>(
    stateUpdates: StateUpdates<'GenericState'>,
    State: StateDefinition<State>
  ): StateUpdates<State> {
    return StateDefinition.project(
      State,
      () => stateUpdates,
      (Layout: CustomStateLayout) => {
        // NB: this relies on the order of map being deterministic
        // TODO: make the order of custom state layout keys deterministic (lol)
        let i = 0;
        return CustomStateLayout.project(Layout, (_key, T) => {
          const fieldUpdates = stateUpdates.updates.slice(i, i + T.sizeInFields());
          i += T.sizeInFields();
          if (fieldUpdates.length === 0) throw new Error('invalid state element field length');

          const set = fieldUpdates[0].set;
          const allUpdatesShareEnablement = Bool.allTrue(
            fieldUpdates.map((precondition) => precondition.set.equals(set))
          );
          if (allUpdatesShareEnablement.not().toBoolean())
            throw new Error(
              'state field preconditions mapping to the same state field element were not all enabled/disabled equally'
            );

          const fields = fieldUpdates.map((precondition) => precondition.value);
          const value = T.fromFields(fields, /* TODO */ []);

          return new Update(set, value);
        });
      }
    );
  },

  toFieldUpdates<State extends StateLayout>(
    State: StateDefinition<State>,
    updates: StateUpdates<State>
  ): Update<Field>[] {
    return [...StateUpdates.toGeneric(State, updates).updates];
  },
};

type StateValues<State extends StateLayout> = State extends 'GenericState'
  ? GenericStateValues
  : { [name in keyof State]: ProvableInstance<State[name]> };

const StateValues = {
  empty<State extends StateLayout>(State: StateDefinition<State>): StateValues<State> {
    return StateDefinition.project(State, GenericStateValues.empty, (Layout: CustomStateLayout) =>
      CustomStateLayout.project(Layout, (_key, T) => T.empty())
    );
  },

  toGeneric<State extends StateLayout>(
    State: StateDefinition<State>,
    stateValues: StateValues<State>
  ): StateValues<'GenericState'> {
    return StateDefinition.convert(
      State,
      stateValues,
      (x: GenericStateValues) => x as StateValues<'GenericState'>,
      (
        Layout: CustomStateLayout,
        updates: { [name in keyof State]?: ProvableInstance<State[name]> }
      ) => {
        const entries = Object.entries(Layout) as [keyof State, Provable<any>][];
        const fieldValues = entries.flatMap(([key, T]) => {
          const value = updates[key];
          return T.toFields(value);
        });

        return new GenericStateValues(fieldValues);
      }
    );
  },

  fromGeneric<State extends StateLayout>(
    stateValues: StateValues<'GenericState'>,
    State: StateDefinition<State>
  ): StateValues<State> {
    return StateDefinition.project(
      State,
      () => stateValues,
      (Layout: CustomStateLayout) => {
        // NB: this relies on the order of map being deterministic
        // TODO: make the order of custom state layout keys deterministic (lol)
        let i = 0;
        return CustomStateLayout.project(Layout, (_key, T) => {
          const fields = stateValues.values.slice(i, i + T.sizeInFields());
          i += T.sizeInFields();
          return T.fromFields(fields, /* TODO */ []);
        });
      }
    );
  },

  checkPreconditions<State extends StateLayout>(
    State: StateDefinition<State>,
    stateValues: StateValues<State>,
    statePreconditions: StatePreconditions<State>
  ): void {
    StateDefinition.split2(
      State,
      stateValues,
      statePreconditions,
      (values, preconditions) => {
        for (const i in values.values) {
          if (preconditions.preconditions[i].isSatisfied(values.values[i]).not().toBoolean())
            throw new Error(`precondition for state field ${i} not satisified`);
        }
      },
      () => {
        // TODO: evaluate these directly on the custom state representation and give meaningful errors
        StateValues.checkPreconditions(
          'GenericState',
          StateValues.toGeneric(State, stateValues),
          StatePreconditions.toGeneric(State, statePreconditions)
        );
      }
    );

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
    //       throw new Error(`precondition for state field ${i} not satisified`);
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

  applyUpdates<State extends StateLayout>(
    State: StateDefinition<State>,
    stateValues: StateValues<State>,
    stateUpdates: StateUpdates<State>
  ): StateValues<State> {
    return StateDefinition.map2(
      State,
      stateValues,
      stateUpdates,
      (values, updates) =>
        values.map((value, i) => {
          const update = updates.updates[i];
          return update.set.toBoolean() ? update.value : value;
        }),
      (Layout, values, updates): { [name in keyof State]: ProvableInstance<State[name]> } => {
        const result = { ...values };
        for (const key in Layout) {
          const update = updates[key as keyof State];
          if (update !== undefined) {
            const updateValue =
              update instanceof Update ? update : new Update(new Bool(true), update);
            if (updateValue.set.toBoolean()) {
              result[key as keyof State] = updateValue.value;
            }
          }
        }
        return result;
      }
    );
  },
};

type StateMask<State extends StateLayout> = State extends 'GenericState'
  ? GenericStateMask
  : { [name in keyof State]?: ProvableInstance<State[name]> };

const StateMask = {
  create<State extends StateLayout>(State: StateDefinition<State>): StateMask<State> {
    return StateDefinition.project(State, GenericStateMask.empty, () => ({}));
  },
};

type StateReader<State extends StateLayout> = State extends 'GenericState'
  ? GenericStateReader
  : {
      [name in keyof State]: State[name] extends Provable<infer U> ? () => U : never;
    };

const StateReader = {
  create<State extends StateLayout>(
    State: StateDefinition<State>,
    stateValues: Unconstrained<StateValues<State>>,
    stateMask: Unconstrained<StateMask<State>>
  ): StateReader<State> {
    if (State === 'GenericState') {
      const values = stateValues as Unconstrained<GenericStateValues>;
      const mask = stateMask as Unconstrained<GenericStateMask>;
      return new GenericStateReader(values, mask) as StateReader<State>;
    } else {
      const values = stateValues as Unconstrained<{
        [name in keyof State]: ProvableInstance<State[name]>;
      }>;
      const mask = stateMask as Unconstrained<{
        [name in keyof State]?: ProvableInstance<State[name]>;
      }>;
      return CustomStateLayout.project(State.Layout, (key, T) => (): ProvableInstance<typeof T> => {
        return Provable.witness(T, () => {
          const value = values.get()[key as keyof State];
          mask.get()[key as keyof State] = value;
          return value;
        });
      }) as StateReader<State>;
    }
  },
};

class StateFieldsArray<T> {
  constructor(private fieldElements: T[], empty: () => T) {
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

  get fields(): T[] {
    return [...this.fieldElements];
  }
}

class GenericStateValues extends StateFieldsArray<Field> {
  constructor(values: Field[]) {
    super(values, Field.empty);
  }

  get values(): Field[] {
    return this.fields;
  }

  get(index: number): Field {
    if (index >= MAX_ZKAPP_STATE_FIELDS) throw new Error('zkapp state index out of bounds');
    return this.fields[index];
  }

  map(f: (x: Field, i: number) => Field): GenericStateValues {
    return new GenericStateValues(this.values.map(f));
  }

  static empty(): GenericStateValues {
    return new GenericStateValues([]);
  }
}

class GenericStatePreconditions extends StateFieldsArray<Precondition.Equals<Field>> {
  constructor(preconditions: Precondition.Equals<Field>[]) {
    super(preconditions, () => Precondition.Equals.disabled(Field.empty()));
  }

  get preconditions(): Precondition.Equals<Field>[] {
    return this.fields;
  }

  static empty(): GenericStatePreconditions {
    return new GenericStatePreconditions([]);
  }
}

class GenericStateUpdates extends StateFieldsArray<Update<Field>> {
  constructor(updates: Update<Field>[]) {
    super(updates, () => Update.disabled(Field.empty()));
  }

  get updates(): Update<Field>[] {
    return this.fields;
  }

  static empty(): GenericStateUpdates {
    return new GenericStateUpdates([]);
  }
}

class GenericStateMask extends StateFieldsArray<Field | undefined> {
  constructor() {
    super([], () => undefined);
  }

  set(index: number, value: Field): void {
    if (index >= MAX_ZKAPP_STATE_FIELDS) throw new Error('zkapp state index out of bounds');
    this.fields[index] = value;
  }

  static empty(): GenericStateMask {
    return new GenericStateMask();
  }
}

class GenericStateReader {
  constructor(
    private values: Unconstrained<GenericStateValues>,
    private mask: Unconstrained<GenericStateMask>
  ) {}

  read(index: number): Field {
    return Provable.witness(Field, () => {
      const value = this.values.get().get(index);
      this.mask.get().set(index, value);
      return value;
    });
  }
}
