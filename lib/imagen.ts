import { GoogleAuth } from 'google-auth-library'


const LOCATION = 'us-central1'
const PROJECT_ID = 'svc-demo-vertex'
const MODEL = 'imagen-3.0-generate-001'

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

interface GenerateImageResponse {
  predictions: Array<{ 
      bytesBase64Encoded: string;
      mimeType: string;
      gcsUri: string;
  }>;
}

export async function generateImageRest(prompt: string): Promise<GenerateImageResponse> {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
           {
             prompt: prompt
           },
          ],
          parameters: {
            // storageUri: "gs://svc-demo-vertex-us/",
            safetySetting: 'block_only_high',
            sampleCount: 1,
            aspectRatio: "16:9",
          },
        }),
      }
    )
    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResult = await response.json(); // Parse as JSON
    return jsonResult;
}