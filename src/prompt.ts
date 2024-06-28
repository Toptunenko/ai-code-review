import { Chunk } from "parse-diff";

export function createGitDiffPrompt(chunks: Chunk[], lines: number): string {
  let diff = chunks
    .map((chunk) => {
      return `${chunk.content}
        ${chunk.changes
          // @ts-expect-error - ln and ln2 exists where needed
          .map((c) => `${c.ln ? c.ln : c.ln2} ${c.content}`)
          .join("\n")}`;
    })
    .join("\n");

  diff = removeImportsFromDiff(diff);

  return `Review the following code diff. Consider all pre conditions and instructions:
  total lines in the file: ${lines}.
\`\`\`diff
${diff}
\`\`\``;
}

function removeImportsFromDiff(diff: string) {
  const lines = diff.split("\n");
  const filteredLines = [];
  let inImportBlock = false;

  for (let line of lines) {
    const trimmedLine = line.trim();

    // Check if the line starts an import statement
    if (/^\d+\s*[+\-]?\s*import\s/.test(trimmedLine)) {
      inImportBlock = true;
    }

    // If we're in an import block, check if it ends
    if (inImportBlock) {
      if (trimmedLine.endsWith(";")) {
        inImportBlock = false;
      }
      continue; // Skip lines in the import block
    }

    // Add non-import lines to the result
    filteredLines.push(line);
  }

  return filteredLines.join("\n");
}
