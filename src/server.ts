import express from "express";
import routes from "./routes";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

const port = 3000;

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(
  cors({
    origin: "*",
  })
);

app.use("/v1", routes);
app.use(
  "/uploads",
  express.static(path.join("/", "root", "freespeech-api", "uploads"))
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
