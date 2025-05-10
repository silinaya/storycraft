'use server';

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // You'll need to install this: npm install uuid @types/uuid

export async function saveImageToPublic(base64String: string, originalFilename: string): Promise<string> {
  try {
    // Extract the file extension from the original filename
    const fileExtension = path.extname(originalFilename).toLowerCase();
    
    // Create a unique filename
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    
    // Define the directory and full path where the image will be saved
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Remove the data URL prefix and convert base64 to buffer
    const base64Data = base64String.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Write the file to the public directory
    fs.writeFileSync(filePath, buffer);
    
    // Return the public URL path to the saved image
    return `/uploads/${uniqueFilename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    throw new Error('Failed to save image');
  }
}