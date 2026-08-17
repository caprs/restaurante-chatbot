import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";

const router = Router();

router.post("/send", ChatController.sendMessage);

export { router as chatRoutes };
