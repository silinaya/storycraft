'use server'

import { generateText/*, experimental_generateImage as generateImage*/ } from 'ai'
import { createVertex } from '@ai-sdk/google-vertex'
import { generateImageCustomizationRest, generateImageRest } from '@/lib/imagen';

import { Scene, Scenario, Language } from "../types"

const vertex = createVertex({
  project: process.env.PROJECT_ID,
  location: process.env.LOCATION,
})

export async function generateScenes(pitch: string, numScenes: number, style: string, language: Language) {
  try {
    const prompt = `
      You are tasked with generating a creative scenario for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a story pitch. This story pitch will be the foundation for your scenario.

<pitch>
${pitch}
</pitch>

2. Generate a scenario in ${language.name} for an ad movie based on the story pitch. Stick as close as possible to the pitch. Do not include children in your scenario.

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

5. Generate a short description of the music that will be used in the video.

6. After creating the scenario, generate ${numScenes} creative scenes to create a storyboard illustrating the scenario. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A detailed visual description for AI image generation (imagePrompt), the style should be ${style}. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 2. A video prompt, focusing on the movement of the characters, objects, in the scene. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 3. A scene description  in ${language.name} explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text in ${language.name}. One full sentence, 6s max. (voiceover). You can use the character(s) name(s) in your vocieovers. 
a. Each image prompt should describe a key scene or moment from your scenario.
b. Ensure that the image prompts, when viewed in sequence, tell a coherent story.
c. Include descriptions of characters, settings, and actions that are consistent across all image prompts.
d. Make each image prompt vivid and detailed enough to guide the creation of a storyboard illustration.

7. Format your output as follows:
- First, provide a detailed description of your scenario in ${language.name}.
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
 "music": [Short description of the music that will be used in the video],
 "language": {
   "name": "${language.name}",
   "code": "${language.code}"
 },
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
  "voiceover": [A short, narrator voiceover text. One full sentence, 6s max.],
  "charactersPresent": [An array list of names of characters visually present in the scene]
 },
 [...]
 }
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your scenario and prompts.`

    console.log('Create a storyboard')
    const { text } = await generateText({
      model: vertex("gemini-2.0-flash-001"),
      prompt,
      temperature: 1
    })

    console.log('text', text)

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    let scenario: Scenario
    let scenes: Scene[]
    try {
      const cleanedText = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
      const parsedScenario = JSON.parse(cleanedText);
      
      // Ensure the language is set correctly
      scenario = {
        ...parsedScenario,
        language: {
          name: language.name,
          code: language.code
        }
      };
      
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

    const charactersWithImages = await Promise.all(scenario.characters.map(async (character, index) => {
      try {
        console.log(`Generating image for scene ${index + 1}`);
        const resultJson = await generateImageRest(`${style}: ${character.description}`, "1:1");
        if (resultJson.predictions[0].raiFilteredReason) {
            throw new Error(resultJson.predictions[0].raiFilteredReason)
        } else {
            console.log('Generated image base64:', resultJson.predictions[0].bytesBase64Encoded.substring(0, 50) + '...');
            return { ...character, imageBase64: resultJson.predictions[0].bytesBase64Encoded };
        }
      } catch (error) {
        console.error('Error generating image:', error);
        return { ...character, imageBase64: '' };
      }
    }))

    scenario.characters = charactersWithImages

    // If we have fewer scenes than requested, add placeholder scenes
    while (scenes.length < numScenes) {
      scenes.push({
        imagePrompt: "A blank canvas waiting to be filled with imagination",
        videoPrompt: "Describe what is happening in the video",
        description: "This scene is yet to be created. Let your imagination run wild!",
        voiceover: "What happens next? The story is yours to continue...",
        charactersPresent: [],
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
        let resultJson;
        if (false && scene.charactersPresent.length > 0) {
          const presentCharacters = charactersWithImages.filter(character =>
            scene.charactersPresent.includes(character.name)
          );

          if (presentCharacters.length > 0) {
             console.log(`Using character customization for characters: ${presentCharacters.map(c => c.name).join(', ')}`);
             resultJson = await generateImageCustomizationRest(scene.imagePrompt, presentCharacters);
          } else {
             console.warn(`Scene ${index + 1} listed characters [${scene.charactersPresent.join(', ')}] but no matching data found in charactersWithImages. Falling back to standard generation.`);
             resultJson = await generateImageRest(scene.imagePrompt);
          }
        } else {
          resultJson = await generateImageRest(scene.imagePrompt);
        }
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

