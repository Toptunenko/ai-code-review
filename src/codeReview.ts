import { createOpenAIFile, createThread, runThread } from "./assistant";
import { Beta } from "openai/resources";
import {
  createComment,
  downloadFile,
  getDiff,
  getFile,
  getOpenPullRequestsAssignedToMe,
  getPRDetails,
  getPullRequestComments,
  pushReviewComment,
} from "./github";
import { streamResult } from "./stream";
import parseDiff, { File } from "parse-diff";
import { createPrompt } from "./prompt";
import { PRDetails } from "./types/github";
import Thread = Beta.Thread;
import { Review } from "./types/openAI";

async function reviewCodeWithChatGPT(
  file: File,
  thread: Thread,
  pull: PRDetails,
  localFilePath: string,
): Promise<Review[]> {
  try {
    const openAIFile = await createOpenAIFile(localFilePath);
    let reviews: Review[] = [];
    for (const chunk of file.chunks) {
      const prompt = createPrompt(file, chunk, pull);
      const stream = await runThread(thread.id, prompt, openAIFile.id);

      const chunkResult = await streamResult(stream);
      const chunkReviews = JSON.parse(chunkResult);

      if (chunkReviews.reviews.length > 0) {
        reviews = [...reviews, ...chunkReviews.reviews];
      }
    }
    return reviews;
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
    for (const file of parsedDiff) {
      const fileName = file.to as string;
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

      const localFilePath = await downloadFile(fileName, prDetails.headBranch);
      console.log(`---------------------------------`);
      console.log(`Review for ${fileName}`);
      console.log(`---------------------------------`);
      const reviews = await reviewCodeWithChatGPT(
        file,
        thread,
        pull,
        localFilePath,
      );

      const comments = createComment(file, reviews);

      if (comments.length) {
        // Push comments to GitHub
        await pushReviewComment(pull.pullNumber, comments);

        for (const review of reviews) {
          console.log(review);
        }
      }

      console.log(`---------------------------------`);
      // console.log(`Review for ${file.filename}:\n${review}\n`);
    }
  }
}
