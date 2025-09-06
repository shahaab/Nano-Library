/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Book } from '../types.ts';
import { getCachedImage, setCachedImage } from '../services/imageCache.ts';

interface BookViewProps {
  book: Book;
  onBack: () => void;
}

export default function BookView({ book, onBack }: BookViewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);

  const currentPage = book.pages[currentPageIndex];

  useEffect(() => {
    // Check cache for image when page changes
    const cachedImage = getCachedImage(book.title, currentPage.pageNumber);
    setGeneratedImage(cachedImage);
  }, [currentPageIndex, book.title, currentPage.pageNumber]);

  const handleGenerateImage = async () => {
    if (!currentPage) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const prompt = `Create a simple, elegant, minimalist, and kid-friendly illustration for the following text from a story book. The illustration should be in a watercolor style, centered on a white background. Text: "${currentPage.text}"`;

      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64Image = response.generatedImages[0].image.imageBytes;
        setGeneratedImage(base64Image);
        setCachedImage(book.title, currentPage.pageNumber, base64Image);
      } else {
        setError('Could not generate an image. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred while generating the image.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const changePage = (direction: 'left' | 'right') => {
    if (animationDirection) return; // Prevent changing page during animation

    setAnimationDirection(direction);

    setTimeout(() => {
      if (direction === 'right') {
        setCurrentPageIndex((prev) => Math.min(book.pages.length - 1, prev + 1));
      } else {
        setCurrentPageIndex((prev) => Math.max(0, prev - 1));
      }
      setAnimationDirection(null); // Reset animation state
    }, 500); // Match animation duration
  };

  return (
    <div className="book-view">
      <button onClick={onBack} className="button back-button">
        &larr; Back to Library
      </button>
      <h2>{book.title}</h2>
      <div className="open-book">
         {/* Left Page (Text) */}
        <div 
          className={`page left ${animationDirection === 'right' ? 'slide-out-left' : ''} ${animationDirection === 'left' ? 'slide-in-left' : ''}`}
        >
          <div className="page-text">
            <p>{currentPage.text}</p>
          </div>
          <div className="page-controls">
            <button
              onClick={() => changePage('left')}
              disabled={currentPageIndex === 0 || !!animationDirection}
              className="button"
            >
              Previous Page
            </button>
            <span>
              Page {currentPage.pageNumber}
            </span>
          </div>
        </div>
        
        {/* Right Page (Illustration) */}
        <div 
            className={`page right ${animationDirection === 'left' ? 'slide-out-right' : ''} ${animationDirection === 'right' ? 'slide-in-right' : ''}`}
        >
          <div className="page-illustration">
            {isGenerating ? (
              <div className="illustration-placeholder">
                <p>Illustrating...</p>
              </div>
            ) : generatedImage ? (
              <img
                src={`data:image/jpeg;base64,${generatedImage}`}
                alt={`Illustration for page ${currentPage.pageNumber}`}
              />
            ) : (
              <div className="illustration-placeholder">
                <button
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  className="button"
                >
                  Illustrate this page
                </button>
              </div>
            )}
            {error && <p className="error">{error}</p>}
          </div>
           <div className="page-controls">
             <span></span> {/* Spacer */}
            <button
              onClick={() => changePage('right')}
              disabled={currentPageIndex === book.pages.length - 1 || !!animationDirection}
              className="button"
            >
              Next Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
