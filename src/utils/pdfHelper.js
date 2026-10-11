/**
 * Utility to load PDF.js from CDN and convert PDF first page to an image.
 */

let pdfjsPromise = null;

export const loadPdfJs = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));

  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    // Check if script already in document
    const existingScript = document.querySelector('script[data-pdfjs]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      });
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.setAttribute('data-pdfjs', 'true');

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js library failed to initialize'));
      }
    };

    script.onerror = () => {
      pdfjsPromise = null;
      reject(new Error('Failed to load PDF.js from CDN'));
    };

    document.head.appendChild(script);
  });

  return pdfjsPromise;
};

/**
 * Checks if a file or URL represents a PDF
 */
export const isPdfFile = (fileOrUrl) => {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === 'string') {
    return fileOrUrl.toLowerCase().includes('.pdf');
  }
  return (
    fileOrUrl.type === 'application/pdf' ||
    (fileOrUrl.name && fileOrUrl.name.toLowerCase().endsWith('.pdf'))
  );
};

/**
 * Converts page 1 of a PDF file to a high-resolution JPEG File object.
 * @param {File} file - PDF file to convert
 * @param {number} scale - Scale multiplier (default: 2.0 for sharp graphics & crisp text)
 * @returns {Promise<{ file: File, previewUrl: string }>}
 */
export const convertPdfToImage = async (file, scale = 2.0) => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert PDF page to image blob'));
          return;
        }
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const imageFile = new File([blob], `${baseName}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        const previewUrl = URL.createObjectURL(blob);
        resolve({ file: imageFile, previewUrl });
      },
      'image/jpeg',
      0.95
    );
  });
};
