import type { NextFunction, Request, Response } from "express";

export const get = [
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.json({ message: "Hello World" });
  },
];
