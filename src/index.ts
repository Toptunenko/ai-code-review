import { config } from "dotenv";

config(); // This loads the environment variables from the .env file

import { runCodeReview } from "./codeReview";

const [, , repoFullName, pullRequestId] = process.argv;

const repos = process.env.GITHUB_REPO?.split(",") || [];

if (!repos.length && repos.includes(repoFullName)) {
  console.error("No repos specified");
} else {
  for (const repo of repos) {
    console.log(`Running code review for repo: ${repo}`);
    runCodeReview(repo, Number(pullRequestId)).catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }
}
