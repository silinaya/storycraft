import { GoogleAuth } from 'google-auth-library'


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

export async function waitForOperation(operationName: string): Promise<GenerateVideoResponse> {
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

export async function generateSceneVideo(prompt: string, imageBase64: string): Promise<string> {
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