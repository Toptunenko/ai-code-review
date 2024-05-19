import { PRDetails } from "./types/github";
import { Chunk, File } from "parse-diff";

export function createPrompt(
  file: File,
  chunk: Chunk,
  prDetails: PRDetails,
): string {
  return `Your task is to review pull requests. Instructions:
- Provide the response in following JSON format:  {"reviews": [{"lineNumber":  <line_number>, "reviewComment": "<review comment>"}]}
- Do not give positive comments or compliments.
- Provide comments and suggestions ONLY if there is something to improve, otherwise "reviews" should be an empty array.
- Write the comment in GitHub Markdown format.
- Use the given description only for the overall context and only comment the code.
- IMPORTANT: NEVER suggest adding comments to the code.
- IMPORTANT: Consider any changes of TypeScript file imports as valid. Don't comment on them.
- IMPORTANT: Self-closing tags for HTML elements are valid in Angular 17 templates. Don't comment on them.
- Using self-closing syntax for <ng-container> is valid in Angular 17 templates. Don't comment on them.
- IMPORTANT: Consider The self-closing syntax for any html element as valid and do not comment on it.
- Use attached file as a context for review.
- IMPORTANT: declare components in the imports array is not an issue. Standaline components can be imported. 
    Imported components inside the 'imports' array are valid. Don't comment it.
- if you see how to improve the code, provide a suggestion.
-  IMPORTANT: Do not suggest adding type annotations to the variables with names that are ends with '$'. for example: 'value$'.
 - IMPORTANT: use attached file for context

Review the following code diff in the file "${
    file.to
  }" and take the pull request title and description into account when writing the response.
  
Pull request title: ${prDetails.title}
Pull request description:

---
${prDetails.description}
---

Git diff to review:

\`\`\`diff
${chunk.content}
${chunk.changes
  // @ts-expect-error - ln and ln2 exists where needed
  .map((c) => `${c.ln ? c.ln : c.ln2} ${c.content}`)
  .join("\n")}
\`\`\`
 - IMPORTANT: use the attached file for context
`;
}
