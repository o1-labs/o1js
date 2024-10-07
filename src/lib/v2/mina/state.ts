/* ZkApp State
 * -----------
 *
 * ZkApp State is typed using a StateLayout type variable, which is a mapped-type mapping from state
 * names to Provable type implementations. A top-level StateDefinition is defined by zkApp
 * developers and passed when constructing AccountUpdates (and related structures). The
 * StateConstraints and StateDefinition types define the internal representation of State values
 * in preconditions and updates within AccountUpdates. There is also a GenericState representation
 * which maps to the standard field array representation which is used by the protocol.
 */

import { Constraint, Empty, ProvableInstance, Update, MAX_ZKAPP_STATE_FIELDS } from './core.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Provable } from '../../provable/types/provable-intf.js';
import { Struct } from '../../provable/types/struct.js';

import util from 'util';

export type StateLayout = 'GenericState' | {[name: string]: Provable<any> & Empty<any>};

export type StateDefinition<State extends StateLayout> =
  State extends 'GenericState'
    ? 'GenericState'
    : {Layout: State} & Provable<{[name in keyof State]: ProvableInstance<State[name]>}>

export type StateConstraints<State extends StateLayout> =
  State extends 'GenericState'
    ? GenericStateConstraints
    : {[name in keyof State]: Constraint.Equals<ProvableInstance<State[name]>>};

export const StateConstraints = {
  empty<State extends StateLayout>(State: StateDefinition<State>): StateConstraints<State> {
    if(State === 'GenericState') {
      State satisfies 'GenericState';
      // typescript can't infer this correctly for some reason
      return GenericStateConstraints.empty() as StateConstraints<State>;
    } else {
      // TODO: there should be a more type-safe way to write this...
      const entries = Object.entries(State.Layout) as [keyof State, Provable<any> & Empty<any>][];
      return Object.fromEntries(entries.map(([key, T]) => [key, Constraint.Equals.disabled(T.empty())])) as StateConstraints<State>;
    }
  },

  // TODO: share code with StateUpdates#toFieldUpdates
  toFieldConstraints<State extends StateLayout>(State: StateDefinition<State>, constraints: StateConstraints<State>): Constraint.Equals<Field>[] {
    if(State === 'GenericState') {
      if(!(constraints instanceof GenericStateConstraints)) throw new Error('impossible');
      State satisfies 'GenericState';
      constraints satisfies GenericStateConstraints;
      return [...constraints.constraints];
    } else {
      // TODO: there should be a more type-safe way to write this...
      // typescript is unable to infer this type correctly
      const constraints2 = constraints as {[name in keyof State]: Constraint.Equals<ProvableInstance<State[name]>>};
      const entries = Object.entries(State.Layout) as [keyof State, Provable<any> & Empty<any>][];
      const fieldConstraints = entries.flatMap(([key, T]) => {
        const constraint = constraints2[key];
        const fields = T.toFields(constraint.value);
        return fields.map((field) => new Constraint.Equals(constraint.isEnabled, field));
      });

      if(fieldConstraints.length > MAX_ZKAPP_STATE_FIELDS) {
        throw new Error('Invalid state representation: too many field elements');
      }

      if(fieldConstraints.length < MAX_ZKAPP_STATE_FIELDS) {
        for(let i = fieldConstraints.length; i < MAX_ZKAPP_STATE_FIELDS; i++) {
          fieldConstraints.push(Constraint.Equals.disabled(new Field(0)));
        }
      }

      if(fieldConstraints.length !== MAX_ZKAPP_STATE_FIELDS) {
        throw new Error('internal error');
      }

      return fieldConstraints;
    }
  }
};

export type StateUpdates<State extends StateLayout> =
  State extends 'GenericState'
    ? GenericStateUpdates
    : {[name in keyof State]?: ProvableInstance<State[name]> | Update<ProvableInstance<State[name]>>}

export const StateUpdates = {
  empty<State extends StateLayout>(State: StateDefinition<State>): StateUpdates<State> {
    if(State === 'GenericState') {
      State satisfies 'GenericState';
      // typescript can't infer this correctly for some reason
      return GenericStateUpdates.empty() as StateUpdates<State>;
    } else {
      // TODO: there should be a more type-safe way to write this...
      const entries = Object.entries(State.Layout) as [keyof State, Provable<any> & Empty<any>][];
      return Object.fromEntries(entries.map(([key, T]) => [key, Update.disabled(T.empty())])) as StateUpdates<State>;
    }
  },

  toFieldUpdates<State extends StateLayout>(State: StateDefinition<State>, updates: StateUpdates<State>): Update<Field>[] {
    if(State === 'GenericState') {
      if(!(updates instanceof GenericStateUpdates)) throw new Error('impossible');
      State satisfies 'GenericState';
      updates satisfies GenericStateUpdates;
      return [...updates.updates];
    } else {
      // TODO: there should be a more type-safe way to write this...
      // typescript is unable to infer this type correctly
      const updates2 = updates as {[name in keyof State]: ProvableInstance<State[name]> | Update<ProvableInstance<State[name]>>};
      const entries = Object.entries(State.Layout) as [keyof State, Provable<any> & Empty<any>][];
      const fieldUpdates = entries.flatMap(([key, T]) => {
        const update = updates2[key];
        const update2 =
          update === undefined
            ? new Update(new Bool(false), T.empty())
            : update instanceof Update
              ? update
              : new Update(new Bool(true), update);
        // console.log(`key: ${key.toString()}, update type: ${typeof update}, value: ${JSON.stringify(Object.keys(update))}`);
        // console.log(util.inspect(update, undefined, null, true));
        const fields = T.toFields(update2.value);
        return fields.map((field) => new Update(update2.set, field));
      });

      if(fieldUpdates.length > MAX_ZKAPP_STATE_FIELDS) {
        throw new Error('Invalid state representation: too many field elements');
      }

      if(fieldUpdates.length < MAX_ZKAPP_STATE_FIELDS) {
        for(let i = fieldUpdates.length; i < MAX_ZKAPP_STATE_FIELDS; i++) {
          fieldUpdates.push(Update.disabled(new Field(0)));
        }
      }

      if(fieldUpdates.length !== MAX_ZKAPP_STATE_FIELDS) {
        throw new Error('internal error');
      }

      return fieldUpdates;
    }
  }
};

// TODO: allow for explicit ordering/mapping of state field indices
export function State<State extends {[name: string]: Provable<any> & Empty<any>}>(Layout: State): StateDefinition<State> {
  // TODO: proxy provable definition out of Struct with helper
  // class StateDef extends Struct(Layout) {}

  // TODO: check sizeInFields
  const sizeInFields = Object.values(Layout).map((T) => T.sizeInFields()).reduce((a, b) => a+b, 0);

  return {
    Layout,
    sizeInFields(): number {
      return sizeInFields;
    },
    toFields(x: {[name in keyof State]: ProvableInstance<State[name]>}): Field[] {
      const fields = [];
      for(const key in Layout) {
        fields.push(...Layout[key].toFields(x[key]));
      }
      return fields;
    },
    toAuxiliary(x?: {[name in keyof State]: ProvableInstance<State[name]>}): any[] {
      const aux = [];
      for(const key in Layout) {
        aux.push(Layout[key].toAuxiliary(x !== undefined ? x[key] : undefined));
      }
      return aux;
    },
    fromFields(_fields: Field[], _aux: any[]): {[name in keyof State]: ProvableInstance<State[name]>} {
      throw new Error('TODO');
    },
    toValue(x: {[name in keyof State]: ProvableInstance<State[name]>}): {[name in keyof State]: ProvableInstance<State[name]>} {
      return x;
    },
    fromValue(x: {[name in keyof State]: ProvableInstance<State[name]>}): {[name in keyof State]: ProvableInstance<State[name]>} {
      return x;
    },
    check(_x: {[name in keyof State]: ProvableInstance<State[name]>}): void {
      throw new Error('TODO');
    }
  } as StateDefinition<State>;
}

export class GenericStateConstraints {
  constructor(
    public constraints: Constraint.Equals<Field>[]
  ) {
    if(this.constraints.length > MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('exceeded maximum number of state constraints');
    }

    if(this.constraints.length < MAX_ZKAPP_STATE_FIELDS) {
      for(let i = this.constraints.length; i < MAX_ZKAPP_STATE_FIELDS; i++) {
        this.constraints.push(Constraint.Equals.disabled(Field.empty()))
      }
    }

    if(this.constraints.length !== MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('invariant broken');
    }
  }

  static empty(): GenericStateConstraints {
    return new GenericStateConstraints([]);
  }
}

export class GenericStateUpdates {
  constructor(
    public updates: Update<Field>[]
  ) {
    if(this.updates.length > MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('exceeded maximum number of state constraints');
    }

    if(this.updates.length < MAX_ZKAPP_STATE_FIELDS) {
      for(let i = this.updates.length; i < MAX_ZKAPP_STATE_FIELDS; i++) {
        this.updates.push(Update.disabled(Field.empty()))
      }
    }

    if(this.updates.length !== MAX_ZKAPP_STATE_FIELDS) {
      throw new Error('invariant broken');
    }
  }

  static empty(): GenericStateUpdates {
    return new GenericStateUpdates([]);
  }
}
