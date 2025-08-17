'use server'

import { generateImageRest } from '@/lib/imagen';
import { uploadImage } from '@/lib/storage';

/**
 * 生成场景图片
 * - 优先使用 Vertex 返回的 gcsUri
 * - 当 gcsUri 缺失但存在 bytesBase64Encoded 时，回退：将 base64 上传到 GCS 并返回 gs://... URI
 * - 保留 RAI 过滤与健壮性判空
 */
export async function regenerateImage(prompt: string) {
  try {
    console.log('Regenerating image with prompt:', prompt);
    const resultJson = await generateImageRest(prompt);
    const pred = resultJson?.predictions?.[0];
    if (!pred) throw new Error('No predictions returned from Vertex Imagen.');
    if (pred.raiFilteredReason) throw new Error(pred.raiFilteredReason);

    let gcsUri = pred.gcsUri;

    // Fallback: preview model may only return base64
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
    if (error instanceof Error) {
      return { imageGcsUri: undefined, errorMessage: error.message };
    }
    return { imageGcsUri: undefined };
  }
}

/**
 * 生成角色头像（1:1）
 * - 同样采用 gcsUri 优先 + base64 回退上传
 */
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
    if (error instanceof Error) {
      return { imageGcsUri: undefined, errorMessage: error.message };
    }
    return { imageGcsUri: undefined };
  }
}
