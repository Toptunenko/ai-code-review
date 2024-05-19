import { Octokit } from "@octokit/rest";
import { Comment, PRDetails } from "./types/github";
import * as fs from "fs";
import { Chunk, File } from "parse-diff";
import { Review } from "./types/openAI";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER as string;
const repo = process.env.GITHUB_REPO as string;

export interface FileData {
  filename: string;
  patch: string;
}

export async function getPullRequestFiles(
  pullNumber: number,
): Promise<FileData[]> {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data.map((file) => ({
    filename: file.filename,
    patch: file.patch as string,
  }));
}

export async function getPRDetails(pullNumber: number): Promise<PRDetails> {
  const prResponse = await octokit.pulls.get({
    owner: owner,
    repo: repo,
    pull_number: pullNumber,
  });
  return {
    owner: owner,
    repo: repo,
    pullNumber: pullNumber,
    title: prResponse.data.title ?? "",
    description: prResponse.data.body ?? "",
    baseBranch: prResponse.data.base.ref, // branch that the changes are pulled into
    headBranch: prResponse.data.head.ref, // branch where the changes are made
  };
}

export async function getDiff(pullNumber: number): Promise<string | null> {
  const response = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: "diff" },
  });
  // @ts-expect-error - response.data is a string
  return response.data;
}

export async function getPullRequestComments(
  pullNumber: number,
): Promise<Comment[]> {
  const { data } = await octokit.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data.map((comment) => ({
    body: comment.body,
    path: comment.path,
    line: comment.line as number,
  }));
}

export async function pushReviewComment(
  pullNumber: number,
  comments: Comment[],
): Promise<void> {
  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    comments,
    event: "COMMENT",
  });
}

export function createComment(file: File, aiResponses: Review[]): Comment[] {
  const path = file.to as string;
  let comments = aiResponses.flatMap((aiResponse) => {
    if (!file.to) {
      return [];
    }
    return {
      body: `[AI review]: ${aiResponse.reviewComment}`,
      path,
      line: Number(aiResponse.lineNumber),
    };
  });

  // if (!comments.length) {
  //   // @ts-ignore
  //   const line = file.chunks[0].changes[0]["ln1"] as number;
  //   comments = [
  //     {
  //       body: "AI review completed",
  //       path,
  //       line,
  //     },
  //   ];
  // }

  return comments;
}

export async function getFile(
  path: string,
  branch: string = "staging",
): Promise<any> {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: branch,
  });
  return data;
}

// download file from github to local file system and return the path
export async function downloadFile(
  path: string,
  branch: string = "staging",
): Promise<string> {
  const data = await getFile(path, branch);
  const content = Buffer.from(data?.content ?? "", "base64").toString();

  const filePath = `./tmp/${path.replace(/\//g, "_")}.txt`;

  if (!fs.existsSync("./tmp")) {
    fs.mkdirSync("./tmp", { recursive: true });
  }

  fs.writeFileSync(filePath, content);
  return filePath;
}

export async function getOpenPullRequestsAssignedToMe(): Promise<PRDetails[]> {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
  });
  return data
    .filter((pr) => {
      // return pr.number === 7259; // hardcoded for testing
      return pr.requested_reviewers?.find(
        (r) => r.login === process.env.GITHUB_USERNAME,
      );
    })
    .map((pr) => ({
      owner,
      repo,
      pullNumber: pr.number,
      title: pr.title,
      description: pr.body ?? "",
    }));
}
