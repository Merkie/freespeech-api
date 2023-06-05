import { Request, Response } from "express";
import * as fs from "fs";
import Jimp from "jimp";

export const upload = async (req: Request, res: Response) => {
  try {
    const { base64data, ext } = req.body;

    // Decode base64 data into a Buffer
    const fileData = Buffer.from(base64data, "base64");

    // Generate a unique filename
    const filename = `${Date.now()}.${ext}`;

    // Specify the file path to save
    const filePath = `/root/freespeech-api/uploads/${filename}`;

    // Use jimp to resize the image
    const image = await Jimp.read(fileData);
    image.resize(256, Jimp.AUTO).write(filePath);

    res.status(200).json({
      message: "File uploaded successfully",
      url: `/uploads/${filename}`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while uploading the file" });
  }
};

export const deleteMedia = async (req: Request, res: Response) => {
  // Implementation here
};

export const searchGoogleImages = async (req: Request, res: Response) => {
  // Implementation here
};
