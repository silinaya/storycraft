'use server'

import { tts } from '@/lib/tts';
import { Language } from '../types';

export async function generateVoiceover(
    scenes: Array<{
        voiceover: string;
      }>,  
      language: Language
): Promise<string[]> {
  console.log('Genrating voiceover')
  try {
    const speachAudioFiles = await Promise.all(scenes.map(async (scene) => {
        const filename = await tts(scene.voiceover, language.code);
        return { filename, text: scene.voiceover };
    }));
    const voiceoverAudioUrls = speachAudioFiles.map(r => r.filename);
    return voiceoverAudioUrls;
  } catch (error) {
    console.error('Error generating voiceover:', error)
    throw new Error(`Failed to generate voiceover: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
