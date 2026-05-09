import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './cli.js';
import { extractText } from './extractor.js';
import { computeDiff } from './differ.js';
import { writeFile } from 'node:fs/promises';

vi.mock('./extractor.js', () => ({
  extractText: vi.fn(),
}));

vi.mock('./differ.js', () => ({
  computeDiff: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
}));

const mockedExtractText = vi.mocked(extractText);
const mockedComputeDiff = vi.mocked(computeDiff);
const mockedWriteFile = vi.mocked(writeFile);

describe('run', () => {
  let stdoutOutput: string;
  let stderrOutput: string;

  const captureStdout = (text: string) => { stdoutOutput += text; };
  const captureStderr = (text: string) => { stderrOutput += text; };

  beforeEach(() => {
    vi.resetAllMocks();
    stdoutOutput = '';
    stderrOutput = '';
  });

  it('extracts text from both files and prints the diff to stdout', async () => {
    // Requirement: Core workflow — extract both files, diff them, print result
    // Case: happy-path
    // Invariant: stdout receives the diff output

    // Arrange
    mockedExtractText.mockResolvedValueOnce('Old text.\n');
    mockedExtractText.mockResolvedValueOnce('New text.\n');
    mockedComputeDiff.mockReturnValue('--- v1.pdf\n+++ v2.pdf\n-Old text.\n+New text.');

    // Act
    await run({
      file1: '/docs/v1.pdf',
      file2: '/docs/v2.pdf',
      write: captureStdout,
      writeError: captureStderr,
    });

    // Assert
    expect(mockedExtractText).toHaveBeenCalledWith({ filePath: '/docs/v1.pdf' });
    expect(mockedExtractText).toHaveBeenCalledWith({ filePath: '/docs/v2.pdf' });
    expect(mockedComputeDiff).toHaveBeenCalledWith({
      oldText: 'Old text.\n',
      newText: 'New text.\n',
      oldLabel: 'v1.pdf',
      newLabel: 'v2.pdf',
    });
    expect(stdoutOutput).toContain('-Old text.');
    expect(stdoutOutput).toContain('+New text.');
    expect(stdoutOutput).toMatch(/\n$/);
  });

  it('writes the diff to a file when output option is provided', async () => {
    // Requirement: Configurable output — write to file with -o flag
    // Case: happy-path
    // Invariant: writeFile is called with the output path and diff content

    // Arrange
    mockedExtractText.mockResolvedValueOnce('Alpha.\n');
    mockedExtractText.mockResolvedValueOnce('Beta.\n');
    const diffOutput = '--- a.docx\n+++ b.docx\n-Alpha.\n+Beta.';
    mockedComputeDiff.mockReturnValue(diffOutput);
    mockedWriteFile.mockResolvedValue(undefined);

    // Act
    await run({
      file1: '/docs/a.docx',
      file2: '/docs/b.docx',
      output: '/tmp/diff.txt',
      write: captureStdout,
      writeError: captureStderr,
    });

    // Assert
    expect(mockedWriteFile).toHaveBeenCalledWith('/tmp/diff.txt', diffOutput, 'utf-8');
    expect(stderrOutput).toContain('/tmp/diff.txt');
  });

  it('does not write to a file when no output option is provided', async () => {
    // Requirement: Default behaviour is stdout only
    // Case: boundary
    // Invariant: writeFile is never called without -o

    // Arrange
    mockedExtractText.mockResolvedValue('Same.\n');
    mockedComputeDiff.mockReturnValue('');

    // Act
    await run({
      file1: '/docs/a.pdf',
      file2: '/docs/b.pdf',
      write: captureStdout,
      writeError: captureStderr,
    });

    // Assert
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('prints a no-differences message when files are identical', async () => {
    // Requirement: User feedback when documents are identical
    // Case: boundary
    // Invariant: A helpful message is printed instead of an empty diff

    // Arrange
    mockedExtractText.mockResolvedValue('Identical content.\n');
    mockedComputeDiff.mockReturnValue('');

    // Act
    await run({
      file1: '/docs/v1.docx',
      file2: '/docs/v2.docx',
      write: captureStdout,
      writeError: captureStderr,
    });

    // Assert
    expect(stdoutOutput).toContain('No differences found');
  });

  it('uses filenames (not full paths) as diff labels', async () => {
    // Requirement: Labels should be human-readable filenames
    // Case: happy-path
    // Invariant: computeDiff receives basenames, not full paths

    // Arrange
    mockedExtractText.mockResolvedValue('text\n');
    mockedComputeDiff.mockReturnValue('some diff');

    // Act
    await run({
      file1: '/long/path/to/report-v1.pdf',
      file2: '/another/path/report-v2.pdf',
      write: captureStdout,
      writeError: captureStderr,
    });

    // Assert
    expect(mockedComputeDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        oldLabel: 'report-v1.pdf',
        newLabel: 'report-v2.pdf',
      })
    );
  });

  it('reports extraction errors to stderr and returns exit code 1', async () => {
    // Requirement: Graceful error handling for invalid files
    // Case: error
    // Invariant: Error message goes to stderr, exit code is non-zero

    // Arrange
    mockedExtractText.mockRejectedValue(new Error('Unsupported file type: .txt'));

    // Act
    const exitCode = await run({
      file1: '/docs/notes.txt',
      file2: '/docs/other.txt',
      write: captureStdout,
      writeError: captureStderr,
    });

    // Assert
    expect(exitCode).toBe(1);
    expect(stderrOutput).toContain('Unsupported file type: .txt');
  });

  it('returns exit code 0 on success', async () => {
    // Requirement: Successful runs return exit code 0
    // Case: happy-path
    // Invariant: Exit code is 0

    // Arrange
    mockedExtractText.mockResolvedValue('text\n');
    mockedComputeDiff.mockReturnValue('diff output');

    // Act
    const exitCode = await run({
      file1: '/docs/a.pdf',
      file2: '/docs/b.pdf',
      write: captureStdout,
      writeError: captureStderr,
    });

    // Assert
    expect(exitCode).toBe(0);
  });
});
