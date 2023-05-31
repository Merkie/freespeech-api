import express from "express";
import routes from "./routes";
import dotenv from "dotenv";
dotenv.config();

const port = 3000;

const app = express();

app.use(express.json());

app.use("/v1", routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
