import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractText } from './extractor.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

vi.mock('mammoth', () => ({
  extractRawText: vi.fn(),
}));

import { readFile } from 'node:fs/promises';
import pdfParse from 'pdf-parse';
import { extractRawText } from 'mammoth';

const mockedReadFile = vi.mocked(readFile);
const mockedPdfParse = vi.mocked(pdfParse);
const mockedExtractRawText = vi.mocked(extractRawText);

describe('extractText', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('extracts text from a .pdf file', async () => {
    // Requirement: PDF files should have their text content extracted
    // Case: happy-path
    // Invariant: The returned string matches the parsed PDF text

    // Arrange
    const fakeBuffer = Buffer.from('fake-pdf-bytes');
    mockedReadFile.mockResolvedValue(fakeBuffer);
    mockedPdfParse.mockResolvedValue({ text: 'Extracted PDF text.\n' } as Awaited<ReturnType<typeof pdfParse>>);

    // Act
    const result = await extractText({ filePath: '/docs/report.pdf' });

    // Assert
    expect(result).toBe('Extracted PDF text.\n');
    expect(mockedReadFile).toHaveBeenCalledWith('/docs/report.pdf');
    expect(mockedPdfParse).toHaveBeenCalledWith(fakeBuffer);
  });

  it('extracts text from a .docx file', async () => {
    // Requirement: DOCX files should have their text content extracted
    // Case: happy-path
    // Invariant: The returned string matches the parsed DOCX text

    // Arrange
    const fakeBuffer = Buffer.from('fake-docx-bytes');
    mockedReadFile.mockResolvedValue(fakeBuffer);
    mockedExtractRawText.mockResolvedValue({ value: 'Extracted DOCX text.\n', messages: [] });

    // Act
    const result = await extractText({ filePath: '/docs/letter.docx' });

    // Assert
    expect(result).toBe('Extracted DOCX text.\n');
    expect(mockedReadFile).toHaveBeenCalledWith('/docs/letter.docx');
    expect(mockedExtractRawText).toHaveBeenCalledWith({ buffer: fakeBuffer });
  });

  it('handles uppercase .PDF extension', async () => {
    // Requirement: Extension matching should be case-insensitive
    // Case: boundary
    // Invariant: Uppercase extensions are treated identically to lowercase

    // Arrange
    const fakeBuffer = Buffer.from('fake-pdf');
    mockedReadFile.mockResolvedValue(fakeBuffer);
    mockedPdfParse.mockResolvedValue({ text: 'PDF content.\n' } as Awaited<ReturnType<typeof pdfParse>>);

    // Act
    const result = await extractText({ filePath: '/docs/REPORT.PDF' });

    // Assert
    expect(result).toBe('PDF content.\n');
  });

  it('handles uppercase .DOCX extension', async () => {
    // Requirement: Extension matching should be case-insensitive
    // Case: boundary
    // Invariant: Uppercase extensions are treated identically to lowercase

    // Arrange
    const fakeBuffer = Buffer.from('fake-docx');
    mockedReadFile.mockResolvedValue(fakeBuffer);
    mockedExtractRawText.mockResolvedValue({ value: 'DOCX content.\n', messages: [] });

    // Act
    const result = await extractText({ filePath: '/docs/LETTER.DOCX' });

    // Assert
    expect(result).toBe('DOCX content.\n');
  });

  it('throws an error for unsupported file extensions', async () => {
    // Requirement: Only .pdf and .docx files are supported
    // Case: error
    // Invariant: An error is thrown describing the unsupported extension

    // Act & Assert
    await expect(
      extractText({ filePath: '/docs/notes.txt' })
    ).rejects.toThrow('Unsupported file type: .txt');
  });

  it('throws an error for files with no extension', async () => {
    // Requirement: Files must have a recognised extension
    // Case: error
    // Invariant: An error is thrown for missing extensions

    // Act & Assert
    await expect(
      extractText({ filePath: '/docs/README' })
    ).rejects.toThrow('Unsupported file type: (none)');
  });

  it('propagates file system errors when the file does not exist', async () => {
    // Requirement: File read failures should propagate as errors
    // Case: error
    // Invariant: The original ENOENT error is preserved

    // Arrange
    mockedReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    // Act & Assert
    await expect(
      extractText({ filePath: '/missing/file.pdf' })
    ).rejects.toThrow('ENOENT');
  });

  it('does not call pdf-parse when extracting a .docx file', async () => {
    // Requirement: Only the correct parser is invoked for the given file type
    // Case: happy-path
    // Invariant: pdf-parse is never called for .docx files

    // Arrange
    const fakeBuffer = Buffer.from('fake-docx');
    mockedReadFile.mockResolvedValue(fakeBuffer);
    mockedExtractRawText.mockResolvedValue({ value: 'text', messages: [] });

    // Act
    await extractText({ filePath: '/docs/file.docx' });

    // Assert
    expect(mockedPdfParse).not.toHaveBeenCalled();
  });

  it('does not call mammoth when extracting a .pdf file', async () => {
    // Requirement: Only the correct parser is invoked for the given file type
    // Case: happy-path
    // Invariant: mammoth is never called for .pdf files

    // Arrange
    const fakeBuffer = Buffer.from('fake-pdf');
    mockedReadFile.mockResolvedValue(fakeBuffer);
    mockedPdfParse.mockResolvedValue({ text: 'text' } as Awaited<ReturnType<typeof pdfParse>>);

    // Act
    await extractText({ filePath: '/docs/file.pdf' });

    // Assert
    expect(mockedExtractRawText).not.toHaveBeenCalled();
  });
});
