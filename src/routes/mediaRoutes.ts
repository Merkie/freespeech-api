import { Router } from "express";
import {
  upload,
  deleteMedia,
  searchGoogleImages,
} from "../controllers/mediaController";

const router = Router();

router.post("/upload", upload);
router.delete("/delete/:id", deleteMedia);
router.post("/search/google-images/:query", searchGoogleImages);

export default router;
