// app/actions/imageActions.ts
'use server'

import { uploadImage } from '@/lib/storage'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

export async function resizeImage(base64Image: string): Promise<string> {
  console.log('Resizing image')
  try {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    const resizedImageBuffer = await sharp(buffer)
      .resize(1792, 1024, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0 } // Black background for initial resize
      })
      // .flatten({ background: '#FFFFFF' })
      // .extend({
      //   top: 256, 
      //   bottom: 256, 
      //   left: 256, 
      //   right: 256,
      //   background: { r: 255, g: 255, b: 255 } // White background for the canvas
      // })
      .toBuffer()

    // resizedImageBuffer to base64
    const uuid = uuidv4()
    const imageGcsUri = await uploadImage(resizedImageBuffer.toString('base64'), `upload-${uuid}.png`)
    if (!imageGcsUri) {
      throw new Error('Failed to upload image to GCS')
    }
    console.log('Image resized!')
    return imageGcsUri
  } catch (error) {
    console.error('Error resizing image:', error)
    throw new Error('Failed to resize image')
  }
}
