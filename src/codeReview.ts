import {
  addMessage,
  calculateRunTokenCount,
  createThread,
  runPrompt,
} from "./assistant";
import { Beta } from "openai/resources";
import {
  createComment,
  fileData,
  getDiff,
  getOpenPullRequestsAssignedToMe,
  getPRDetails,
  getPullRequestComments,
  pushReviewComment,
} from "./github";
import parseDiff, { File } from "parse-diff";
import { createFirstPrompt, createPrompts } from "./prompt";
import { PRDetails } from "./types/github";
import { Review } from "./types/openAI";
import Thread = Beta.Thread;

async function reviewCodeWithChatGPT(
  file: File,
  thread: Thread,
  pull: PRDetails,
  lines: number,
): Promise<Review[]> {
  try {
    const prompts = createPrompts(file, lines);

    let responseString = "";
    for (const prompt of prompts) {
      responseString = await runPrompt(thread.id, prompt);
    }

    const reviews = JSON.parse(responseString);

    return reviews?.reviews ?? [];
  } catch (error) {
    console.error("Error while reviewing code with ChatGPT:", error);
    return [];
  }
}

export async function runCodeReview() {
  console.log("Starting code review");
  const pulls = await getOpenPullRequestsAssignedToMe();

  if (!pulls.length) {
    console.log("No open pull requests assigned to you");
    return;
  }

  for (const pull of pulls) {
    console.log(`Reviewing PR #${pull.pullNumber}`);
    const prDetails = await getPRDetails(pull.pullNumber);
    const diff = await getDiff(pull.pullNumber);
    const existingComments = await getPullRequestComments(pull.pullNumber);
    const parsedDiff = parseDiff(diff);

    const thread = await createThread();

    await addMessage(thread.id, createFirstPrompt());

    for (const file of parsedDiff) {
      try {
        const fileName = file.to as string;

        // for testing. skip all files except file containing "e-commerce-product-wizard.facade.ts"
        // if (
        //   !fileName.includes(
        //     "apps/gelato-api-ui/src/app/dashboard/dashboard/dashboard.component.html",
        //   )
        // ) {
        //   continue;
        // }

        //skip scss  and gotmpl files
        if (fileName.endsWith(".scss") || fileName.endsWith(".gotmpl")) {
          continue;
        }

        // Skip files that already have comments
        if (
          existingComments.some(
            (comment) =>
              comment.path === fileName && comment.body.includes("AI review"),
          )
        ) {
          console.log(`Skipping ${fileName} as it already has comments`);
          continue;
        }

        const { lines } = await fileData(fileName, prDetails.headBranch);
        console.log(`---------------------------------`);
        console.log(`Review for ${fileName} (${lines} lines)`);
        console.log(`---------------------------------`);
        const reviews = await reviewCodeWithChatGPT(file, thread, pull, lines);

        const comments = createComment(file, reviews);

        const tokens = await calculateRunTokenCount(thread.id);

        if (comments.length) {
          // Push comments to GitHub
          await pushReviewComment(pull.pullNumber, comments);

          for (const review of reviews) {
            console.log(review);
          }
        }
        console.log(
          `Tokens used: ${tokens.total_tokens} ($${tokens.total_price}) (Input: ${tokens.prompt_tokens}, Output: ${tokens.completion_tokens})`,
        );

        console.log(`---------------------------------`);
        // console.log(`Review for ${file.filename}:\n${review}\n`);
      } catch (error) {
        console.error(`Error while reviewing ${file.to}:`, error);
      }
    }
  }
}
