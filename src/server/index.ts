import express from "express";

const app = express();
const port = 3000;

const router = express.Router();

router.get("/", function (req, res) {
  res.send("Hello World!");
});

app.use("/", router);

app.listen(port, () => {
  console.log(`FreeSpeech Server running at http://localhost:${port}`);
});
