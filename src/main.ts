import { config } from "dotenv";
config(); // This loads the environment variables from the .env file
import { runCodeReview } from "./codeReview";

runCodeReview().catch((error) => {
  console.error(error);
  process.exit(1);
});
