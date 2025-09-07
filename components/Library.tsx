/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef } from 'react';
import type { Book } from '../types';
import { parsePdf } from '../services/pdfParser';
import { GoogleGenAI } from '@google/genai';

interface LibraryProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddBook: (book: Book) => void;
}

export default function Library({ books, onSelectBook, onAddBook }: LibraryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      setError(null);
      try {
        const pages = await parsePdf(file);
        const title = file.name.replace(/\.pdf$/i, '');

        // Generate a cover image for the new book
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A beautiful and compelling book cover for a story titled "${title}". Style: minimalist, elegant, evocative.`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '3:4', // Common book cover aspect ratio
            },
        });
        
        const coverImage = imageResponse.generatedImages[0].image.imageBytes;
        const coverDataUrl = `data:image/jpeg;base64,${coverImage}`;

        const newBook: Book = {
          title: title,
          cover: coverDataUrl,
          pages: pages,
        };
        onAddBook(newBook);
      } catch (error) {
        console.error('Error processing new book:', error);
        setError('Failed to add new book. Could not parse PDF or generate a cover.');
      } finally {
        setIsUploading(false);
        // Reset file input to allow uploading the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <h1>My Storybooks</h1>
      <div className="library">
        {books.map((book) => (
          <div key={book.title} className="book" onClick={() => onSelectBook(book)}>
            <img src={book.cover} alt={book.title} className="book-cover" />
            <div className="book-title">{book.title}</div>
          </div>
        ))}
      </div>
      <div className="add-book">
        <h2>Add Your Own Book</h2>
        <p>Upload a PDF to add it to your library. A unique cover will be generated for you!</p>
        <button className="button" onClick={handleAddClick} disabled={isUploading}>
          {isUploading ? 'Processing...' : 'Upload PDF'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          style={{ display: 'none' }}
        />
        {error && <p className="error-message" style={{marginTop: '1rem'}}>{error}</p>}
      </div>
    </>
  );
}