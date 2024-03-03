import express from "express";

const app = express();
const port = 3000;

const router = express.Router();

// Define a simple route
router.get("/", function (req, res) {
  res.send("Hello World!");
});

// Use routes
app.use("/", router);

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
