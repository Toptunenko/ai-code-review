import { Octokit } from "@octokit/rest";
import { Comment, PRDetails } from "./types/github";
import { File } from "parse-diff";
import { Review } from "./types/openAI";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER as string;

export interface FileData {
  filename: string;
  patch: string;
}

export async function getPullRequestFiles(
  repo: string,
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

export async function getPRDetails(
  repo: string,
  pullNumber: number,
): Promise<PRDetails> {
  const prResponse = await octokit.pulls.get({
    owner: owner,
    repo,
    pull_number: pullNumber,
  });
  return {
    owner: owner,
    repo,
    pullNumber: pullNumber,
    title: prResponse.data.title ?? "",
    description: prResponse.data.body ?? "",
    baseBranch: prResponse.data.base.ref, // branch that the changes are pulled into
    headBranch: prResponse.data.head.ref, // branch where the changes are made
  };
}

export async function getDiff(
  repo: string,
  pullNumber: number,
): Promise<string | null> {
  const response = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: "diff" },
  });
  // @ts-expect-error - response.data is a string
  return response.data;
}

export async function getPullRequestCommentsL(
  repo: string,
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

export async function getPullRequestComments(
  repo: string,
  pullNumber: number,
): Promise<Comment[]> {
  let comments: Comment[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const { data } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });

    comments = [
      ...comments,
      ...data.map((comment) => ({
        body: comment.body,
        path: comment.path,
        line: comment.line as number,
      })),
    ];

    if (data.length < 100) {
      hasNextPage = false;
    } else {
      page++;
    }
  }

  return comments;
}

export async function pushReviewComment(
  repo: string,
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
  return aiResponses.flatMap((aiResponse) => {
    if (!file.to) {
      return [];
    }
    return {
      body: `[AI review]: ${aiResponse.reviewComment}`,
      path,
      line: Number(aiResponse.lineNumber),
    };
  });
}

export async function getFile(
  repo: string,
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

export async function fileData(
  repo: string,
  path: string,
  branch: string,
): Promise<Record<string, any>> {
  const data = await getFile(repo, path, branch);
  const content = Buffer.from(data?.content ?? "", "base64").toString();
  const lines = content.split("\n");
  return { lines: lines.length, path };
}

export async function getOpenPullRequestsAssignedToMe(
  repo: string,
  pullRequestId: number,
): Promise<PRDetails[]> {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullRequestId,
    state: "all",
  });

  return [
    {
      owner,
      repo,
      pullNumber: pullRequestId,
      title: data.title,
      description: data.body ?? "",
    },
  ];

  // return data
  //   .filter((pr) => {
  //     return pr.requested_reviewers?.find(
  //       (r) =>
  //         r.login === process.env.GITHUB_USERNAME &&
  //         pr.number === (pullRequestId || pr.number),
  //     );
  //   })
  //   .map((pr) => ({
  //     owner,
  //     repo,
  //     pullNumber: pr.number,
  //     title: pr.title,
  //     description: pr.body ?? "",
  //   }));
}
