'use server'

import { editVideo as editVideoFFMPEG, exportMovie as exportMovieFFMPEG } from '@/lib/ffmpeg';
import { tts } from '@/lib/tts';
import { TimelineLayer, type Language } from '../types';

export async function editVideo(
  scenes: Array<{
    voiceover: string;
    videoUri?: string | Promise<string>;
  }>,
  mood: string,
  withVoiceOver: boolean,
  language: Language,
  logoOverlay?: string
): Promise<{ success: true, videoUrl: string, vttUrl?: string } | { success: false, error: string }> {

  try {
    console.log('Generating video...');
    console.log('Language:', language.name);
    console.log('With voiceover:', withVoiceOver);

    const filteredGcsVideoUris = scenes.map((scene) => scene.videoUri).filter((s): s is string => s !== undefined);
    let filteredSpeachAudioFiles: string[] = [];
    let voiceoverTexts: string[] = [];
    if (withVoiceOver) {
      const speachAudioFiles = await Promise.all(scenes.map(async (scene, index) => {
        try {
          console.log(`Generating tts for scene ${index + 1} in ${language.name}`);
          const filename = await tts(scene.voiceover, language.code);
          return { filename, text: scene.voiceover };
        } catch (error) {
          console.error(`Error generating tts for scene ${index + 1}:`, error);
        }
      }));
      const validResults = speachAudioFiles.filter((s): s is { filename: string; text: string } => s !== undefined);
      filteredSpeachAudioFiles = validResults.map(r => r.filename);
      voiceoverTexts = validResults.map(r => r.text);
    }

    const { videoUrl, vttUrl } = await editVideoFFMPEG(
      filteredGcsVideoUris,
      filteredSpeachAudioFiles,
      voiceoverTexts,
      withVoiceOver,
      mood,
      logoOverlay
    );
    console.log('videoUrl:', videoUrl);
    if (vttUrl) console.log('vttUrl:', vttUrl);
    console.log(`Generated video!`);
    return { success: true, videoUrl, vttUrl }
  } catch (error) {
    console.error('Error in generateVideo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate video' }
  }
}


export async function exportMovieAction(
  layers: Array<TimelineLayer>
): Promise<{ success: true, videoUrl: string, vttUrl?: string } | { success: false, error: string }> {
  try {
    console.log('Exporting movie...');
    const { videoUrl, vttUrl } = await exportMovieFFMPEG(
      layers
    );
    console.log('videoUrl:', videoUrl);
    if (vttUrl) console.log('vttUrl:', vttUrl);
    console.log(`Generated video!`);
    return { success: true, videoUrl, vttUrl }
  } catch (error) {
    console.error('Error in generateVideo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate video' }
  }
}