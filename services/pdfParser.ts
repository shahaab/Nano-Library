/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//- Fix: Corrected module import path for types.
import type { Page } from '../types';
declare const pdfjsLib: any;

export const parsePdf = async (file: File): Promise<Page[]> => {
    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
        fileReader.onload = async function() {
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
