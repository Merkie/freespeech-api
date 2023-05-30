import { Request, Response } from "express";
import prisma from "../utils/prisma";

export const createProject = async (req: Request, res: Response) => {
  // Implementation here
};

export const fetchProject = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Project id is required" });

  const fetchedProject = await prisma.project.findUnique({
    where: { id },
    include: { pages: true },
  });
  if (!fetchedProject)
    return res.status(404).json({ error: "Project not found" });

  if (fetchedProject.userId !== req.user?.id)
    return res
      .status(403)
      .json({ error: "You are not allowed to access this project" });

  return res.json({ project: fetchedProject });
};

export const updateProject = async (req: Request, res: Response) => {
  // Implementation here
};

export const deleteProject = async (req: Request, res: Response) => {
  // Implementation here
};

export const createPage = async (req: Request, res: Response) => {
  // Implementation here
};

export const fetchPage = async (req: Request, res: Response) => {
  // Implementation here
};

export const updatePage = async (req: Request, res: Response) => {
  // Implementation here
};

export const deletePage = async (req: Request, res: Response) => {
  // Implementation here
};
