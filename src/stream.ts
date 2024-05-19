import { Stream } from "openai/streaming";
import * as AssistantsAPI from "openai/resources/beta/assistants";

export async function streamResult(
  stream: Stream<AssistantsAPI.AssistantStreamEvent>,
) {
  let chunks = [];
  let count = 0;

  for await (const chunk of stream) {
    switch (chunk.event) {
      case "thread.message.delta":
        const content: any = chunk?.data?.delta?.content?.[0];
        chunks.push(content.text.value);
        count++;
        // console.log(content.text.value);
        break;
    }
  }

  // Log any remaining chunks
  if (chunks.length > 0) {
    // console.log(chunks.join(''));
  }

  // remove \n, ``` and json from the response
  // remove any text before first { and after last }
  return chunks
    .join("")
    .replace(/\n/g, "")
    .replace(/```/g, "")
    .replace(/json/g, "")
    .replace(/.*?{/, "{");
}
