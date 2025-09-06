/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Uses localStorage for persistent caching across browser sessions.

const CACHE_PREFIX = 'book-illustration-cache-';

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
 * Retrieves a cached image from localStorage.
 * @param bookTitle The title of the book.
 * @param pageNumber The page number.
 * @returns The base64 encoded image string, or null if not found.
 */
export function getCachedImage(bookTitle: string, pageNumber: number): string | null {
  try {
    return localStorage.getItem(getKey(bookTitle, pageNumber));
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return null;
  }
}

/**
 * Saves an image to localStorage.
 * @param bookTitle The title of the book.
 * @param pageNumber The page number.
 * @param image The base64 encoded image string to save.
 */
export function setCachedImage(bookTitle: string, pageNumber: number, image: string): void {
  try {
    localStorage.setItem(getKey(bookTitle, pageNumber), image);
  } catch (error) {
    console.error("Failed to write to localStorage:", error);
  }
}
