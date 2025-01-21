'use server'

import { generateText, experimental_generateImage as generateImage } from 'ai'
import { createVertex } from '@ai-sdk/google-vertex'

const vertex = createVertex({
  project: 'svc-demo-vertex',
  location: 'us-central1',
})

interface Scene {
  imagePrompt: string;
  description: string;
  voiceover: string;
  imageUrl?: string;
  imageBase64?: string;
}

export async function generateScenes(pitch: string, numScenes: number) {
  try {
    const prompt = `
      Create a storyboard with ${numScenes} scenes based on this story pitch: "${pitch}"
      
      For each scene, provide:
      1. A detailed visual description for AI image generation (imagePrompt)
      2. A scene description explaining what happens (description)
      3. Narrator voiceover text (voiceover)
      
      Format the response as a JSON array with ${numScenes} objects containing these exact keys: imagePrompt, description, voiceover.
      Make the image prompts detailed and specific for best results with AI image generation.
    `

    const { text } = await generateText({
      model: vertex("gemini-1.5-flash-002"),
      prompt,
    })

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    let scenes: Scene[]
    try {
      const cleanedText = text.replace(/\`\`\`json|\`\`\`/g, '').trim()
      scenes = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Error parsing AI response:', text)
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    if (!Array.isArray(scenes)) {
      throw new Error('Invalid scene data structure: expected an array')
    }

    // If we have fewer scenes than requested, add placeholder scenes
    while (scenes.length < numScenes) {
      scenes.push({
        imagePrompt: "A blank canvas waiting to be filled with imagination",
        description: "This scene is yet to be created. Let your imagination run wild!",
        voiceover: "What happens next? The story is yours to continue..."
      })
    }

    // If we have more scenes than requested, trim the excess
    if (scenes.length > numScenes) {
      scenes = scenes.slice(0, numScenes)
    }

    // Generate images for each scene
    const scenesWithImages = await Promise.all(scenes.map(async (scene) => {
      try {
        const { images } = await generateImage({
          model: vertex.image('imagen-3.0-generate-001'),
          prompt: scene.imagePrompt,
          n: 1,
          aspectRatio: '16:9'
        });
        console.log('Generated image base64:', images[0].base64.substring(0, 50) + '...');
        return { ...scene, imageBase64: images[0].base64 };
      } catch (error) {
        console.error('Error generating image:', error);
        return { ...scene, imageBase64: '' };
      }
    }));

    return scenesWithImages
  } catch (error) {
    console.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

