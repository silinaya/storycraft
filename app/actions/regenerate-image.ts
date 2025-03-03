'use server'

import { experimental_generateImage as generateImage } from 'ai'
import { createVertex } from '@ai-sdk/google-vertex'

const vertex = createVertex({
  project: process.env.PROJECT_ID,
  location: process.env.LOCATION,
})

export async function regenerateImage(prompt: string) {
  try {
    console.log('Regenerating image with prompt:', prompt);

    const { images } = await generateImage({
      model: vertex.image('imagen-3.0-generate-002'),
      prompt: prompt,
      n: 1,
      aspectRatio: '16:9'
    });

    if (!images || images.length === 0) {
      console.error('Error: No image data received from AI');
      throw new Error('No image data received from AI');
    }

    const imageBase64 = images[0].base64;
    console.log('Generated image base64:', imageBase64.substring(0, 50) + '...');

    return { imageBase64 };
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

