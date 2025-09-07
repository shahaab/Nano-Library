/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Book, Page, PageAsset } from '../types';
import { getCachedAsset, setCachedAsset } from '../services/imageCache';
import { getCachedSound, setCachedSound } from '../services/soundCache';
import { ELEVENLABS_API_KEY } from '../config';

interface BookViewProps {
  book: Book;
  onBack: () => void;
}

// Helper component for the content of the right page (illustration and audio)
const IllustrationPageContent = ({ page, asset, isLoading, error, onGenerateSound, isLoadingAudio, isPlayingAudio }: any) => {
    if (!page) return null;

    // This component should ONLY show loading, error, or the generated asset.
    // It should never show the page text.

    if (isLoading) {
        return <div className="loading">Generating illustration...</div>;
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    if (asset?.image) {
        return (
            <div className="right-page-content">
                <img src={`data:image/jpeg;base64,${asset.image}`} alt={`Illustration for page ${page.pageNumber}`} className="page-illustration" />
                <button onClick={onGenerateSound} disabled={!ELEVENLABS_API_KEY || isLoadingAudio || isPlayingAudio} className={`audio-icon-button ${isLoadingAudio ? 'loading' : ''}`}>
                    <svg viewBox="0 0 24 24">
                        {isLoadingAudio ? (
                           <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
                        ) : isPlayingAudio ? (
                           <path d="M6 18h4V6H6v12zm8-12v12h4V6h-4z"/>
                        ) : (
                           <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        )}
                    </svg>
                </button>
            </div>
        );
    }

    // Return null if there's no asset and we're not loading (e.g., initial state)
    return null;
};


export default function BookView({ book, onBack }: BookViewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [assets, setAssets] = useState<(PageAsset | null)[]>(() => new Array(book.pages.length).fill(null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | ''>('');

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPage = book.pages[currentPageIndex];
  const currentAsset = assets[currentPageIndex];
  const nextPage = book.pages[currentPageIndex + 1];

  const fetchAssetForPage = async (pageIndex: number) => {
    const page = book.pages[pageIndex];
    if (!page || assets[pageIndex]) return;

    // Check cache first
    const cachedAsset = getCachedAsset(book.title, page.pageNumber);
    if (cachedAsset) {
        setAssets(prev => {
            const newAssets = [...prev];
            newAssets[pageIndex] = cachedAsset;
            return newAssets;
        });
        return;
    }
    
    // If not in cache, generate
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const contents = `Based on the following text from a page in the book "${book.title}", generate a short, descriptive prompt for an illustration and a prompt for a sound effect. The text is: "${page.text}"`;

      const promptGenerationResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { imagePrompt: { type: Type.STRING }, soundEffectPrompt: { type: Type.STRING } },
            required: ['imagePrompt', 'soundEffectPrompt'],
          },
        }
      });
      const prompts = JSON.parse(promptGenerationResponse.text);
      
      const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `children's storybook illustration, ${prompts.imagePrompt}`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3' },
      });
      const image = imageResponse.generatedImages[0].image.imageBytes;

      const newAsset: PageAsset = { image, soundEffectPrompt: prompts.soundEffectPrompt };
      
      setCachedAsset(book.title, page.pageNumber, newAsset);
      setAssets(prev => {
        const newAssets = [...prev];
        newAssets[pageIndex] = newAsset;
        return newAssets;
      });

    } catch (e) {
      console.error(`Error generating assets for page ${page.pageNumber}:`, e);
      setError("Could not generate illustration for this page.");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchAssetForPage(currentPageIndex).finally(() => setIsLoading(false));
    // Prefetch next page
    if (currentPageIndex + 1 < book.pages.length) {
      fetchAssetForPage(currentPageIndex + 1);
    }
  }, [currentPageIndex, book.title]);


  const handleGenerateSound = async () => {
    if (!currentAsset) return;

    if (!ELEVENLABS_API_KEY) {
        setError("ElevenLabs API key is not configured. Please add it to config.ts.");
        return;
    }

    const cachedSound = getCachedSound(book.title, currentPage.pageNumber);
    if (cachedSound) {
        playAudio(cachedSound);
        return;
    }

    setIsLoadingAudio(true);
    setError(null);
    try {
        const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
            method: "POST",
            headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ "text": currentAsset.soundEffectPrompt, "duration_seconds": 10 }),
        });
        if (!response.ok) throw new Error(`ElevenLabs API error: ${response.statusText}`);

        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setCachedSound(book.title, currentPage.pageNumber, dataUrl);
            playAudio(dataUrl);
        };
        reader.readAsDataURL(blob);
    } catch (e) {
        console.error("Error generating sound:", e);
        setError("Could not generate sound effect.");
    } finally {
        setIsLoadingAudio(false);
    }
  };

  const playAudio = (audioDataUrl: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioDataUrl);
    audio.play();
    audio.onplay = () => { setIsLoadingAudio(false); setIsPlayingAudio(true); };
    audio.onended = () => setIsPlayingAudio(false);
    audioRef.current = audio;
  };

  const handleFlipEnd = () => {
    if (flipDirection === 'next') {
        setCurrentPageIndex(prev => prev + 1);
    } else if (flipDirection === 'prev') {
        setCurrentPageIndex(prev => prev - 1);
    }
    setIsFlipping(false);
    setFlipDirection('');
  };
  
  const goToNextPage = () => {
    if (isFlipping || currentPageIndex >= book.pages.length - 1) return;
    setIsFlipping(true);
    setFlipDirection('next');
  };

  const goToPreviousPage = () => {
    if (isFlipping || currentPageIndex <= 0) return;
    setIsFlipping(true);
    setFlipDirection('prev');
  };

  const flipperClass = isFlipping
    ? flipDirection === 'next' ? 'flipping-next' : 'flipping-prev'
    : flipDirection === 'prev' ? 'prev' : '';

  return (
    <div className="book-view">
      <div className="book-header">
        <button className="button back-button" onClick={onBack}>&larr; Back to Library</button>
        <h2>{book.title}</h2>
      </div>

      <div className="open-book-container">
        <div className="open-book">
            <div className="page left-page">
                {isFlipping && flipDirection === 'prev' ? (
                     <p className="page-text">{book.pages[currentPageIndex - 1]?.text}</p>
                ) : (
                     <p className="page-text">{currentPage?.text}</p>
                )}
                 <span className="page-number">Page {isFlipping && flipDirection === 'prev' ? currentPage.pageNumber -1 : currentPage.pageNumber}</span>
            </div>
            <div className="page right-page">
                 {/* This is the static content that's visible when not flipping */}
                 <IllustrationPageContent 
                    page={currentPage} 
                    asset={currentAsset}
                    isLoading={isLoading}
                    error={error}
                    onGenerateSound={handleGenerateSound}
                    isLoadingAudio={isLoadingAudio}
                    isPlayingAudio={isPlayingAudio}
                 />

                {/* The Flipper element for animation */}
                <div className={`flipper ${flipperClass}`} onTransitionEnd={handleFlipEnd}>
                    <div className="flipper-face flipper-front">
                        {/* Front of the page we are turning (the illustration) */}
                         <IllustrationPageContent 
                            page={currentPage}
                            asset={currentAsset}
                            isLoading={isLoading}
                            error={error}
                         />
                    </div>
                    <div className="flipper-face flipper-back">
                       {/* Back of the page we are turning (the next text page) */}
                       <p className="page-text">{nextPage?.text}</p>
                       <span className="page-number">Page {nextPage?.pageNumber}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="pagination">
        <button className="button" onClick={goToPreviousPage} disabled={isFlipping || currentPageIndex === 0}>Previous Page</button>
        <span>Page {currentPageIndex + 1} of {book.pages.length}</span>
        <button className="button" onClick={goToNextPage} disabled={isFlipping || currentPageIndex === book.pages.length - 1}>Next Page</button>
      </div>
    </div>
  );
}