/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//- Fix: Corrected module import path for types.
import type { PageAsset } from '../types';

// Uses localStorage for persistent caching of page assets (image and prompts).

const CACHE_PREFIX = 'book-asset-cache-';

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
 * Retrieves a cached asset from localStorage.
 * @param bookTitle The title of the book.
 * @param pageNumber The page number.
 * @returns The PageAsset object, or null if not found.
 */
export function getCachedAsset(bookTitle: string, pageNumber: number): PageAsset | null {
  try {
    const data = localStorage.getItem(getKey(bookTitle, pageNumber));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return null;
  }
}

/**
 * Saves an asset to localStorage.
 * @param bookTitle The title of the book.
 * @param pageNumber The page number.
 * @param asset The PageAsset object to save.
 */
export function setCachedAsset(bookTitle: string, pageNumber: number, asset: PageAsset): void {
  try {
    localStorage.setItem(getKey(bookTitle, pageNumber), JSON.stringify(asset));
  } catch (error) {
    console.error("Failed to write to localStorage:", error);
  }
}