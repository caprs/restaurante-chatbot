import { Request, Response } from "express";
import { ChatService } from "../services/chat.service";

export class ChatController {
  static async sendMessage(req: Request, res: Response) {
    try {
      const { conversationId, message } = req.body;

      if (!conversationId || !message) {
        return res
          .status(400)
          .json({ error: "conversationId e message são obrigatórios." });
      }

      const result = await ChatService.processMessage({
        conversationId,
        userMessage: message,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro no processamento do chat:", error);
      return res
        .status(500)
        .json({ error: error.message || "Erro interno no servidor." });
    }
  }
}
