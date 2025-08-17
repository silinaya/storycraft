'use server'

import { generateImageCustomizationRest, generateImageRest } from '@/lib/imagen';
import { getScenarioPrompt, getScenesPrompt } from '@/app/prompts';
import { generateText } from '@/lib/gemini'
import { Type } from '@google/genai';

import { Scenario, Language } from "../types"
import { uploadImage } from '@/lib/storage';

export async function generateScenes(pitch: string, numScenes: number, style: string, language: Language) {
  try {
    const prompt = getScenarioPrompt(pitch, numScenes, style, language);
    console.log('Create a scenario')
    const text = await generateText(
      prompt,
      {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: -1,
        },
        responseMimeType: 'application/json',
      }
    )
    console.log('text', text)

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    let scenario: Scenario
    try {
      const parsedScenario = JSON.parse(text);
      console.log('json', parsedScenario)

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
    } catch (parseError) {
      console.error('Error parsing AI response:', text)
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    // Generate character images (1:1) with base64→GCS fallback
    const charactersWithImages = await Promise.all(scenario.characters.map(async (character, index) => {
      try {
        console.log(`Generating image for scene ${index + 1}`);
        const resultJson = await generateImageRest(`${style}: ${character.description}`, "1:1");
        const pred = resultJson?.predictions?.[0];
        if (!pred) throw new Error('No predictions returned from Vertex Imagen.');
        if (pred.raiFilteredReason) throw new Error(pred.raiFilteredReason);

        let gcsUri = pred.gcsUri;
        if (!gcsUri && pred.bytesBase64Encoded) {
          const filename = `character_${index + 1}_${Date.now()}.png`;
          const uploaded = await uploadImage(pred.bytesBase64Encoded, filename);
          if (!uploaded) throw new Error('Failed to upload generated character image to GCS');
          gcsUri = uploaded;
        }

        console.log('Generated image gcsUri:', gcsUri);
        return { ...character, imageGcsUri: gcsUri };
      } catch (error) {
        console.error('Error generating image:', error);
        return { ...character, imageGcsUri: undefined };
      }
    }))

    scenario.characters = charactersWithImages
    return scenario
  } catch (error) {
    console.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


export async function generateStoryboard(scenario: Scenario, numScenes: number, style: string, language: Language): Promise<Scenario> {
  console.log('Create a storyboard')
  console.log(scenario.scenario)
  try {
    // Create a new scenario object to ensure proper serialization
    const newScenario: Scenario = {
      ...scenario,
      scenes: []
    };

    const prompt = getScenesPrompt(scenario, numScenes, style, language)
    const text = await generateText(
      prompt,
      {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: -1,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            'scenes': {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  'imagePrompt': {
                    type: Type.STRING,
                    nullable: false,
                  },
                  'videoPrompt': {
                    type: Type.STRING,
                    nullable: false,
                  },
                  'description': {
                    type: Type.STRING,
                    nullable: false,
                  },
                  'voiceover': {
                    type: Type.STRING,
                    nullable: false,
                  },
                  'charactersPresent': {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING
                    }
                  }
                },
                required: ['imagePrompt', 'videoPrompt', 'description', 'voiceover', 'charactersPresent'],
              }
            }
          },
          required: ['scenes'],
        },
      }
    )
    console.log('text', text)

    if (!text) {
      throw new Error('No text generated from the AI model')
    }

    try {
      const parsedScenes = JSON.parse(text);
      newScenario.scenes = parsedScenes.scenes
      console.log('Server side scenes after parsing:', newScenario.scenes)
    } catch (parseError) {
      console.error('Error parsing AI response:', text)
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    // Generate images for each scene with base64→GCS fallback
    const scenesWithImages = await Promise.all(newScenario.scenes.map(async (scene, index) => {
      try {
        console.log(`Generating image for scene ${index + 1}`);
        let resultJson;
        const useR2I = false;
        if (useR2I && scene.charactersPresent.length > 0) {
          const presentCharacters = newScenario.characters.filter(character =>
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

        const pred = resultJson?.predictions?.[0];
        if (!pred) throw new Error('No predictions returned from Vertex Imagen.');
        if (pred.raiFilteredReason) throw new Error(pred.raiFilteredReason);

        let gcsUri = pred.gcsUri;
        if (!gcsUri && pred.bytesBase64Encoded) {
          const filename = `scene_${index + 1}_${Date.now()}.png`;
          const uploaded = await uploadImage(pred.bytesBase64Encoded, filename);
          if (!uploaded) throw new Error('Failed to upload generated image to GCS');
          gcsUri = uploaded;
        }

        console.log('Generated image gcsUri:', gcsUri);
        return { ...scene, imageGcsUri: gcsUri };
      } catch (error) {
        console.error('Error generating image:', error);
        if (error instanceof Error) {
          return { ...scene, imageGcsUri: undefined, errorMessage: error.message };
        } else {
          return { ...scene, imageGcsUri: undefined };
        }
      }
    }));

    newScenario.scenes = scenesWithImages
    // Create a fresh copy to ensure proper serialization
    return JSON.parse(JSON.stringify(newScenario))
  } catch (error) {
    console.error('Error generating scenes:', error)
    throw new Error(`Failed to generate scenes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
