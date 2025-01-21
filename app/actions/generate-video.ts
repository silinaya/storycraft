'use server'

import { GoogleAuth } from 'google-auth-library'
import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid'

const LOCATION = 'us-central1'
const PROJECT_ID = 'svc-demo-vertex'
const MODEL = 'veo-001-preview-0815' // veo-2.0-generate-exp

interface GenerateVideoResponse {
  name: string;
  done: boolean;
  response: {
    '@type': 'type.googleapis.com/cloud.ai.large_models.vision.GenerateVideoResponse';
    generatedSamples: Array<{ // Use Array<{ ... }> to indicate an array of objects
      video: {
        uri: string;
        encoding: string;
      }
    }>;
  };
}


async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken()).token;
  // Check if accessToken is null or undefined
  if (accessToken) {
    return accessToken; 
  } else {
    // Handle the case where accessToken is null or undefined
    // This could involve throwing an error, retrying, or providing a default value
    throw new Error('Failed to obtain access token.'); 
  }
}

async function checkOperation(operationName: string): Promise<GenerateVideoResponse> {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:fetchPredictOperation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: operationName
        }),
      }
    )
    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResponse = await response.json(); // Parse as JSON
    return jsonResponse as GenerateVideoResponse;
}

async function waitForOperation(operationName: string): Promise<GenerateVideoResponse> {
  let generateVideoResponse = await checkOperation(operationName);
  while (!generateVideoResponse.done) {
    await delay(2000); // Wait for 5 second
    generateVideoResponse = await checkOperation(operationName);
  }
  return generateVideoResponse;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateSceneVideo(prompt: string, imageBase64: string): Promise<string> {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
              image: {
                  bytesBase64Encoded: imageBase64,
                  mimeType: "png",
              }                 
            },
          ],
          parameters: {
            storageUri: "gs://svc-demo-vertex-us/",
            sampleCount: 1,
            aspectRatio: "16:9"
          },
        }),
      }
    )
    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResult = await response.json(); // Parse as JSON
    return jsonResult.name;
}

export async function concatenateVideos(gcsVideoUris: string[]): Promise<string> {
  console.log(`Concatenate all videos`);
  const outputFileName = `${uuidv4()}.mp4`;
  const storage = new Storage();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-concat-'));
  const concatenationList = path.join(tempDir, 'concat-list.txt');
  
  try {
    // Download all videos to local temp directory
    console.log(`Download all videos`);
    const localPaths = await Promise.all(
      gcsVideoUris.map(async (uri, index) => {
        const match = uri.match(/gs:\/\/([^\/]+)\/(.+)/);
        if (!match) {
          throw new Error(`Invalid GCS URI format: ${uri}`);
        }
        
        const [, bucket, filePath] = match;
        const localPath = path.join(tempDir, `video-${index}${path.extname(filePath)}`);
        
        await storage
          .bucket(bucket)
          .file(filePath)
          .download({ destination: localPath });
        
        return localPath;
      })
    );

    // Create concatenation list file
    const fileContent = localPaths
      .map(path => `file '${path}'`)
      .join('\n');
    fs.writeFileSync(concatenationList, fileContent);

    // Concatenate videos using FFmpeg
    console.log(`Concatenate videos using FFmpeg`);
    const outputPath = path.join(tempDir, outputFileName);
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatenationList)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .output(outputPath)
        .outputOptions('-c copy')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
      
    // Upload result to GCS
    console.log(`Upload result to GCS`);
    const bucket = storage.bucket('svc-demo-vertex-us');
    await bucket
      .upload(outputPath, {
        destination: outputFileName,
        metadata: {
          contentType: 'video/mp4',
        },
      });
    const file = bucket.file(outputFileName);
    // Generate a signed URL (as explained in the previous response)
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read', // Change this to the desired action
      expires: Date.now() + 60 * 60 * 1000, // 1 hour expiration
    };
    const [url] = await file.getSignedUrl(options);
    console.log('url:', url);
    return url;
  } finally {
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function generateVideo(scenes: Array<{
    imagePrompt: string;
    description: string;
    voiceover: string;
    imageBase64?: string;
  }>): Promise<{ success: true, videoUrl: string } | { success: false, error: string }> {
    
  try {
    
    console.log('Generating video...');
      
    const gcsVideoUris = await Promise.all(scenes.map(async (scene, index) => {
        try {
          if (scene.imageBase64) {
              console.log(`Generating video for scene ${index + 1}`);
              const operationName = await generateSceneVideo(scene.imagePrompt, scene.imageBase64);
              console.log('operationName:', operationName);
              const generateVideoResponse = await waitForOperation(operationName);
              console.log(`Successfully generated video for scene ${index + 1}`);
              return generateVideoResponse.response.generatedSamples[0].video.uri;
          }
        } catch (error) {
          console.error(`Error generating image for scene ${index + 1}:`, error);
        }
      }));
    const filteredGcsVideoUris = gcsVideoUris.filter((s): s is string => s !== undefined);
    const url = await concatenateVideos(filteredGcsVideoUris);
    console.log('url:', url);
    console.log(`Generated video!`);
    return { success: true, videoUrl: url }
  } catch (error) {
    console.error('Error in generateProductCustomizationAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate video' }
  }
}