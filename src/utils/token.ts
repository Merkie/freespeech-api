import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./env";

export function generateTokens(userId: string) {
  const httpToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "30d",
  });

  return {
    token: httpToken,
  };
}

export function verifyToken(token: string) {
  let userId = "";

  try {
    let payload = jwt.verify(token, JWT_SECRET);
    userId = (payload as { userId: string }).userId || "";
  } catch {}

  if (!userId) return null;

  return userId;
}
