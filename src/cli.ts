#!/usr/bin/env node

import { basename } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { extractText } from './extractor.js';
import { computeDiff } from './differ.js';

type RunOptions = {
  readonly file1: string;
  readonly file2: string;
  readonly output?: string;
  readonly write: (text: string) => void;
  readonly writeError: (text: string) => void;
};

export const run = async ({ file1, file2, output, write, writeError }: RunOptions): Promise<number> => {
  try {
    const [text1, text2] = await Promise.all([
      extractText({ filePath: file1 }),
      extractText({ filePath: file2 }),
    ]);

    const diff = computeDiff({
      oldText: text1,
      newText: text2,
      oldLabel: basename(file1),
      newLabel: basename(file2),
    });

    if (diff === '') {
      write('No differences found.\n');
      return 0;
    }

    if (output) {
      await writeFile(output, diff, 'utf-8');
      writeError(`Diff written to ${output}\n`);
    } else {
      write(diff + '\n');
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    writeError(`Error: ${message}\n`);
    return 1;
  }
};

// Stryker disable all: entrypoint wiring — tested via manual integration
const isDirectExecution = process.argv[1]?.endsWith('doc-diff-checker') || process.argv[1]?.includes('cli');

if (isDirectExecution) {
  const { Command } = await import('commander');

  const program = new Command();
  program
    .name('doc-diff-checker')
    .description('Show a plain text diff between PDF or DOCX document files')
    .argument('<file1>', 'Path to the first (older) document')
    .argument('<file2>', 'Path to the second (newer) document')
    .option('-o, --output <path>', 'Write the diff to a file instead of stdout')
    .action(async (file1: string, file2: string, options: { output?: string }) => {
      const exitCode = await run({
        file1,
        file2,
        output: options.output,
        write: (text) => process.stdout.write(text),
        writeError: (text) => process.stderr.write(text),
      });
      process.exit(exitCode);
    });

  program.parse();
}
