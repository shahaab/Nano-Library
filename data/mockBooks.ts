/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//- Fix: Corrected module import path for types.
import type { Book } from '../types';

export const initialBooks: Book[] = [
  {
    title: 'The Great Gatsby',
    cover: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/The_Great_Gatsby_Cover_1925_Retouched.jpg',
    pages: [
        { pageNumber: 1, text: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.", wordCount: 23 },
        { pageNumber: 2, text: "'Whenever you feel like criticizing any one,' he told me, 'just remember that all the people in this world haven't had the advantages that you've had.'", wordCount: 29 },
        { pageNumber: 3, text: "He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that.", wordCount: 29 },
    ],
  },
  {
    title: 'Moby Dick',
    cover: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Moby-Dick_FE_title_page.jpg',
    pages: [
      { pageNumber: 1, text: 'Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.', wordCount: 42 },
      { pageNumber: 2, text: 'It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet—then, I account it high time to get to sea as soon as I can.', wordCount: 71 },
    ],
  },
];
