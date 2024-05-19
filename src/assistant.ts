import { getOpenAI } from "./openAIClient";
import * as fs from "fs";

const openai = getOpenAI();

export async function createThread() {
  return await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content:
          "Do the code review for my PR. I will provide the diff and file attached one by one.",
      },
    ],
  });
}

export async function runThread(
  threadId: string,
  prompt: string,
  fileId?: string,
) {
  // const thread = await createThread(prompt);
  return await openai.beta.threads.runs.create(
    threadId,
    {
      assistant_id: process.env.ASSISTANT_ID as string,
      stream: true,
      additional_messages: [
        {
          role: "user",
          content: prompt,
          attachments: fileId
            ? [
                {
                  file_id: fileId,
                  tools: [{ type: "file_search" }],
                },
              ]
            : [],
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    },
  );
}

export async function cancelRun(threadId: string, runId: string) {
  return await openai.beta.threads.runs.cancel(threadId, runId);
}

export async function createOpenAIFile(file: string) {
  return await openai.files.create({
    file: fs.createReadStream(file),
    purpose: "assistants",
  });
}
