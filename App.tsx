/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import Library from './components/Library.tsx';
import BookView from './components/BookView.tsx';
import { initialBooks } from './data/mockBooks.ts';
import type { Book } from './types.ts';

export default function App() {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const handleAddBook = (newBook: Book) => {
    setBooks(prevBooks => [...prevBooks, newBook]);
    // Automatically select the newly added book
    setSelectedBook(newBook);
  };

  if (selectedBook) {
    return (
      <BookView
        book={selectedBook}
        onBack={() => setSelectedBook(null)}
      />
    );
  }

  return <Library books={books} onSelectBook={setSelectedBook} onAddBook={handleAddBook} />;
}
