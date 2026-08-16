import { redis } from "../config/redis";

export interface ChatMessageCache {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

// Tempo padrão de expiração da sessão (ex: 1 hora em segundos)
const DEFAULT_TTL_SECONDS = 3600;

export class CacheService {
  /**
   * Adiciona uma nova mensagem ao histórico do chat no Redis
   * e renova o tempo de expiração (TTL) da sessão.
   */
  static async appendMessage(
    conversationId: string,
    message: ChatMessageCache,
    ttlInSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const key = `chat:${conversationId}`;
    const payload = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });

    // Adiciona ao final da lista no Redis
    await redis.rPush(key, payload);

    // Atualiza o TTL da chave para expirar se o usuário ficar inativo
    await redis.expire(key, ttlInSeconds);
  }

  /**
   * Recupera todo o histórico de mensagens salvas na memória RAM para a conversa
   */
  static async getHistory(conversationId: string): Promise<ChatMessageCache[]> {
    const key = `chat:${conversationId}`;
    const rawMessages = await redis.lRange(key, 0, -1);

    return rawMessages.map((msg) => JSON.parse(msg) as ChatMessageCache);
  }

  /**
   * Limpa explicitamente o histórico em cache (ex: ao encerrar/fechar o atendimento)
   */
  static async clearHistory(conversationId: string): Promise<void> {
    const key = `chat:${conversationId}`;
    await redis.del(key);
  }

  /**
   * Mantém apenas as últimas N mensagens em cache para economizar memória e ajustar à janela de contexto
   */
  static async trimHistory(
    conversationId: string,
    keepLastN: number = 10,
  ): Promise<void> {
    const key = `chat:${conversationId}`;
    // LTRIM mantém apenas os elementos do índice start ao stop
    await redis.lTrim(key, -keepLastN, -1);
  }
}
