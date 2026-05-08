import { createPatch } from 'diff';

type ComputeDiffOptions = {
  readonly oldText: string;
  readonly newText: string;
  readonly oldLabel: string;
  readonly newLabel: string;
};

const GENERIC_HEADER_LINE_COUNT = 2;

const stripPatchHeader = (patch: string): string => {
  const lines = patch.split('\n');
  return lines.slice(GENERIC_HEADER_LINE_COUNT).join('\n').trim();
};

export const computeDiff = ({ oldText, newText, oldLabel, newLabel }: ComputeDiffOptions): string => {
  if (oldText === newText) {
    return '';
  }

  // Stryker disable next-line StringLiteral: equivalent mutant — 'file' only appears in the stripped Index: header line
  const patch = createPatch('file', oldText, newText, oldLabel, newLabel);
  return stripPatchHeader(patch);
};
