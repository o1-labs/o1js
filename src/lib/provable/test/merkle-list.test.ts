import { Field, MerkleList, Poseidon } from 'o1js';

describe('Merkle List and Iterator', () => {
  describe('primitive data structures', () => {
    const emptyHash = Poseidon.hash([Field(0)]);
    const nextHash = (hash: Field, value: Field) =>
      Poseidon.hash([hash, value]);
    class List extends MerkleList.create(Field, nextHash, emptyHash) {}

    describe('should initialize same hash', () => {
      it('empty hash', () => {
        let l1 = List.empty();
        l1.hash.assertEquals(emptyHash);

        let l2 = List.from([]);
        l2.hash.assertEquals(emptyHash);
      });
    });

    describe('should hash correctly', () => {
      it('empty hash', () => {
        let l1 = List.from([Field(1), Field(2)]);
        let l1Hash = l1.hash;

        let l2 = List.empty();
        l2.push(Field(1));
        l2.push(Field(2));
        let l2Hash = l2.hash;

        l1Hash.assertEquals(l2Hash);
      });
    });

    describe('pop and previous should behave the same', () => {
      it('empty hash', () => {
        let l1 = List.from([Field(1), Field(2)]);
        let l2 = l1.clone();

        let iter = l1.startIteratingFromLast();

        for (let i = 0; i < 8; i++) {
          let e1 = iter.previous();
          let e2 = l2.pop();
          e1.assertEquals(e2);
        }

        l2.hash.assertEquals(emptyHash);
      });
    });

    describe('list and iterator traversal', () => {
      it('should traverse forth and back', () => {
        let list = List.from([Field(1), Field(2), Field(3)]);
        let iter = list.startIterating();

        // is at beginning, previous element is dummy
        iter.previous().assertEquals(Field(0));

        iter.next().assertEquals(Field(1));
        iter.next().assertEquals(Field(2));
        iter.next().assertEquals(Field(3));
        iter.next().assertEquals(Field(0));
        // reverse traversal
        iter.previous().assertEquals(Field(3));
        iter.previous().assertEquals(Field(2));
        iter.previous().assertEquals(Field(1));
        iter.previous().assertEquals(Field(0));
        // reverse, again
        iter.next().assertEquals(Field(1));
        iter.next().assertEquals(Field(2));
        iter.next().assertEquals(Field(3));
        iter.next().assertEquals(Field(0));
      });

      it('should traverse back and forth', () => {
        let list = List.from([Field(1), Field(2), Field(3)]);
        let iter = list.startIteratingFromLast();

        // is at end, next element is dummy
        iter.next().assertEquals(Field(0));

        iter.previous().assertEquals(Field(3));
        iter.previous().assertEquals(Field(2));
        iter.previous().assertEquals(Field(1));
        iter.previous().assertEquals(Field(0));
        // reverse traversal
        iter.next().assertEquals(Field(1));
        iter.next().assertEquals(Field(2));
        iter.next().assertEquals(Field(3));
        iter.next().assertEquals(Field(0));
        // reverse, again
        iter.previous().assertEquals(Field(3));
        iter.previous().assertEquals(Field(2));
        iter.previous().assertEquals(Field(1));
        iter.previous().assertEquals(Field(0));
      });
    });
  });
});
