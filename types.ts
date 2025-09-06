/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Page {
  pageNumber: number;
  text: string;
  wordCount: number;
}

export interface Book {
  title: string;
  cover: string;
  pages: Page[];
}
