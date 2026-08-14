import { createOpenAI } from '@ai-sdk/openai'
export const llama = createOpenAI({
  baseURL: process.env.LLAMA_BASE_URL!,
  apiKey: process.env.LLAMA_API_KEY!,
})