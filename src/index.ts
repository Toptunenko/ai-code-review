import { config } from "dotenv";

config(); // This loads the environment variables from the .env file

import { runCodeReview } from "./codeReview";
import { ArgsMode } from "./types/args";

const [, , repoFullName, pullRequestId, mode] = process.argv;

console.log(`Running code review for ${repoFullName}#${pullRequestId}`);

const repos = process.env.GITHUB_REPO?.split(",") || [];

if (!repos.length && repos.includes(repoFullName)) {
  console.error("No repos specified");
} else {
  console.log(`Running code review for repo: ${repoFullName}`);
  runCodeReview(
    repoFullName,
    Number(pullRequestId),
    mode || ArgsMode.read,
  ).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
