import { jsPDF } from 'jspdf';

interface HtmlToPdfOptions {
  fileName?: string;
  orientation?: 'p' | 'portrait' | 'l' | 'landscape';
  unit?: 'pt' | 'mm' | 'cm' | 'in' | 'px';
  format?: 'a4' | 'letter' | string | number[];
  margin?: number;
}

export const renderHtmlToPdfBlob = async (
  html: string,
  options: HtmlToPdfOptions = {},
): Promise<{ blob: Blob; fileName: string }> => {
  const {
    fileName = 'contrat.pdf',
    orientation = 'p',
    unit = 'pt',
    format = 'a4',
    margin = 36,
  } = options;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // approx A4 width in px at 96dpi
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const doc = new jsPDF({
      orientation,
      unit,
      format,
    });

    await doc.html(container, {
      callback: () => {},
      autoPaging: 'text',
      margin,
      html2canvas: {
        useCORS: true,
        scale: 0.85,
        letterRendering: true,
      },
    });

    const blob = doc.output('blob');
    return { blob, fileName };
  } finally {
    document.body.removeChild(container);
  }
};

export type { HtmlToPdfOptions };
