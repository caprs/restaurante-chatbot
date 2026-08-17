import { prisma } from "../config/prisma";
import { AIService } from "./ai.service";
import { CacheService } from "./cache.service";

export interface ProcessMessageDTO {
  conversationId: string;
  userMessage: string;
}

export class ChatService {
  static async processMessage({
    conversationId,
    userMessage,
  }: ProcessMessageDTO) {
    //1. Busca a conversa no PostgreSQL
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { user: true, restaurant: true },
    });

    if (!conversation) {
      throw new Error("Conversa não encontrada");
    }

    if (conversation.status === "CLOSED") {
      throw new Error("Esta conversa já esta encerrada");
    }

    //2. Salva a mensagem do usuário no PostgreSQL e no Redis
    await prisma.message.create({
      data: {
        conversationId,
        role: "USER",
        content: userMessage,
      },
    });

    await CacheService.appendMessage(conversationId, {
      role: "user",
      content: userMessage,
    });

    //3. Recupera o histórico do Redis para enviar à IA
    const history = await CacheService.getHistory(conversationId);

    //4. Gera a resposta da IA via groq
    const aiResponse = await AIService.generateResponse(history);

    //5. Salva a resposta da IA no PostgreSQL e no Redis
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: aiResponse.content,
      },
    });

    await CacheService.appendMessage(conversationId, {
      role: "assistant",
      content: aiResponse.content,
    });

    //Manter apenas as últimas 10 mensagens no Redis para economizar memória
    await CacheService.trimHistory(conversationId, 10);

    //6. Auditoria de Tokens consumidos no PostgreSQL
    await prisma.consumption.create({
      data: {
        conversationId,
        promptTokens: aiResponse.promptTokens,
        responseTokens: aiResponse.completionTokens,
        totalTokens: aiResponse.totalTokens,
      },
    });

    return {
      message: assistantMessage,
      usage: {
        promptTokens: aiResponse.promptTokens,
        responseTokens: aiResponse.completionTokens,
        totalTokens: aiResponse.totalTokens,
      },
    };
  }
}
