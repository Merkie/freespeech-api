import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { User } from "@prisma/client";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const [scheme, token] = authHeader.split(" ");
  console.log(scheme, token);

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: "Token malformatted" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      data: Omit<User, "password">;
    };
    req.user = payload.data;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
};

export const authWithoutErrorMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const [scheme, token] = authHeader.split(" ");

  if (!/^Bearer$/i.test(scheme)) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      data: Omit<User, "password">;
    };
    req.user = payload.data;

    next();
  } catch (err) {
    return next();
  }
};
