import { prefixes } from '../bindings/crypto/constants.js';
import { prefixToField } from '../bindings/lib/binable.js';
import {
  GenericProvableExtended,
  GenericSignableField,
} from '../bindings/lib/generic.js';

export { createEvents, dataAsHash };

type Poseidon<Field> = {
  update(state: Field[], input: Field[]): Field[];
};

function createEvents<Field>({
  Field,
  Poseidon,
}: {
  Field: GenericSignableField<Field>;
  Poseidon: Poseidon<Field>;
}) {
  type Event = Field[];

  type Events = {
    hash: Field;
    data: Event[];
  };

  // hashing helpers
  function initialState() {
    return [Field(0), Field(0), Field(0)] as [Field, Field, Field];
  }
  function salt(prefix: string) {
    return Poseidon.update(initialState(), [prefixToField(Field, prefix)]);
  }
  function hashWithPrefix(prefix: string, input: Field[]) {
    let init = salt(prefix);
    return Poseidon.update(init, input)[0];
  }
  function emptyHashWithPrefix(prefix: string) {
    return salt(prefix)[0];
  }

  const Events = {
    empty(): Events {
      let hash = emptyHashWithPrefix('MinaZkappEventsEmpty');
      return { hash, data: [] };
    },
    pushEvent(events: Events, event: Event): Events {
      let eventHash = hashWithPrefix(prefixes.event, event);
      let hash = hashWithPrefix(prefixes.events, [events.hash, eventHash]);
      return { hash, data: [event, ...events.data] };
    },
    fromList(events: Event[]): Events {
      return [...events].reverse().reduce(Events.pushEvent, Events.empty());
    },
    hash(events: Event[]) {
      return Events.fromList(events).hash;
    },
  };
  const EventsProvable = {
    ...Events,
    ...dataAsHash({
      empty: Events.empty,
      toValue(data: Field[][]) {
        return data.map((row) => row.map((e) => BigInt(Field.toJSON(e))));
      },
      fromValue(value: bigint[][]) {
        let data = value.map((row) =>
          row.map((e) => Field.fromJSON(e.toString()))
        );
        let hash = Events.hash(data);
        return { data, hash };
      },
      toJSON(data: Field[][]) {
        return data.map((row) => row.map((e) => Field.toJSON(e)));
      },
      fromJSON(json: string[][]) {
        let data = json.map((row) => row.map((e) => Field.fromJSON(e)));
        let hash = Events.hash(data);
        return { data, hash };
      },
    }),
  };

  const Actions = {
    // same as events but w/ different hash prefixes
    empty(): Events {
      let hash = emptyHashWithPrefix('MinaZkappActionsEmpty');
      return { hash, data: [] };
    },
    pushEvent(actions: Events, event: Event): Events {
      let eventHash = hashWithPrefix(prefixes.event, event);
      let hash = hashWithPrefix(prefixes.sequenceEvents, [
        actions.hash,
        eventHash,
      ]);
      return { hash, data: [event, ...actions.data] };
    },
    fromList(events: Event[]): Events {
      return [...events].reverse().reduce(Actions.pushEvent, Actions.empty());
    },
    hash(events: Event[]) {
      return this.fromList(events).hash;
    },
    // different than events
    emptyActionState() {
      return emptyHashWithPrefix('MinaZkappActionStateEmptyElt');
    },
    updateSequenceState(state: Field, sequenceEventsHash: Field) {
      return hashWithPrefix(prefixes.sequenceEvents, [
        state,
        sequenceEventsHash,
      ]);
    },
  };

  const ActionsProvable = {
    ...Actions,
    ...dataAsHash({
      empty: Actions.empty,
      toValue(data: Field[][]) {
        return data.map((row) => row.map((e) => BigInt(Field.toJSON(e))));
      },
      fromValue(value: bigint[][]) {
        let data = value.map((row) =>
          row.map((e) => Field.fromJSON(e.toString()))
        );
        let hash = Actions.hash(data);
        return { data, hash };
      },
      toJSON(data: Field[][]) {
        return data.map((row) => row.map((e) => Field.toJSON(e)));
      },
      fromJSON(json: string[][]) {
        let data = json.map((row) => row.map((e) => Field.fromJSON(e)));
        let hash = Actions.hash(data);
        return { data, hash };
      },
    }),
  };

  return { Events: EventsProvable, Actions: ActionsProvable };
}

function dataAsHash<T, V, J, Field>({
  empty,
  toValue,
  fromValue,
  toJSON,
  fromJSON,
}: {
  empty: () => { data: T; hash: Field };
  toValue: (value: T) => V;
  fromValue: (value: V) => { data: T; hash: Field };
  toJSON: (value: T) => J;
  fromJSON: (json: J) => { data: T; hash: Field };
}): GenericProvableExtended<{ data: T; hash: Field }, V, J, Field> {
  return {
    empty,
    sizeInFields() {
      return 1;
    },
    toFields({ hash }) {
      return [hash];
    },
    toAuxiliary(value) {
      return [value?.data ?? empty().data];
    },
    fromFields([hash], [data]) {
      return { data, hash };
    },
    toValue({ data }) {
      return toValue(data);
    },
    fromValue(value) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'data' in value &&
        'hash' in value
      ) {
        return value as { data: T; hash: Field };
      }
      return fromValue(value);
    },
    toJSON({ data }) {
      return toJSON(data);
    },
    fromJSON(json) {
      return fromJSON(json);
    },
    check() {},
    toInput({ hash }) {
      return { fields: [hash] };
    },
  };
}
