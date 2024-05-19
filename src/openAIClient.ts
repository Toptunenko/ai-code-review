import OpenAI from "openai";

const openai = new OpenAI();

export function getOpenAI() {
    return openai;
}