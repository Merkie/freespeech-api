import { Router } from "express";
import {
  currentUser,
  deleteUser,
  updateUser,
} from "../controllers/userController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/me", authMiddleware, currentUser);
router.post("/:id/update", updateUser);
router.delete("/:id/delete", deleteUser);

export default router;
