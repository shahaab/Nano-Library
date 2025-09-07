/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

//- Fix: Define the Page interface.
export interface Page {
  pageNumber: number;
  text: string;
  wordCount: number;
}

//- Fix: Define the Book interface.
export interface Book {
  title: string;
  cover: string;
  pages: Page[];
}

//- Fix: Define the PageAsset interface for generated content.
export interface PageAsset {
  image: string; // base64 string
  soundEffectPrompt: string;
}

//- Fix: Define the Character interface.
export interface Character {
  name: string;
  description: string;
}