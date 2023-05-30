import { Router } from "express";
import {
  createProject,
  fetchProject,
  updateProject,
  deleteProject,
  createPage,
  fetchPage,
  updatePage,
  deletePage,
} from "../controllers/projectController";
import { authWithoutErrorMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/create", createProject);
router.get("/:id", authWithoutErrorMiddleware, fetchProject);
router.post("/:id/update", updateProject);
router.delete("/:id/delete", deleteProject);
router.post("/:id/page/create", createPage);
router.get("/:id/page/:pageId", fetchPage);
router.post("/:id/page/:pageId/update", updatePage);
router.delete("/:id/page/:pageId/delete", deletePage);

export default router;
