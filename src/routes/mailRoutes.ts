import { Router } from "express";
import {
  verify,
  verifyEmail,
  changePassword,
} from "../controllers/mailController";

const router = Router();

router.post("/verify", verify);
router.get("/verify-email", verifyEmail);
router.post("/change-password", changePassword);

export default router;
