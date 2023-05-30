import { Router } from "express";
import { generateWithElevenLabs } from "../controllers/ttsController";

const router = Router();

router.post("/elevenlabs/generate", generateWithElevenLabs);

export default router;
