import { useState, useCallback } from 'react';

interface UseLazyPDFReturn {
  generatePDF: (element: HTMLElement, filename: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for lazy loading jsPDF and html2canvas libraries
 * Only imports these heavy dependencies when PDF generation is actually needed
 *
 * @returns {UseLazyPDFReturn} Object with generatePDF function, loading state, and error
 *
 * @example
 * const { generatePDF, isLoading, error } = useLazyPDF();
 *
 * const handleDownload = async () => {
 *   const element = document.getElementById('content');
 *   if (element) {
 *     await generatePDF(element, 'documento.pdf');
 *   }
 * };
 */
export function useLazyPDF(): UseLazyPDFReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generatePDF = useCallback(async (element: HTMLElement, filename: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Lazy import jsPDF and html2canvas only when needed
      // This prevents these heavy libraries from being in the initial bundle
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      // Capture the element as canvas
      const canvas = await html2canvas.default(element, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to generate PDF');
      setError(errorMessage);
      console.error('Error generating PDF:', err);
      throw errorMessage;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generatePDF,
    isLoading,
    error
  };
}
