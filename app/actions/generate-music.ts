'use server'

import { generateMusicRest } from '@/lib/lyria';

export async function generateMusic(prompt: string): Promise<string> {
  console.log('Genrating music')
  try {
    const musicUrl = await generateMusicRest(prompt)
    console.log('Music generated!')
    return musicUrl; 
  } catch (error) {
    console.error('Error generating music:', error)
    throw new Error(`Failed to music: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
