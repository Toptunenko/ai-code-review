import util from "util";
import { exec } from "child_process";
import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  APIGatewayProxyContext,
} from "aws-lambda";

const execPromise = util.promisify(exec);

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayProxyContext,
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    if (event.action === "review_requested") {
      const reviewer = event.requested_reviewer.login;
      console.log(`Reviewer: ${reviewer}`);
      if (reviewer !== process.env.GITHUB_USERNAME) {
        console.log(`Review requested for ${reviewer}`);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Event not processed" }),
        };
      }

      const pullRequest = event.pull_request;
      const repoFullName = event.repository.full_name;
      const pullRequestId = pullRequest.number;

      console.log(
        `New pull request created in ${repoFullName}: ${pullRequest.title}`,
      );

      try {
        await execPromise(`node index.js ${repoFullName} ${pullRequestId}`);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Success" }),
        };
      } catch (error) {
        console.error(`Error executing script: ${error}`);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Internal Server Error" }),
        };
      }
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Event not processed" }),
      };
    }
  } catch (error) {
    console.error(`Error parsing event: ${error}`);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request" }),
    };
  }
};
