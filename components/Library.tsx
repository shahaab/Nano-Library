/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
//- Fix: Corrected module import path for types.
import type { Book } from '../types';
import { parsePdf } from '../services/pdfParser';

interface LibraryProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddBook: (book: Book) => void;
}

export default function Library({ books, onSelectBook, onAddBook }: LibraryProps) {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPdfFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleAddBook = async () => {
        if (!pdfFile) return;
        setIsParsing(true);
        setError(null);
        try {
            const pages = await parsePdf(pdfFile);
            const newBook: Book = {
                title: pdfFile.name.replace(/\.pdf$/i, ''),
                cover: '', // No cover for uploaded books initially
                pages,
            };
            onAddBook(newBook);
            setPdfFile(null); // Clear file input
            // Clear the file input visually
            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
        } catch (err) {
            console.error("Failed to parse PDF:", err);
            setError("Sorry, there was an error reading your PDF file.");
        } finally {
            setIsParsing(false);
        }
    };

  return (
    <>
      <h1>My Little Library</h1>
      <div className="library">
        {books.map((book, index) => (
          <div key={`${book.title}-${index}`} className="book" onClick={() => onSelectBook(book)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelectBook(book)}>
            <img src={book.cover || 'https://placehold.co/200x280/e0e0e0/777?text=My+Book'} alt={`${book.title} cover`} className="book-cover" />
            <h3 className="book-title">{book.title}</h3>
          </div>
        ))}
      </div>
       <div className="add-book">
            <h2>Add Your Own Book</h2>
            <input id="file-input" type="file" accept=".pdf" onChange={handleFileChange} aria-label="Upload a PDF book" />
            {error && <p style={{color: 'red'}}>{error}</p>}
            <button onClick={handleAddBook} disabled={!pdfFile || isParsing} className="button">
                {isParsing ? 'Processing...' : 'Add to Library'}
            </button>
        </div>
    </>
  );
}
