import { Request, Response } from "express";
import prisma from "../utils/prisma";

export const currentUser = async (req: Request, res: Response) => {
  const fullUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { Project: true },
  });
  return res.json({ user: fullUser });
};

export const updateUser = async (req: Request, res: Response) => {
  // Implementation here
};

export const deleteUser = async (req: Request, res: Response) => {
  // Implementation here
};
