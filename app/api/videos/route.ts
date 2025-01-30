import { generateSceneVideo, waitForOperation } from '@/lib/veo';
import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';

/**
 * Handles POST requests to generate videos from a list of scenes.
 *
 * @param req - The incoming request object, containing a JSON payload with an array of scenes.
 *               Each scene should have `imagePrompt`, `description`, `voiceover`, and optionally `imageBase64`.
 * @returns A Promise that resolves to a Response object. The response will be a JSON object
 *          with either a success flag and the generated video URLs or an error message.
 */
export async function POST(req: Request): Promise<Response> {
  const scenes: Array<{
      imagePrompt: string;
      videoPrompt: string;
      description: string;
      voiceover: string;
      imageBase64?: string;
    }> = await req.json();

  try {
    console.log('Generating videos in parallel...');
    const storage = new Storage();
    
    const videoGenerationTasks = scenes
      .filter(scene => scene.imageBase64)
      .map(async (scene, index) => {
        console.log(`Starting video generation for scene ${index + 1}`);
        
        const operationName = await generateSceneVideo(scene.videoPrompt, scene.imageBase64!);
        console.log(`Operation started for scene ${index + 1}`);
        
        const generateVideoResponse = await waitForOperation(operationName);
        console.log(`Video generation completed for scene ${index + 1}`);
        
        const gcsUri = generateVideoResponse.response.generatedSamples[0].video.uri;
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
    return Response.json({ success: true, videoUrls }); // Return response data if needed
  } catch (error) {
    console.error('Error in generateVideo:', error);
    return Response.json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to generate video(s)' }
    );
  }
}


