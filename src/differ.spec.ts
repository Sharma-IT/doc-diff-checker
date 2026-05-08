import { describe, it, expect } from 'vitest';
import { computeDiff } from './differ.js';

describe('computeDiff', () => {
  it('returns an empty string when both texts are identical', () => {
    // Requirement: Identical documents should produce no diff output
    // Case: boundary
    // Invariant: No change lines should appear in the output

    // Arrange
    const text = 'Hello, world.\nThis is a test document.\n';

    // Act
    const result = computeDiff({ oldText: text, newText: text, oldLabel: 'v1.docx', newLabel: 'v2.docx' });

    // Assert
    expect(result).toBe('');
  });

  it('shows removed and added lines for modified text', () => {
    // Requirement: Changed lines must appear in unified diff format
    // Case: happy-path
    // Invariant: Removed lines prefixed with '-', added lines prefixed with '+'

    // Arrange
    const oldText = 'Line one.\nLine two.\nLine three.\n';
    const newText = 'Line one.\nLine TWO CHANGED.\nLine three.\n';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'v1.pdf', newLabel: 'v2.pdf' });

    // Assert
    expect(result).toContain('-Line two.');
    expect(result).toContain('+Line TWO CHANGED.');
  });

  it('includes file labels in the diff header', () => {
    // Requirement: Diff output should show which files are being compared
    // Case: happy-path
    // Invariant: Both labels appear in the output header

    // Arrange
    const oldText = 'Original content.\n';
    const newText = 'Updated content.\n';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'report-v1.docx', newLabel: 'report-v2.docx' });

    // Assert
    expect(result).toContain('report-v1.docx');
    expect(result).toContain('report-v2.docx');
  });

  it('handles additions when old text is empty', () => {
    // Requirement: Diffing an empty document against a populated one should show all lines as additions
    // Case: boundary
    // Invariant: Every line of the new text appears as an addition

    // Arrange
    const oldText = '';
    const newText = 'Brand new content.\nSecond line.\n';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'empty.docx', newLabel: 'filled.docx' });

    // Assert
    expect(result).toContain('+Brand new content.');
    expect(result).toContain('+Second line.');
  });

  it('handles deletions when new text is empty', () => {
    // Requirement: Diffing a populated document against an empty one should show all lines as removals
    // Case: boundary
    // Invariant: Every line of the old text appears as a removal

    // Arrange
    const oldText = 'Content to remove.\nAnother line.\n';
    const newText = '';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'full.pdf', newLabel: 'empty.pdf' });

    // Assert
    expect(result).toContain('-Content to remove.');
    expect(result).toContain('-Another line.');
  });

  it('returns an empty string when both texts are empty', () => {
    // Requirement: Two empty documents should produce no diff
    // Case: boundary
    // Invariant: Output is an empty string

    // Arrange
    const oldText = '';
    const newText = '';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'a.pdf', newLabel: 'b.pdf' });

    // Assert
    expect(result).toBe('');
  });

  it('detects multiple separate changes across the document', () => {
    // Requirement: All changed regions must be captured, not just the first
    // Case: happy-path
    // Invariant: Both changed regions appear in the diff

    // Arrange
    const oldText = 'Introduction.\nChapter one content.\nMiddle section.\nChapter two content.\nConclusion.\n';
    const newText = 'Introduction.\nChapter one UPDATED.\nMiddle section.\nChapter two REVISED.\nConclusion.\n';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'doc-v1.docx', newLabel: 'doc-v2.docx' });

    // Assert
    expect(result).toContain('-Chapter one content.');
    expect(result).toContain('+Chapter one UPDATED.');
    expect(result).toContain('-Chapter two content.');
    expect(result).toContain('+Chapter two REVISED.');
  });

  it('strips the generic patch header lines but preserves label lines', () => {
    // Requirement: The output should not include the 'Index:' and '===' lines from createPatch
    // Case: happy-path
    // Invariant: Generic header is absent, --- and +++ label lines are present

    // Arrange
    const oldText = 'Before.\n';
    const newText = 'After.\n';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'old.pdf', newLabel: 'new.pdf' });

    // Assert
    expect(result).not.toContain('Index:');
    expect(result).not.toContain('===');
    expect(result).toMatch(/^---.*old\.pdf/);
  });

  it('produces output with no leading or trailing whitespace', () => {
    // Requirement: Clean output suitable for direct consumption by an LLM
    // Case: boundary
    // Invariant: Result equals itself trimmed

    // Arrange
    const oldText = 'Alpha.\n';
    const newText = 'Beta.\n';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'a.docx', newLabel: 'b.docx' });

    // Assert
    expect(result).toBe(result.trim());
    expect(result.length).toBeGreaterThan(0);
  });

  it('preserves newlines between diff lines', () => {
    // Requirement: Each diff line must be on its own line for readability
    // Case: happy-path
    // Invariant: The diff contains newline-separated lines matching unified diff structure

    // Arrange
    const oldText = 'First.\nSecond.\n';
    const newText = 'First.\nChanged.\n';

    // Act
    const result = computeDiff({ oldText, newText, oldLabel: 'x.pdf', newLabel: 'y.pdf' });

    // Assert
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some((line: string) => line.startsWith('---'))).toBe(true);
    expect(lines.some((line: string) => line.startsWith('+++'))).toBe(true);
    expect(lines.some((line: string) => line.startsWith('-Second.'))).toBe(true);
    expect(lines.some((line: string) => line.startsWith('+Changed.'))).toBe(true);
  });
});
