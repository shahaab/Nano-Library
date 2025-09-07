/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Uses localStorage for persistent caching of audio data as Base64 Data URLs.

const CACHE_PREFIX = 'book-sound-cache-';

/**
 * Generates a unique key for localStorage based on book title and page number.
 * @param bookTitle The title of the book.
 * @param pageNumber The page number.
 * @returns A unique string key.
 */
function getKey(bookTitle: string, pageNumber: number): string {
  // Sanitize title to create a valid key
  const sanitizedTitle = bookTitle.replace(/[^a-zA-Z0-9]/g, '-');
  return `${CACHE_PREFIX}${sanitizedTitle}-p${pageNumber}`;
}

/**
 * Retrieves a cached sound Data URL from localStorage.
 * @param bookTitle The title of the book.
 * @param pageNumber The page number.
 * @returns The audio Data URL string, or null if not found.
 */
export function getCachedSound(bookTitle: string, pageNumber: number): string | null {
  try {
    return localStorage.getItem(getKey(bookTitle, pageNumber));
  } catch (error) {
    console.error("Failed to read sound from localStorage:", error);
    return null;
  }
}

/**
 * Saves a sound Data URL to localStorage.
 * @param bookTitle The title of the book.
 * @param pageNumber The page number.
 * @param audioDataUrl The audio Data URL string to save.
 */
export function setCachedSound(bookTitle: string, pageNumber: number, audioDataUrl: string): void {
  try {
    localStorage.setItem(getKey(bookTitle, pageNumber), audioDataUrl);
  } catch (error) {
    console.error("Failed to write sound to localStorage:", error);
  }
}