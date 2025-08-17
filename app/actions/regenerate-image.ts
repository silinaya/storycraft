'use server'

import { generateImageRest } from '@/lib/imagen';
import { uploadImage } from '@/lib/storage';

export async function regenerateImage(prompt: string) {
  try {
    console.log('Regenerating image with prompt:', prompt);
    const resultJson = await generateImageRest(prompt);
    const pred = resultJson?.predictions?.[0];
    if (!pred) throw new Error('No predictions returned from Vertex Imagen.');
    if (pred.raiFilteredReason) throw new Error(pred.raiFilteredReason);

    let gcsUri = pred.gcsUri;

    // Fallback: preview model may return only base64
    if (!gcsUri && pred.bytesBase64Encoded) {
      const filename = `scene_${Date.now()}.png`;
      const uploaded = await uploadImage(pred.bytesBase64Encoded, filename);
      if (!uploaded) throw new Error('Failed to upload generated image to GCS');
      gcsUri = uploaded;
    }

    console.log('Generated image gcsUri:', gcsUri);
    return { imageGcsUri: gcsUri };
  } catch (error) {
    console.error('Error generating image:', error);
    if (error instanceof Error) return { imageGcsUri: undefined, errorMessage: error.message };
    return { imageGcsUri: undefined };
  }
}

export async function regenerateCharacterImage(prompt: string) {
  try {
    console.log('Regenerating character image with prompt:', prompt);
    const resultJson = await generateImageRest(prompt, "1:1", false);
    const pred = resultJson?.predictions?.[0];
    if (!pred) throw new Error('No predictions returned from Vertex Imagen.');
    if (pred.raiFilteredReason) throw new Error(pred.raiFilteredReason);

    let gcsUri = pred.gcsUri;

    if (!gcsUri && pred.bytesBase64Encoded) {
      const filename = `character_${Date.now()}.png`;
      const uploaded = await uploadImage(pred.bytesBase64Encoded, filename);
      if (!uploaded) throw new Error('Failed to upload generated character image to GCS');
      gcsUri = uploaded;
    }

    console.log('Generated character image gcsUri:', gcsUri);
    return { imageGcsUri: gcsUri };
  } catch (error) {
    console.error('Error generating image:', error);
    if (error instanceof Error) return { imageGcsUri: undefined, errorMessage: error.message };
    return { imageGcsUri: undefined };
  }
}
