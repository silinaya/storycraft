'use server'

import { generateImageRest } from '@/lib/imagen';

export async function regenerateImage(prompt: string) {
  try {
    console.log('Regenerating image with prompt:', prompt);
    const resultJson = await generateImageRest(prompt);
    if (resultJson.predictions[0].raiFilteredReason) {
      throw new Error(resultJson.predictions[0].raiFilteredReason)
    } else {
      console.log('Generated image:', resultJson.predictions[0].gcsUri);
      return { imageGcsUri: resultJson.predictions[0].gcsUri };
    }
  } catch (error) {
    console.error('Error generating image:', error);
    return { imageGcsUri: undefined };
  }
}

export async function regenerateCharacterImage(prompt: string) {
  try {
    console.log('Regenerating character image with prompt:', prompt);
    const resultJson = await generateImageRest(prompt, "1:1", false);
    if (resultJson.predictions[0].raiFilteredReason) {
      throw new Error(resultJson.predictions[0].raiFilteredReason)
    } else {
      console.log('Generated character image:', resultJson.predictions[0].gcsUri);
      return { imageGcsUri: resultJson.predictions[0].gcsUri };
    }
  } catch (error) {
    console.error('Error generating character image:', error);
    return { imageGcsUri: undefined };
  }
}

