import OpeanAI from "openai";
import { ChatMessageCache } from "./cache.service";

const groq = new OpeanAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export interface AIResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const SYSTEM_PROMPT =
  "Você é um assistente virtual inteligente e amigável de um restaurante. Seu objetivo é ajudar os clientes a consultarem o cardápio, tirarem dúvidas sobre os pratos e realizarem os pedidos. Seja cortês, objetivo e responda sempre em Português (Brasil).";

export class AIService {
  static async generateResponse(
    chatHistory: ChatMessageCache[],
  ): Promise<AIResponse> {
    const formattedMessages: OpeanAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...chatHistory.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })),
      ];

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const choice = completion.choices[0];
    const usage = completion.usage;

    return {
      content:
        choice.message.content ||
        "Desculpe, não consegui processar sua resposta no momento",
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
    };
  }
}
