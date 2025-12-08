import { Bool, Field, Provable } from 'o1js';

export {
  checkIfSolved,
  compressCombinationDigits,
  deserializeClue,
  getClueFromGuess,
  getElementAtIndex,
  separateCombinationDigits,
  serializeClue,
  updateElementAtIndex,
  validateCombination,
};

/**
 * Separates a four-digit Field value into its individual digits.
 *
 * @param combination - The four-digit Field to be separated.
 * @returns An array of four Field digits representing the separated digits.
 *
 * @throws Will throw an error if the combination is not a four-digit number.
 *
 * @note The function first asserts that the input is a valid four-digit Field.
 *       The digits are then witnessed, and their correctness is asserted by re-compressing
 *       them back into the original combination and ensuring equality.
 */
function separateCombinationDigits(combination: Field) {
  // Assert that the combination is a four-digit Field
  const isFourDigit = combination.greaterThanOrEqual(1000).and(combination.lessThanOrEqual(9999));
  isFourDigit.assertTrue('The combination must be a four-digit Field!');

  // Witness single digits of the combination
  const digits = Provable.witness(Provable.Array(Field, 4), () => {
    const num = combination.toBigInt();
    return [num / 1000n, (num / 100n) % 10n, (num / 10n) % 10n, num % 10n];
  });

  // Assert the correctness of the witnessed digit separation
  compressCombinationDigits(digits).assertEquals(combination);

  return digits;
}

/**
 * Combines an array of four digits into a single Field value.
 *
 * @note An additional check to ensure that the input has exactly four digits would typically be necessary.
 * However, since this function is primarily used within {@link separateCombinationDigits}, the input is
 * already validated as a four-digit Field array by `Provable.Array(Field, 4)`, which inherently ensures the array has a length of 4.
 *
 * @param combinationDigits - An array of four Field digits.
 * @returns The combined Field element representing the original four-digit number.
 */
function compressCombinationDigits(combinationDigits: Field[]) {
  return combinationDigits[0]
    .mul(1000)
    .add(combinationDigits[1].mul(100))
    .add(combinationDigits[2].mul(10))
    .add(combinationDigits[3]);
}

/**
 * Validates the combination digits to ensure they meet the game rules.
 *
 * @param combinationDigits - An array of four Field digits representing the combination.
 *
 * @throws Will throw an error if any digit (except the first) is 0 or if any digits are not unique.
 *
 * @note The first digit is not checked for 0 because it would reduce the combination to a 3-digit value.
 *       The combination digits are provided by {@link separateCombinationDigits}, which ensures they form
 *       a valid four-digit number.
 */
function validateCombination(combinationDigits: Field[]) {
  for (let i = 1; i < 4; i++) {
    // Ensure the digit is not zero (only for digits 2, 3, and 4)
    combinationDigits[i].equals(0).assertFalse(`Combination digit ${i + 1} should not be zero!`);

    // Ensure the digits are unique
    for (let j = i; j < 4; j++) {
      combinationDigits[i - 1].assertNotEquals(
        combinationDigits[j],
        `Combination digit ${j + 1} is not unique!`
      );
    }
  }
}

/**
 * Serializes an array of Field elements representing a clue into a single Field
 * Each clue element is converted to 2 bits and then combined into a single Field.
 *
 * @param clue - An array of 4 Field elements, each representing a part of the clue.
 * @returns - A single Field representing the serialized clue.
 */
function serializeClue(clue: Field[]): Field {
  const clueBits = clue.map((f) => f.toBits(2)).flat();
  const serializedClue = Field.fromBits(clueBits);

  return serializedClue;
}

/**
 * Deserializes a Field into an array of Field elements, each representing a part of the clue.
 * The serialized clue is split into 2-bit segments to retrieve the original clue elements.
 *
 * @note This function is not used within a zkApp itself but is utilized for reading and deserializing
 * on-chain stored data, as well as verifying integrity during integration tests.
 *
 * @param serializedClue - A Field representing the serialized clue.
 * @returns - An array of 4 Field elements representing the deserialized clue.
 */
function deserializeClue(serializedClue: Field): Field[] {
  const bits = serializedClue.toBits(8);
  const clueA = Field.fromBits(bits.slice(0, 2));
  const clueB = Field.fromBits(bits.slice(2, 4));
  const clueC = Field.fromBits(bits.slice(4, 6));
  const clueD = Field.fromBits(bits.slice(6, 8));

  return [clueA, clueB, clueC, clueD];
}

/**
 * Compares the guess with the solution and returns a clue indicating hits and blows.
 * A "hit" is when a guess digit matches a solution digit in both value and position.
 * A "blow" is when a guess digit matches a solution digit in value but not position.
 *
 * @param guess - The array representing the guessed combination.
 * @param solution - The array representing the correct solution.
 * @returns - An array where each element represents the clue for a corresponding guess digit.
 *                           2 indicates a "hit" and 1 indicates a "blow".
 */
function getClueFromGuess(guess: Field[], solution: Field[]) {
  let clue = Array.from({ length: 4 }, () => Field(0));

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const isEqual = guess[i].equals(solution[j]).toField();
      if (i === j) {
        clue[i] = clue[i].add(isEqual.mul(2)); // 2 for a hit (correct digit and position)
      } else {
        clue[i] = clue[i].add(isEqual); // 1 for a blow (correct digit, wrong position)
      }
    }
  }

  return clue;
}

/**
 * Determines if the secret combination is solved based on the given clue.
 *
 * @param clue - An array representing the clues for each guess.
 * @returns Returns true if all clues indicate a "hit" (2), meaning the secret is solved.
 */
function checkIfSolved(clue: Field[]) {
  let isSolved = Bool(true);

  for (let i = 0; i < 4; i++) {
    let isHit = clue[i].equals(2);
    isSolved = isSolved.and(isHit);
  }

  return isSolved;
}

/**
 * Retrieves the `Field` element at a specified index from an array of `Field` elements.
 * Ensures that only one element matches the provided index and throws an error if none or multiple match.
 *
 * @param fieldArray - An array of `Field` elements.
 * @param index - The index of the element to retrieve as a `Field`.
 * @returns - The `Field` element at the specified index.
 * @throws Will throw an error if the index is out of bounds or if multiple indices match.
 */
function getElementAtIndex(fieldArray: Field[], index: Field): Field {
  const length = fieldArray.length;
  let totalIndexMatch = Field(0);
  let selectedValue = Field(0);

  // Iterate through the array and match the element at the given index
  for (let i = 0; i < length; i++) {
    const isMatch = index.equals(Field(i)).toField(); // `1` if index matches, otherwise `0`
    const matchingValue = isMatch.mul(fieldArray[i]); // Retain value only if index matches

    selectedValue = selectedValue.add(matchingValue); // Accumulate the matching value
    totalIndexMatch = totalIndexMatch.add(isMatch); // Track if exactly one index matched
  }

  // Ensure that exactly one index matched
  const errorMessage = 'Invalid index: Index out of bounds or multiple indices match!';
  totalIndexMatch.assertEquals(1, errorMessage);

  return selectedValue; // Return the selected value
}

/**
 * Updates an array of `Field` elements at a specified index with a new value.
 * Ensures the index is within bounds and updates only the specified element, while retaining all others.
 *
 * @param newValue - The new `Field` value to insert at the specified index.
 * @param fieldArray - The current array of `Field` elements.
 * @param index - The index at which to update the array.
 * @returns - The updated array of `Field` elements with the new value at the specified index.
 * @throws Will throw an error if the index is out of bounds.
 */
function updateElementAtIndex(newValue: Field, fieldArray: Field[], index: Field): Field[] {
  // Ensure that the index is within bounds
  const errorMessage = 'Invalid index: Index out of bounds!';
  index.assertLessThan(fieldArray.length, errorMessage);

  let updatedFieldArray: Field[] = [];

  // Iterate through the array and update the element at the specified index
  for (let i = 0; i < fieldArray.length; i++) {
    updatedFieldArray[i] = Provable.if(
      index.equals(i), // If current index matches the target index
      newValue, // Update with the new value
      fieldArray[i] // Otherwise, retain the original value
    );
  }

  return updatedFieldArray;
}
