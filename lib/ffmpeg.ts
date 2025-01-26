import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import ffmpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid'


/**
 * Transforms a GCS signed URL into a GCS URI (gs://<bucket>/<path>).
 *
 * @param signedUrl The GCS signed URL.
 * @returns The GCS URI or null if the signed URL is invalid.
 */
export function signedUrlToGcsUri(signedUrl: string): string {
  try {
    const url = new URL(signedUrl);
    const pathname = url.pathname;

    // Extract bucket and path from pathname
    const parts = pathname.split('/');
    if (parts.length < 3) {
      return 'error less then 3 parts'; // Invalid pathname format
    }

    const bucket = parts[1];
    const path = parts.slice(2).join('/');

    // Construct GCS URI
    return `gs://${bucket}/${path}`;
  } catch (error) {
    console.error('Error parsing signed URL:', error);
    return 'error';
  }
}

export async function concatenateVideos(gcsVideoUris: string[], speachAudioFiles: string[]): Promise<string> {
  console.log(`Concatenate all videos`);
  const id = uuidv4();
  const outputFileName = `${id}.mp4`;
  const outputFileNameWithAudio = `${id}_with_audio.mp4`;
  const outputFileNameWithVoiceover = `${id}_with_voiceover.mp4`;
  const storage = new Storage();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-concat-'));
  const concatenationList = path.join(tempDir, 'concat-list.txt');
  
  try {
    // Download all videos to local temp directory
    console.log(`Download all videos`);
    const localPaths = await Promise.all(
      gcsVideoUris.map(async (signedUri, index) => {
        const uri = signedUrlToGcsUri(signedUri);
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
      
    const publicDir = path.join(process.cwd(), 'public');
    const audioFile = path.join(publicDir, 'RiseUp.mp3');
    const outputPathWithAudio = path.join(tempDir, outputFileNameWithAudio);
    const outputPathWithVoiceover = path.join(tempDir, outputFileNameWithVoiceover);

    // Adding an audio file
    console.log(`Adding music`);
    await addAudioToVideoWithFadeOut(outputPath, audioFile, outputPathWithAudio)
      
    console.log(`Adding voiceover`);
    await addVoiceover(outputPathWithAudio, speachAudioFiles, outputPathWithVoiceover)
      
    // Upload result to GCS
    console.log(`Upload result to GCS`);
    const bucket = storage.bucket('svc-demo-vertex-us');
    await bucket
      .upload(outputPathWithVoiceover, {
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

async function addAudioToVideoWithFadeOut(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // 1. Get Video Duration using ffprobe
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('Error getting video metadata:', err);
        reject(err);
        return;
      }

      const videoDuration = metadata.format.duration;
      if (videoDuration === undefined) {
        console.error('Error getting video duration');
        reject(new Error('Could not determine video duration'));
        return;
      }
      
      // Fade out settings
      const fadeOutDuration = 3; // seconds
      const fadeOutStartTime = videoDuration - fadeOutDuration;

      // Handle very short videos
      // if (fadeOutStartTime < 0) {
      //   console.warn('Video is shorter than the desired fade out duration');
      //   fadeOutStartTime = 0;
      //   fadeOutDuration = videoDuration;
      // }

      // 2. Add Audio to Video with Fade-Out
      ffmpeg(videoPath)
        .input(audioPath)
        .complexFilter([
          `[1:a]afade=t=out:st=${fadeOutStartTime}:d=${fadeOutDuration}[faded_audio]`
        ])
        .outputOptions([
          '-map 0:v',
          '-map [faded_audio]',
          '-c:v copy',
          '-c:a aac',
          '-shortest'
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('Successfully added audio to video with fade-out!');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error adding audio to video:', err);
          reject(err);
        })
        .run();
    });
  });
}

async function addVoiceover(
  videoPath: string,
  speechAudioFiles: string[],
  outputPath: string
): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    try {
      // 1. Get the duration of the video
      const videoMetadata: FfprobeData = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });
      const videoDuration = videoMetadata.format.duration;

      if (videoDuration === undefined) {
        console.error("Error: Video duration is undefined!");
        reject("Video duration is undefined");
        return;
      }

      // 2. Prepare the command
      let command = ffmpeg(videoPath);
      const complexFilter: string[] = [];
      let inputIndex = 1;
      let lastAudioStream = "[0:a]";

      // 3. Loop through the audio files and generate the filter
      for (let i = 0; i < speechAudioFiles.length; i++) {
        const startTime = i * 6;
        if (startTime >= videoDuration) {
          break;
        }
        const audioFile = speechAudioFiles[i];

        // 3.1 Add the audio input
        command = command.input(audioFile);

        // 3.2 Get audio duration for potential padding or trimming
        const audioMetadata: FfprobeData = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(audioFile, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata);
          });
        });
        const audioDuration = audioMetadata.format.duration;

        if (audioDuration === undefined) {
          console.error(`Error: Audio duration for ${audioFile} is undefined!`);
          reject(`Audio duration for ${audioFile} is undefined!`);
          return;
        }

        const endTime = Math.min(startTime + audioDuration, videoDuration, startTime + 6);

        // 3.3 Build the complex filter string segment for this audio
        complexFilter.push(
          `${lastAudioStream}volume=enable='between(t,${startTime},${endTime})':volume=0.3[v${i}]`,
          `[${inputIndex}:a]adelay=${startTime}s|${startTime}s,apad=whole_dur=6[a${i}]`,
          `[v${i}][a${i}]amix=inputs=2:duration=first:dropout_transition=2[mix${i}]`
        );

        lastAudioStream = `[mix${i}]`;
        inputIndex++;
      }

      // 4. Apply the complex filter and map the video stream
      // command = command.complexFilter(
      //   complexFilter, // Use only the audio filters
      //   ['0:v', lastAudioStream] // Map the video and the last mixed audio stream
      // );
      command = command.complexFilter(complexFilter, lastAudioStream);

      // 5. Set the output file and run the command
      command
        .outputOptions([
            '-map 0:v',       // Map the video stream from the first input
            '-c:v copy',      // Copy the video stream without re-encoding
            '-y'             // Overwrite output file without asking
          ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('end', () => {
          console.log('Voiceover added successfully!');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error adding voiceover:', err);
          reject(err);
        })
        .run();
    } catch (err) {
      console.error('Error in addVoiceover:', err);
      reject(err);
    }
  });
}