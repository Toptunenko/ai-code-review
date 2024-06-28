import { calculateRunTokenCount, createThread, runPrompt } from "./assistant";
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
import { createPrompts } from "./prompt";
import { PRDetails } from "./types/github";
import { Review } from "./types/openAI";
import { ArgsMode } from "./types/args";
import Thread = Beta.Thread;

async function reviewCodeWithChatGPT(
  repo: string,
  file: File,
  thread: Thread,
  pull: PRDetails,
  lines: number,
): Promise<{ reviews: Review[]; generalComment: string }> {
  try {
    const prompts = createPrompts(file, lines);

    let responseString = "";
    for (const prompt of prompts) {
      responseString = await runPrompt(thread.id, prompt);
    }

    const reviews = JSON.parse(responseString);

    return {
      reviews: reviews?.reviews ?? [],
      generalComment: reviews.generalComment,
    };
  } catch (error) {
    console.error("Error while reviewing code with ChatGPT:", error);
    return {
      reviews: [],
      generalComment: "",
    };
  }
}

export async function runCodeReview(
  repo: string,
  pullRequestId: number,
  mode: string,
) {
  console.log("Starting code review");
  const pulls = await getOpenPullRequestsAssignedToMe(repo, pullRequestId);

  if (!pulls.length) {
    console.log("No open pull requests assigned to you");
    return;
  }

  for (const pull of pulls) {
    console.log(`Reviewing PR #${pull.pullNumber}`);
    const prDetails = await getPRDetails(repo, pull.pullNumber);
    const diff = await getDiff(repo, pull.pullNumber);
    const existingComments = await getPullRequestComments(
      repo,
      pull.pullNumber,
    );
    const parsedDiff = parseDiff(diff);

    const thread = await createThread();

    // await addMessage(thread.id, createFirstPrompt());

    for (const file of parsedDiff) {
      try {
        const fileName = file.to as string;

        // for testing. skip all files except file containing "e-commerce-product-wizard.facade.ts"
        // if (
        //   !fileName.includes(
        //     "apps/gelato-api-ui/src/app/e-commerce-product-wizard/services/e-commerce-product-wizard.facade.ts",
        //   )
        // ) {
        //   continue;
        // }

        const skipFiles = process.env.SKIP_FILES?.split(",") || [];
        if (skipFiles.some((skipFile) => fileName.endsWith(skipFile))) {
          console.log(`Skipping ${fileName} as it is in skip files`);
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

        const { lines } = await fileData(
          repo,
          fileName,
          prDetails.headBranch as string,
        );
        console.log(`---------------------------------`);
        console.log(`Review for ${fileName} (${lines} lines)`);
        console.log(`---------------------------------`);
        const reviewRes = await reviewCodeWithChatGPT(
          repo,
          file,
          thread,
          pull,
          lines,
        );

        const comments = createComment(file, reviewRes.reviews);

        const tokens = await calculateRunTokenCount(thread.id);

        if (comments.length) {
          // Push comments to GitHub
          if (mode === ArgsMode.write) {
            await pushReviewComment(repo, pull.pullNumber, comments);
          }

          for (const review of reviewRes.reviews) {
            console.log(review);
          }
          console.log("General Comment: ");
          console.log(reviewRes.generalComment);
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
