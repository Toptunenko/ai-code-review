import { getOpenAI } from "./openAIClient";
import * as fs from "fs";
import { streamResult } from "./stream";
import { TokenCount } from "./types/openAI";

const openai = getOpenAI();

export async function createThread() {
  return await openai.beta.threads.create({});
}

export async function runPrompt(threadId: string, prompt: string) {
  await addMessage(threadId, prompt);
  let stream = await runThread(threadId);
  return await streamResult(stream);
}

export async function addMessage(threadId: string, message: string) {
  return await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message,
  });
}

export async function runThread(threadId: string) {
  return await openai.beta.threads.runs.create(
    threadId,
    {
      assistant_id: process.env.ASSISTANT_ID as string,
      stream: true,
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

export async function calculateRunTokenCount(
  threadId: string,
): Promise<TokenCount> {
  const run = await getRun(threadId);

  return run?.data?.reduce(
    (acc: TokenCount, run: any) => {
      const usage = run.usage;
      return {
        prompt_tokens: acc.prompt_tokens + usage.prompt_tokens,
        completion_tokens: acc.completion_tokens + usage.completion_tokens,
        total_tokens: acc.total_tokens + usage.total_tokens,
        total_price: calculatePrice(acc),
      };
    },
    {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      total_price: 0,
    },
  );
}

//
// 1M prompt_tokens = $5
// 1M completion_tokens = $15
function calculatePrice(tokens: TokenCount): number {
  return (
    (tokens.prompt_tokens / 1e6) * 5 + (tokens.completion_tokens / 1e6) * 15
  );
}

export async function getRun(threadId: string) {
  return await openai.beta.threads.runs.list(threadId);
}

export async function createOpenAIFile(file: string) {
  if (!file) {
    return null;
  }
  return await openai.files.create({
    file: fs.createReadStream(file),
    purpose: "assistants",
  });
}
