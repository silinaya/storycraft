import textToSpeech from '@google-cloud/text-to-speech';
import { protos } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import * as os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'

// Assuming you're using Google Cloud Text-to-Speech:
const client = new textToSpeech.TextToSpeechClient();

export async function tts(text: string, language: string, voice: string): Promise<string | undefined> {    
   const request = {
    input: { text },
    voice: { 
      languageCode: language, 
      name: `${language}-Chirp3-HD-${voice}`,
    },
    audioConfig: { 
      audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3
    },
  };

  try {
    const response = await client.synthesizeSpeech(request);
    const audioContent = response[0].audioContent;

    if (!audioContent) {
        console.error("No audio content received from TTS API");
        return undefined;
    }

    // Define the directory where you want to save the audio files
    const outputDir = path.join(os.tmpdir(), 'tts'); // Example: public/audio

    // Ensure the directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate a unique filename, e.g., using a timestamp or a UUID
    const uuid = uuidv4();
    const fileName = `audio-${uuid}.mp3`;
    const filePath = path.join(outputDir, fileName);

    // Write the audio content to a file
    await fs.writeFile(filePath, audioContent);

    console.log(`Audio content written to file: ${filePath}`);

    // Return the relative file path (for serving the file)
    return filePath; // Important: Return the path relative to the 'public' directory
  } catch (error) {
    console.error('Error in tts function:', error);
    return undefined;
  }
}