/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useMemo } from 'react';
import type { Book, PageAsset, Character } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { getCachedAsset, setCachedAsset } from '../services/imageCache';
import { getCachedCharacters, setCachedCharacters } from '../services/characterCache';
import { getCachedSound, setCachedSound } from '../services/soundCache';
import { ELEVENLABS_API_KEY } from '../config'; // Import key from config file

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface BookViewProps {
  book: Book;
  onBack: () => void;
}

export default function BookView({ book, onBack }: BookViewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [asset, setAsset] = useState<PageAsset | null>(null);
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [isLoadingAsset, setIsLoadingAsset] = useState(false);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animation, setAnimation] = useState<'left' | 'right' | 'in' | null>('in');

  // Audio state
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const currentPage = useMemo(() => book.pages[currentPageIndex], [book, currentPageIndex]);

  // Bug Fix: Clear the initial 'in' animation to enable buttons.
  useEffect(() => {
    const timer = setTimeout(() => {
        if (animation === 'in') {
            setAnimation(null);
        }
    }, 600); // Match CSS animation duration
    return () => clearTimeout(timer);
  }, [animation]);

  // Effect to load assets and characters from cache
  useEffect(() => {
    setAsset(null);
    setError(null);
    setAudioStatus('idle');
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    const cachedAsset = getCachedAsset(book.title, currentPage.pageNumber);
    if (cachedAsset) {
      setAsset(cachedAsset);
    }
    
    const cachedChars = getCachedCharacters(book.title);
    if (cachedChars) {
      setCharacters(cachedChars);
    }
  }, [book.title, currentPage]);
  
  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        // The Data URL doesn't need revoking like a blob URL
      }
    };
  }, [currentAudio]);

  const handleGenerateAsset = async () => {
    setIsLoadingAsset(true);
    setError(null);
    try {
        const prompt = `Based on the following text, create a short prompt for an image generator and a short prompt for a sound effect generator. The image should be in a whimsical, children's storybook style. The sound effect should capture the mood of the scene. Provide the response as a JSON object with keys "image_prompt" and "sound_effect_prompt". Text: "${currentPage.text}"`;

        const promptResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        image_prompt: { type: Type.STRING },
                        sound_effect_prompt: { type: Type.STRING },
                    },
                    required: ["image_prompt", "sound_effect_prompt"]
                }
            }
        });

        const prompts = JSON.parse(promptResponse.text.trim());

        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompts.image_prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });
        
        const image = imageResponse.generatedImages[0].image.imageBytes;
        const newAsset: PageAsset = { image, soundEffectPrompt: prompts.sound_effect_prompt };
        setAsset(newAsset);
        setCachedAsset(book.title, currentPage.pageNumber, newAsset);
    } catch (e) {
      console.error(e);
      setError('Sorry, something went wrong while generating the page content.');
    } finally {
      setIsLoadingAsset(false);
    }
  };

  const handleGenerateSound = async () => {
      if (!asset) return;

      // Improvement: Check for the API key before making a call.
      if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === "YOUR_ELEVENLABS_API_KEY_HERE") {
          setError("Please add your ElevenLabs API key to the config.ts file.");
          return;
      }
      
      const cachedSoundUrl = getCachedSound(book.title, currentPage.pageNumber);
      if(cachedSoundUrl) {
        playAudio(cachedSoundUrl);
        return;
      }
      
      setAudioStatus('loading');
      setError(null);

      try {
        const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "text": asset.soundEffectPrompt,
                "duration_seconds": 5, // Keep sounds short
            }),
        });
        
        if(!response.ok) {
            throw new Error(`ElevenLabs API failed with status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        
        const readBlobAsDataURL = (blob: Blob): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        };

        const dataUrl = await readBlobAsDataURL(audioBlob);
        setCachedSound(book.title, currentPage.pageNumber, dataUrl);
        playAudio(dataUrl);

      } catch (e) {
          console.error(e);
          setError("Sorry, we couldn't generate the sound effect.");
          setAudioStatus('idle');
      }
  }
  
  const playAudio = (url: string) => {
    if (currentAudio) {
        currentAudio.pause();
    }
    const audio = new Audio(url);
    audio.onplay = () => setAudioStatus('playing');
    audio.onended = () => setAudioStatus('idle');
    audio.onpause = () => setAudioStatus('idle');
    audio.play();
    setCurrentAudio(audio);
  };

  const handleAnalyzeCharacters = async () => {
    setIsLoadingCharacters(true);
    setError(null);
    try {
      const fullText = book.pages.map(p => p.text).join('\n\n');
      const prompt = `Analyze the following text and list the main characters. For each character, provide a brief, one-sentence description suitable for a child. Here is the text:\n\n${fullText}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "The character's name." },
                description: { type: Type.STRING, description: "A one-sentence description of the character for a child." },
              },
              required: ["name", "description"]
            },
          },
        },
      });
      const characterList: Character[] = JSON.parse(response.text.trim());
      setCharacters(characterList);
      setCachedCharacters(book.title, characterList);
    } catch (e) {
      console.error(e);
      setError('Sorry, something went wrong while analyzing the characters.');
    } finally {
      setIsLoadingCharacters(false);
    }
  };
  
  const changePage = (direction: 'left' | 'right') => {
    if (animation) return;
    setAnimation(direction);

    setTimeout(() => {
        if (direction === 'right' && currentPageIndex < book.pages.length - 1) {
            setCurrentPageIndex(i => i + 1);
        } else if (direction === 'left' && currentPageIndex > 0) {
            setCurrentPageIndex(i => i - 1);
        }
        setAnimation(null);
    }, 600);
  };

  const getAnimationClass = (page: 'left' | 'right') => {
    if (!animation || animation === 'in') return '';
    if (animation === 'right') return page === 'left' ? 'slide-out-left' : 'slide-in-right';
    if (animation === 'left') return page === 'left' ? 'slide-in-left' : 'slide-out-right';
    return '';
  }

  const renderAudioIcon = () => {
    if (audioStatus === 'loading') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>
      );
    }
    if (audioStatus === 'playing') {
      return (
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M8 5v14l11-7z"/></svg>
    );
  }

  return (
    <div className="book-view">
      <div className="book-header">
        <button onClick={onBack} className="button back-button">&larr; Back to Library</button>
        <h2>{book.title}</h2>
        <div style={{width: '150px'}}></div>
      </div>
      
      {error && <p className="error-message">{error}</p>}

      <div className="open-book-container">
        <div className="open-book">
            <div className={`page left-page`}>
                <div className={`page-content-wrapper ${getAnimationClass('left')}`}>
                    <p className="page-text">{currentPage.text}</p>
                    <span className="page-number">{currentPage.pageNumber}</span>
                </div>
            </div>
            <div className={`page right-page`}>
                <div className={`page-content-wrapper ${getAnimationClass('right')}`}>
                    {isLoadingAsset ? (
                        <div className="loading">Generating...</div>
                    ) : asset ? (
                        <div className="right-page-content">
                            <img src={`data:image/jpeg;base64,${asset.image}`} alt={`Illustration for page ${currentPage.pageNumber}`} className="page-illustration" />
                            <button onClick={handleGenerateSound} disabled={audioStatus !== 'idle'} className={`audio-icon-button ${audioStatus}`}>
                               {renderAudioIcon()}
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleGenerateAsset} disabled={isLoadingAsset || !!animation} className="button">
                        ✨ Illustrate this Page
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      <div className="pagination">
        <button onClick={() => changePage('left')} disabled={currentPageIndex === 0 || !!animation} className="button">Previous</button>
        <span>Page {currentPageIndex + 1} of {book.pages.length}</span>
        <button onClick={() => changePage('right')} disabled={currentPageIndex === book.pages.length - 1 || !!animation} className="button">Next</button>
      </div>

      <div className="character-panel">
        <h3>Characters</h3>
        {isLoadingCharacters ? (
          <div className="loading">Analyzing characters...</div>
        ) : characters ? (
          <ul>
            {characters.map((char) => (
              <li key={char.name}><strong>{char.name}:</strong> {char.description}</li>
            ))}
          </ul>
        ) : (
          <button onClick={handleAnalyzeCharacters} disabled={isLoadingCharacters || !!animation} className="button">
            Analyze Characters
          </button>
        )}
      </div>
    </div>
  );
}