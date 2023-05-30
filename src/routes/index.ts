import { Router } from "express";
import authRoutes from "./authRoutes";
import mailRoutes from "./mailRoutes";
import mediaRoutes from "./mediaRoutes";
import projectRoutes from "./projectRoutes";
import ttsRoutes from "./ttsRoutes";
import userRoutes from "./userRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/mail", mailRoutes);
router.use("/media", mediaRoutes);
router.use("/project", projectRoutes);
router.use("/tts", ttsRoutes);
router.use("/user", userRoutes);

export default router;
