/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from '@google/genai';
import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// FIX: Per coding guidelines, the API key must be read from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Add a declaration for pdfjsLib to resolve the "Cannot find name 'pdfjsLib'" error.
// This assumes pdfjs-dist is loaded globally, e.g., via a script tag.
declare const pdfjsLib: any;

// --- TYPES ---
interface Page {
  pageNumber: number;
  text: string;
  wordCount: number;
}

interface Book {
  title: string;
  cover: string;
  pages: Page[];
}


// --- MOCK DATA ---
const initialBooks: Book[] = [
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

// --- UTILITY FUNCTIONS ---
const parsePdf = async (file: File): Promise<Page[]> => {
    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
        fileReader.onload = async function() {
            // FIX: Cast this.result to ArrayBuffer. reader.readAsArrayBuffer guarantees the result is an ArrayBuffer.
            const typedarray = new Uint8Array(this.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const pages: Page[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map((item: any) => item.str).join(' ');
                const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
                pages.push({
                    pageNumber: i,
                    text: text.trim(),
                    wordCount: wordCount
                });
            }
            resolve(pages);
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
};


// --- COMPONENTS ---
function BookView({ book, onBack, generatedImages, setGeneratedImages }: { book: Book, onBack: () => void, generatedImages: Record<string, string>, setGeneratedImages: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const pageKey = `${book.title}_${currentPage}`;
  const currentPageContent = book.pages[currentPage];

  const generateImage = useCallback(async () => {
    if (!currentPageContent?.text || generatedImages[pageKey]) return;

    setIsLoading(true);
    try {
        // FIX: Use `generateImages` with an image generation model (`imagen-4.0-generate-001`) for text-to-image tasks,
        // as it is more appropriate than using an image editing model with only text input.
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Generate an illustration for the following text from a book, in a classic, slightly faded storybook style: "${currentPageContent.text}"`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            setGeneratedImages(prev => ({ ...prev, [pageKey]: imageUrl }));
        }
    } catch (error) {
        console.error("Error generating image:", error);
        // Optionally set a placeholder error image
    } finally {
        setIsLoading(false);
    }
  }, [currentPageContent, generatedImages, pageKey, setGeneratedImages]);

  useEffect(() => {
    generateImage();
  }, [currentPage, generateImage]);

  const handleNext = () => {
    if (currentPage < book.pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="book-view">
      <button onClick={onBack} className="button" style={{ alignSelf: 'flex-start' }}>
        &larr; Back to Library
      </button>
      <h2>{book.title}</h2>
      <div className="page-container">
        <div className="page-text">
          <p>{currentPageContent?.text}</p>
        </div>
        <div className="page-image" aria-live="polite">
          {isLoading && <div className="loading-spinner"></div>}
          {!isLoading && generatedImages[pageKey] && (
            <img src={generatedImages[pageKey]} alt={`Illustration for page ${currentPage + 1}`} />
          )}
           {!isLoading && !generatedImages[pageKey] && (
            <p>No image generated yet.</p>
          )}
        </div>
      </div>
      <div className="navigation">
        <button onClick={handlePrev} disabled={currentPage === 0} className="button">
          Previous
        </button>
        <span className="page-number">Page {currentPage + 1} of {book.pages.length}</span>
        <button onClick={handleNext} disabled={currentPage >= book.pages.length - 1} className="button">
          Next
        </button>
      </div>
    </div>
  );
}

function Library({ books, onSelectBook, onAddBook }: { books: Book[], onSelectBook: (book: Book) => void, onAddBook: (book: Book) => void }) {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPdfFile(e.target.files[0]);
        }
    };

    const handleAddBook = async () => {
        if (!pdfFile) return;
        setIsParsing(true);
        try {
            const pages = await parsePdf(pdfFile);
            const newBook: Book = {
                title: pdfFile.name.replace(/\.pdf$/i, ''),
                cover: '', // Placeholder, maybe generate one later?
                pages,
            };
            onAddBook(newBook);
            setPdfFile(null); // Clear file input
        } catch (error) {
            console.error("Failed to parse PDF:", error);
            alert("Sorry, there was an error reading your PDF file.");
        } finally {
            setIsParsing(false);
        }
    };

  return (
    <>
      <h1>My Little Library</h1>
      <div className="library">
        {books.map((book, index) => (
          <div key={index} className="book" onClick={() => onSelectBook(book)} role="button" tabIndex={0}>
            <img src={book.cover || 'https://placehold.co/200x280/e0e0e0/777?text=My+Book'} alt={`${book.title} cover`} className="book-cover" />
            <h3 className="book-title">{book.title}</h3>
          </div>
        ))}
      </div>
       <div className="add-book">
            <h2>Add Your Own Book</h2>
            <input type="file" accept=".pdf" onChange={handleFileChange} aria-label="Upload a PDF book" />
            <button onClick={handleAddBook} disabled={!pdfFile || isParsing} className="button">
                {isParsing ? 'Processing...' : 'Add to Library'}
            </button>
        </div>
    </>
  );
}

function App() {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});

  const handleAddBook = (newBook: Book) => {
    setBooks(prevBooks => [...prevBooks, newBook]);
  };

  if (selectedBook) {
    return (
      <BookView
        book={selectedBook}
        onBack={() => setSelectedBook(null)}
        generatedImages={generatedImages}
        setGeneratedImages={setGeneratedImages}
      />
    );
  }

  return <Library books={books} onSelectBook={setSelectedBook} onAddBook={handleAddBook} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);