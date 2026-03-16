const fs = require('fs').promises;
const path = require('path');

const parseTextFile = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return content.trim();
};

const parsePDFFile = async (filePath) => {
  try {
    const PDFParser = require('pdf2json');
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        let text = '';
        if (pdfData.Pages) {
          pdfData.Pages.forEach(page => {
            if (page.Texts) {
              page.Texts.forEach(textItem => {
                if (textItem.R) {
                  textItem.R.forEach(r => {
                    text += decodeURIComponent(r.T) + ' ';
                  });
                }
              });
            }
            text += '\n';
          });
        }
        resolve(text.trim());
      });

      pdfParser.on('pdfParser_dataError', (err) => {
        reject(new Error('Failed to parse PDF: ' + err.message));
      });

      pdfParser.loadPDF(filePath);
    });
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn('pdf2json not installed, using fallback');
      return await fallbackPDFParse(filePath);
    }
    throw error;
  }
};

const fallbackPDFParse = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const content = buffer.toString('utf8');
  const textMatches = content.match(/\(([^)]+)\)/g) || [];
  return textMatches.map(m => m.slice(1, -1)).join(' ').trim() ||
    'Unable to extract text from PDF. Please copy and paste the content.';
};

const parseDocxFile = async (filePath) => {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn('mammoth not installed, returning placeholder');
      return 'DOCX parsing requires mammoth package. Please paste report content directly.';
    }
    throw error;
  }
};

const parseImageFile = async (filePath) => {
  try {
    const Tesseract = require('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}
    });
    return text.trim();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn('tesseract.js not installed');
      return 'Image OCR requires tesseract.js package. Please paste report content directly.';
    }
    throw error;
  }
};

const parseFile = async (file) => {
  const filePath = file.path;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  try {
    let content;

    if (ext === '.txt' || mimeType === 'text/plain') {
      content = await parseTextFile(filePath);
    } else if (ext === '.pdf' || mimeType === 'application/pdf') {
      content = await parsePDFFile(filePath);
    } else if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
      content = await parseDocxFile(filePath);
    } else if (ext === '.doc') {
      content = 'Legacy .doc format not supported. Please convert to .docx or paste content.';
    } else if (['.jpg', '.jpeg', '.png'].includes(ext) || mimeType.startsWith('image/')) {
      content = await parseImageFile(filePath);
    } else {
      content = 'Unsupported file format';
    }

    await cleanupFile(filePath);
    return content;
  } catch (error) {
    await cleanupFile(filePath);
    throw error;
  }
};

const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn('Failed to cleanup file:', filePath);
  }
};

const extractStructuredData = (text) => {
  const patterns = {
    bloodPressure: /blood\s*pressure[:\s]*(\d+\/\d+)/i,
    heartRate: /heart\s*rate[:\s]*(\d+)/i,
    temperature: /temp(?:erature)?[:\s]*([\d.]+)/i,
    glucose: /glucose[:\s]*([\d.]+)/i,
    hemoglobin: /h(?:ae)?moglobin[:\s]*([\d.]+)/i,
    cholesterol: /cholesterol[:\s]*([\d.]+)/i,
    creatinine: /creatinine[:\s]*([\d.]+)/i,
    bilirubin: /bilirubin[:\s]*([\d.]+)/i
  };

  const extracted = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      extracted[key] = match[1];
    }
  }

  return extracted;
};

const detectReportType = (text) => {
  const lower = text.toLowerCase();

  if (lower.includes('complete blood count') || lower.includes('cbc') || lower.includes('hemoglobin')) {
    return 'blood_test';
  }
  if (lower.includes('x-ray') || lower.includes('xray') || lower.includes('radiograph')) {
    return 'xray';
  }
  if (lower.includes('mri') || lower.includes('magnetic resonance')) {
    return 'mri';
  }
  if (lower.includes('ct scan') || lower.includes('computed tomography')) {
    return 'ct_scan';
  }
  if (lower.includes('ecg') || lower.includes('electrocardiogram') || lower.includes('ekg')) {
    return 'ecg';
  }
  if (lower.includes('ultrasound') || lower.includes('sonography')) {
    return 'ultrasound';
  }
  if (lower.includes('urine') || lower.includes('urinalysis')) {
    return 'urine_test';
  }
  if (lower.includes('liver function') || lower.includes('lft')) {
    return 'liver_function';
  }
  if (lower.includes('kidney function') || lower.includes('kft') || lower.includes('renal')) {
    return 'kidney_function';
  }
  if (lower.includes('thyroid') || lower.includes('tsh') || lower.includes('t3') || lower.includes('t4')) {
    return 'thyroid';
  }
  if (lower.includes('lipid profile') || lower.includes('cholesterol')) {
    return 'lipid_profile';
  }

  return 'general';
};

const sanitizeText = (text) => {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
};

module.exports = {
  parseFile,
  parseTextFile,
  parsePDFFile,
  parseDocxFile,
  parseImageFile,
  extractStructuredData,
  detectReportType,
  sanitizeText
};
