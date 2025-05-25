import { generateSceneVideo, waitForOperation } from '@/lib/veo';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GetSignedUrlConfig } from '@google-cloud/storage';
import { tts } from '@/lib/tts';
import { Language } from '@/app/types';


const USE_SIGNED_URL = process.env.USE_SIGNED_URL === "true";
const USE_COSMO = process.env.USE_COSMO === "true";

const placeholderVideoUrls = [
  'cosmo.mp4',
  'dogs1.mp4',
  'dogs2.mp4',
  'cats1.mp4',
];

/**
 * Handles POST requests to generate videos from a list of scenes.
 *
 * @param req - The incoming request object, containing a JSON payload with an array of scenes.
 *               Each scene should have `imagePrompt`, `description`, `voiceover`, and optionally `imageBase64`.
 * @returns A Promise that resolves to a Response object. The response will be a JSON object
 *          with either a success flag and the generated video URLs or an error message.
 */
export async function POST(req: Request): Promise<Response> {

  const {scenes, language}: { 
    scenes: Array<{
      imagePrompt: string;
      videoPrompt: string;
      description: string;
      voiceover: string;
      imageBase64?: string;
    }>, 
    language: Language;
  } = await req.json();

  

  try {
    console.log('Generating videos in parallel...');
    const storage = new Storage();
    
    const videoGenerationTasks = scenes
      .filter(scene => scene.imageBase64)
      .map(async (scene, index) => {
        console.log(`Starting video generation for scene ${index + 1}`);
        let url: string;
        if (USE_COSMO) {
          // randomize the placeholder video urls
          url = placeholderVideoUrls[Math.floor(Math.random() * placeholderVideoUrls.length)];
        } else {
          const operationName = await generateSceneVideo(scene.videoPrompt, scene.imageBase64!);
          console.log(`Operation started for scene ${index + 1}`);
          
          const generateVideoResponse = await waitForOperation(operationName);
          console.log(`Video generation completed for scene ${index + 1}`);
          
          const gcsUri = generateVideoResponse.response.videos[0].gcsUri;
          const [bucketName, ...pathSegments] = gcsUri.replace("gs://", "").split("/");
          const fileName = pathSegments.join("/");
        
        
          if (USE_SIGNED_URL) {
            const options: GetSignedUrlConfig = {
              version: 'v4',
              action: 'read',
              expires: Date.now() + 60 * 60 * 1000,
            };

            // storage.bucket(bucketName).file(fileName).copy()
            
            [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
          } else {
            const publicDir = path.join(process.cwd(), 'public');
            const videoFile = path.join(publicDir, fileName);
            // Get the directory of the destination path
            const destinationDir = path.dirname(videoFile);
            // Create the destination directory if it doesn't exist (recursive)
            await fs.mkdir(destinationDir, { recursive: true });

            await storage.bucket(bucketName).file(fileName).download({ destination: videoFile });
            url = fileName;
          }
        }
        console.log('Video Generated!', url)
        return url;
      });

    const videoUrls = await Promise.all(videoGenerationTasks);

    const speachAudioFiles = await Promise.all(scenes.map(async (scene, index) => {
      try {
        console.log(`Generating tts for scene ${index + 1} in ${language.name}`);
        const filename = await tts(scene.voiceover, language.code, 'Algenib');
        return { filename, text: scene.voiceover };
      } catch (error) {
        console.error(`Error generating tts for scene ${index + 1}:`, error);
      }
    }));
    const voiceoverAudioUrls = speachAudioFiles.filter((s): s is { filename: string; text: string } => s !== undefined).map(r => r.filename.split('public/')[1]);

    return Response.json({ success: true, videoUrls, voiceoverAudioUrls }); // Return response data if needed
  } catch (error) {
    console.error('Error in generateVideo:', error);
    return Response.json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to generate video(s)' }
    );
  }
}


