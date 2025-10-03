import { Bool, Character, Provable, CircuitString, Field } from 'o1js';
import { describe, test } from 'node:test';
import { expect } from 'expect';

describe('Circuit String', () => {
  describe('#equals', () => {
    test('returns true when values are equal', async () => {
      const str = CircuitString.fromString(
        'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth'
      );
      const same_str = CircuitString.fromString(
        'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth'
      );
      expect(str.equals(same_str)).toEqual(Bool(true));

      await Provable.runAndCheck(() => {
        const str = CircuitString.fromString(
          'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth'
        );
        const same_str = CircuitString.fromString(
          'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth'
        );
        expect(str.equals(same_str)).toEqual(Bool(true));
      });
    });

    test('returns false when values are not equal', async () => {
      const str = CircuitString.fromString('Your size');
      const not_same_str = CircuitString.fromString('size');

      expect(str.equals(not_same_str)).toEqual(Bool(false));

      Provable.runAndCheck(() => {
        const str = Provable.witness(CircuitString, () => 'Your size');
        const not_same_str = Provable.witness(CircuitString, () => 'size');
        Provable.asProver(() => {
          expect(str.equals(not_same_str).toBoolean()).toEqual(false);
        });
      });
    });
  });

  describe('#toString', () => {
    test('serializes to string', async () => {
      const js_str =
        'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth';
      const str = CircuitString.fromString(js_str);
      expect(str.toString()).toBe(js_str);

      await Provable.runAndCheck(() => {
        const js_str =
          'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth';
        const str = CircuitString.fromString(js_str);
        expect(str.toString()).toBe(js_str);
      });
    });
  });

  describe('#substring', () => {
    test('selects substring', async () => {
      const str = CircuitString.fromString(
        'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth'
      );
      expect(str.substring(46, 80).toString()).toBe('Everything we see is a perspective');

      await Provable.runAndCheck(() => {
        const str = CircuitString.fromString(
          'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth'
        );
        expect(str.substring(46, 80).toString()).toBe('Everything we see is a perspective');
      });
    });
  });

  describe('#append', () => {
    test('appends 2 strings', async () => {
      const str1 = CircuitString.fromString('abcd');
      const str2 = CircuitString.fromString('efgh');
      expect(str1.append(str2).toString()).toBe('abcdefgh');

      await Provable.runAndCheck(() => {
        const str1 = CircuitString.fromString('abcd');
        const str2 = CircuitString.fromString('efgh');
        expect(str1.append(str2).toString()).toBe('abcdefgh');
      });
    });
  });

  describe('#length', () => {
    test('length', async () => {
      const str1 = CircuitString.fromString('abcd');
      expect(str1.length()).toEqual(Field(4));

      await Provable.runAndCheck(() => {
        const str1 = CircuitString.fromString('abcd');
        expect(str1.length()).toEqual(Field(4));
      });
    });
  });

  describe.skip('with invalid input', () => {
    test('cannot use a character out of range', () => {
      expect(() => {
        Provable.runAndCheck(() => {
          Provable.witness(CircuitString, () => {
            return CircuitString.fromCharacters([
              new Character(Field(100)),
              new Character(Field(10000)),
              new Character(Field(100)),
            ]);
          });
        });
      }).rejects.toThrow();
    });
  });
});
