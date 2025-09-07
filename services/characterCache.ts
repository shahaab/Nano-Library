/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

//- Fix: Corrected module import path for types.
import type { Character } from '../types';

// Uses localStorage for persistent caching of character data.

const CACHE_PREFIX = 'book-character-cache-';

/**
 * Generates a unique key for localStorage based on book title.
 * @param bookTitle The title of the book.
 * @returns A unique string key.
 */
function getKey(bookTitle: string): string {
  // Sanitize title to create a valid key
  const sanitizedTitle = bookTitle.replace(/[^a-zA-Z0-9]/g, '-');
  return `${CACHE_PREFIX}${sanitizedTitle}`;
}

/**
 * Retrieves cached character data from localStorage.
 * @param bookTitle The title of the book.
 * @returns The array of Character objects, or null if not found or on error.
 */
export function getCachedCharacters(bookTitle: string): Character[] | null {
  try {
    const cachedData = localStorage.getItem(getKey(bookTitle));
    if (cachedData) {
      return JSON.parse(cachedData) as Character[];
    }
    return null;
  } catch (error) {
    console.error("Failed to read or parse character data from localStorage:", error);
    return null;
  }
}

/**
 * Saves character data to localStorage.
 * @param bookTitle The title of the book.
 * @param characters The array of Character objects to save.
 */
export function setCachedCharacters(bookTitle: string, characters: Character[]): void {
  try {
    localStorage.setItem(getKey(bookTitle), JSON.stringify(characters));
  } catch (error) {
    console.error("Failed to write character data to localStorage:", error);
  }
}
