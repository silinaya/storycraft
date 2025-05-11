'use server'

import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import { tts } from '@/lib/tts';
import { generateSceneVideo, waitForOperation } from '@/lib/veo';
import { concatenateVideos } from '@/lib/ffmpeg';
import { type Language } from '../types';

export async function editVideo(
  scenes: Array<{
    voiceover: string;
    videoUri?: string | Promise<string>;
  }>, 
  mood: string, 
  withVoiceOver: boolean, 
  language: Language,
  logoOverlay?: string
): Promise<{ success: true, videoUrl: string } | { success: false, error: string }> {
    
  try {
    console.log('Generating video...');
    console.log('Language:', language.name);
    console.log('With voiceover:', withVoiceOver);
    
    const filteredGcsVideoUris = scenes.map((scene) => scene.videoUri).filter((s): s is string => s !== undefined);
    const speachAudioFiles = await Promise.all(scenes.map(async (scene, index) => {
        try {
          console.log(`Generating tts for scene ${index + 1} in ${language.name}`);
          const filename = await tts(scene.voiceover, language.code, 'Algenib');
          return filename;
        } catch (error) {
          console.error(`Error generating tts for scene ${index + 1}:`, error);
        }
      }));
    const filteredSpeachAudioFiles = speachAudioFiles.filter((s): s is string => s !== undefined);
    const url = await concatenateVideos(filteredGcsVideoUris, filteredSpeachAudioFiles, withVoiceOver, mood, logoOverlay);
    console.log('url:', url);
    console.log(`Generated video!`);
    return { success: true, videoUrl: url }
  } catch (error) {
    console.error('Error in generateVideo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate video' }
  }
}

export async function generateVideos(scenes: Array<{
  imagePrompt: string;
  description: string;
  voiceover: string;
  imageBase64?: string;
}>): Promise<{ success: true, videoUrls: Array<string> } | { success: false, error: string }> {
  try {
    console.log('Generating videos in parallel...');
    const storage = new Storage();
    
    const videoGenerationTasks = scenes
      .filter(scene => scene.imageBase64)
      .map(async (scene, index) => {
        console.log(`Starting video generation for scene ${index + 1}`);
        
        const operationName = await generateSceneVideo(scene.imagePrompt, scene.imageBase64!);
        console.log(`Operation started for scene ${index + 1}`);
        
        const generateVideoResponse = await waitForOperation(operationName);
        console.log(`Video generation completed for scene ${index + 1}`);
        
        const gcsUri = generateVideoResponse.response.videos[0].gcsUri;
        const [bucketName, ...pathSegments] = gcsUri.replace("gs://", "").split("/");
        const fileName = pathSegments.join("/");
        
        const options: GetSignedUrlConfig = {
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000,
        };
        
        const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
        console.log(`Signed URL obtained for scene ${index + 1}`);
        
        return url;
      });

    const videoUrls = await Promise.all(videoGenerationTasks);
    return { success: true, videoUrls };
  } catch (error) {
    console.error('Error in generateVideo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate video(s)' };
  }
}