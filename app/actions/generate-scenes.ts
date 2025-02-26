'use server'

import { generateText/*, experimental_generateImage as generateImage*/ } from 'ai'
import { createVertex } from '@ai-sdk/google-vertex'
import { generateImageRest } from '@/lib/imagen';

const vertex = createVertex({
  project: 'svc-demo-vertex',
  location: 'us-central1',
})

interface Scenario {
    scenario: string;
    genre: string;
    mood: string;
    characters: Array<{name:string, description: string}>;
    settings: Array<{name:string, description: string}>;
    scenes: Scene[];
}

interface Scene {
  imagePrompt: string;
  videoPrompt: string;
  description: string;
  voiceover: string;
  imageUrl?: string;
  imageBase64?: string;
  videoUri?: string
}

export async function generateScenes(pitch: string, numScenes: number, style: string) {
  try {
    const prompt = `
      You are tasked with generating a creative scenario for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a story pitch. This story pitch will be the foundation for your scenario.

<pitch>
${pitch}
</pitch>

2. Generate a scenario for an ad movie based on the story pitch. Stick as close as possible to the pitch. Do not include children in your scenario.

3. What Music Genre will best fit this video, pick from: 
- Alternative & Punk
- Ambient
- Children's
- Cinematic
- Classical
- Country & Folk
- Dance & Electronic
- Hip-Hop & Rap
- Holiday
- Jazz & Blues
- Pop
- R&B & Soul
- Reggae
- Rock

4. What is the mood of this video, pick from:
- Angry
- Bright
- Calm
- Dark
- Dramatic
- Funky
- Happy
- Inspirational
- Romantic
- Sad

5. After creating the scenario, generate ${numScenes} creative scenes to create a storyboard illustrating the scenario. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A detailed visual description for AI image generation (imagePrompt), the style should be ${style}. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 2. A video prompt, focusing on the movement of the characters, objects, in the scene. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 3. A scene description explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text. One full sentence, 6s max. (voiceover). You can use the character(s) name(s) in your vocieovers.
a. Each image prompt should describe a key scene or moment from your scenario.
b. Ensure that the image prompts, when viewed in sequence, tell a coherent story.
c. Include descriptions of characters, settings, and actions that are consistent across all image prompts.
d. Make each image prompt vivid and detailed enough to guide the creation of a storyboard illustration.

6. Format your output as follows:
- First, provide a brief description of your scenario.
- Then from this scenario provide a short description of each character in the story inside the characters key.
- Then from this scenario provide a short description of each setting in the story inside the settings key.
- Then, list the ${numScenes} scenes
- Each image prompt in the scenes should reuse the full characters and settings description generated on the <characters> and <settings> tags every time, on every prompt
- Do not include any additional text or explanations between the prompts.

Format the response as a JSON object.
Here's an example of how your output should be structured:
{
 "scenario": "[Brief description of your creative scenario based on the given story pitch]",
 "genre": [Music genre],
 "mood": [Mood],
 "characters": [
  {"name": [character 1 name], "description": [character 1 description]},
  {"name": [character 2 name], "description": [character 2 description]},
  [...]
 ],
 "settings": [
  {"name": [setting 1 name], "description": [setting 1 description]},
  {"name": [setting 2 name], "description": [setting 2 description]},
  [...]
 ],
 "scenes": [
 {
  "imagePrompt": [A detailed visual description for AI image generation, the style should always be cinematic and photorealistic],
  "videoPrompt": [A video prompt, focusing on the movement of the characters, objects, in the scene],
  "description": [A scene description explaining what happens],
  "voiceover": [A short, narrator voiceover text. One full sentence, 6s max.]
 },
 [...]
 }
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your scenario and prompts.`

    console.log('Create a storyboard')
    const { text } = await generateText({
      model: vertex("gemini-2.0-flash-exp"),
      prompt,
      temperature: 1
    })

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    let scenario: Scenario
    let scenes: Scene[]
    try {
      const cleanedText = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
      scenario = JSON.parse(cleanedText);
      console.log(scenario.scenario)
      console.log(scenario.characters)
      console.log(scenario.settings)
      scenes = scenario.scenes;
      console.log(scenes)
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
        videoPrompt: "Describe what is happening in the video",
        description: "This scene is yet to be created. Let your imagination run wild!",
        voiceover: "What happens next? The story is yours to continue..."
      })
    }

    // If we have more scenes than requested, trim the excess
    if (scenes.length > numScenes) {
      scenes = scenes.slice(0, numScenes)
    }

    // Generate images for each scene
    const scenesWithImages = await Promise.all(scenes.map(async (scene, index) => {
      try {
        // const { images } = await generateImage({
        //   model: vertex.image('imagen-3.0-generate-001'),
        //   prompt: scene.imagePrompt,
        //   n: 1,
        //   aspectRatio: '16:9'
        // });
        console.log(`Generating image for scene ${index + 1}`);
        const resultJson = await generateImageRest(scene.imagePrompt);
        if (resultJson.predictions[0].raiFilteredReason) {
            throw new Error(resultJson.predictions[0].raiFilteredReason)
        } else {
            console.log('Generated image base64:', resultJson.predictions[0].bytesBase64Encoded.substring(0, 50) + '...');
            return { ...scene, imageBase64: resultJson.predictions[0].bytesBase64Encoded };
        }
      } catch (error) {
        console.error('Error generating image:', error);
        return { ...scene, imageBase64: '' };
      }
    }));

    scenario.scenes = scenesWithImages

    return scenario
  } catch (error) {
    console.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

