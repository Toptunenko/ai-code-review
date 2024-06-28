import { PRDetails } from "./types/github";
import { Chunk, File } from "parse-diff";

export function createPrompts(file: File, lines: number): string[] {
  return [
    createGitDiffPrompt(file.chunks, lines),
    // `Think slow. What else could be improved in this changes.`,
  ];
}

export function createFirstPrompt(): string {
  return `Your task is to review pull requests. Instructions:
- Provide the response in following JSON format:  {"reviews": [{"lineNumber":  <line_number>, "reviewComment": "<review comment>"}]}
Pre conditions:
- Any file is always correctly imported and used. Don't comment it

Instructions:
- Provide the response in following JSON format:  {"reviews": [{"lineNumber":  <line_number>, "reviewComment": "<review comment>"}], "generalComment": "<general comment>"}
- Do not give positive comments or compliments.
- Provide comments and suggestions ONLY if there is something to improve, otherwise "reviews" should be an empty array.
- Write the comment in GitHub Markdown format.
- Use the given description only for the overall context and only comment the code.
- IMPORTANT: NEVER suggest adding comments to the code.
- IMPORTANT: Consider any changes of TypeScript file imports as valid. Don't comment on them.
- IMPORTANT: Ignore lines starting with 'import' keywords.
- IMPORTANT: Self-closing tags for HTML elements are valid in Angular 17 templates. Don't comment on them.
- IMPORTANT: @if is standard Angular 17 syntax. Don't comment on it.
- Using self-closing syntax for <ng-container> is valid in Angular 17 templates. Don't comment on them.
- IMPORTANT: Consider The self-closing syntax for any html element as valid and do not comment on it.
- IMPORTANT: declare components in the imports array is not an issue. Standaline components can be imported. 
    Imported components inside the 'imports' array are valid. Don't comment it.
- if you see how to improve the code, provide a suggestion.
-  IMPORTANT: Do not suggest adding type annotations to the variables with names that are ends with '$'. for example: 'value$'.
-  IMPORTANT: Do not suggest adding type annotations to the parameters in the rxjs operators.
-  IMPORTANT: If total lines in the file more than 500, suggest splitting the file into multiple files.
`;
}

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
