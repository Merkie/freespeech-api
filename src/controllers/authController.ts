import { Request, Response } from "express";
import prisma from "../utils/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import oneWeek from "../utils/oneWeek";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const fetchedUser = await prisma.user.findUnique({ where: { email } });
  if (!fetchedUser)
    return res
      .status(400)
      .json({ error: "User with this email does not exist" });

  const passwordComparison = await bcrypt.compare(
    password,
    fetchedUser.password
  );
  if (!passwordComparison)
    return res.status(400).json({ error: "Password is incorrect" });

  // remove hashed password from user object
  delete (fetchedUser as any).password;

  const token = jwt.sign(
    {
      data: fetchedUser,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  return res.status(200).json({ token });
};

export const register = async (req: Request, res: Response) => {
  // Implementation here
};
