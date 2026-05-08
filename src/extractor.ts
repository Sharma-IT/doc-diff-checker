import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import pdfParse from 'pdf-parse';
import { extractRawText } from 'mammoth';

type ExtractTextOptions = {
  readonly filePath: string;
};

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx'] as const;

type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

const isSupportedExtension = (ext: string): ext is SupportedExtension =>
  (SUPPORTED_EXTENSIONS as ReadonlyArray<string>).includes(ext);

const parsePdf = async (buffer: Buffer): Promise<string> => {
  const result = await pdfParse(buffer);
  return result.text;
};

const parseDocx = async (buffer: Buffer): Promise<string> => {
  const result = await extractRawText({ buffer });
  return result.value;
};

const parsersByExtension: Record<SupportedExtension, (buffer: Buffer) => Promise<string>> = {
  '.pdf': parsePdf,
  '.docx': parseDocx,
};

export const extractText = async ({ filePath }: ExtractTextOptions): Promise<string> => {
  const extension = extname(filePath).toLowerCase();

  if (!isSupportedExtension(extension)) {
    throw new Error(`Unsupported file type: ${extension || '(none)'}`);
  }

  const buffer = await readFile(filePath);
  const parse = parsersByExtension[extension];
  return parse(Buffer.from(buffer));
};
