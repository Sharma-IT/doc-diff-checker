# Doc Diff Checker

A CLI tool that shows a plain text diff between `.pdf` and `.docx` document files. Designed for version control workflows where you want to send only the changed lines to an LLM.

## Setup

1.  **Clone the repository** (if you haven't already).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Build the project**:
    ```bash
    npm run build
    ```
4.  **Link globally**:
    ```bash
    npm link
    ```

## Usage

Once linked, you can run the tool from any directory:

```bash
doc-diff-checker <old-file> <new-file> [options]
```

### Options

- `-o, --output <path>`: Write the diff output to a file instead of `stdout`.

### Example

```bash
doc-diff-checker document-v1.pdf document-v2.pdf
```

## Development

- **Run tests**: `npm test`
- **Run mutation testing**: `npm run test:mutation`
- **Build**: `npm run build`
