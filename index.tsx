/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Add a declaration for pdfjsLib to resolve the "Cannot find name 'pdfjsLib'" error.
// This assumes pdfjs-dist is loaded globally, e.g., via a script tag.
declare const pdfjsLib: any;

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
