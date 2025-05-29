import textToSpeech, { protos } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Assuming you're using Google Cloud Text-to-Speech:
const client = new textToSpeech.TextToSpeechClient();

export async function tts(text: string, language: string): Promise<string> {
  const listVoicesRequest: protos.google.cloud.texttospeech.v1.IListVoicesRequest = {
    languageCode: language,
  };
  const [response] = await client.listVoices(listVoicesRequest);
  let voiceName;
  //find the voice name that contains the voice string
  if (response.voices) {
    // choose the voice with the name that contains Algenib
    voiceName = response.voices.find((voice) => voice.name?.includes('Algenib'))?.name;
    // if no voice is found, choose the voice with the name that contains Charon
    if (!voiceName) {
      voiceName = response.voices.find((voice) => voice.name?.includes('Charon'))?.name;
    }
  } else {
    console.error('No voices found for language:', language);
    throw new Error('No voices found for language');
  }
  console.log(voiceName);
  const request = {
    input: { text },
    voice: {
      languageCode: language,
      name: voiceName,
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
      throw new Error('No audio content received from TTS API');
    }

    // Define the directory where you want to save the audio files
    const publicDir = path.join(process.cwd(), 'public');
    const outputDir = path.join(publicDir, 'tts'); // Example: public/audio

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
    throw error;
  }
}