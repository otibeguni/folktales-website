import type { IStory } from '@/types';

/**
 * Shuffles an array in place, using the Fisher-Yates algorithm.
 *
 * @param {array} array The array to shuffle.
 * @return {array} The shuffled array.
 *
 * @example
 * const myArray = [1, 2, 3];
 * shuffle(myArray);
 * console.log(myArray); // [2, 3, 1]
 */
function shuffle(array: Array<{ frontmatter: IStory }>) {
  let currentIndex = array.length;
  while (currentIndex--) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export { shuffle };
