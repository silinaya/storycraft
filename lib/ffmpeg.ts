import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import ffmpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid'

const USE_SIGNED_URL = process.env.USE_SIGNED_URL === "true";
const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI || '';

const MOOD_MUSIC: { [key: string]: string } = {
  'Angry': '[Angry] Drop and Roll - Silent Partner.mp3',
  'Bright': '[Bright] Crimson Fly - Huma-Huma.mp3',
  'Calm': '[Calm] Pachabelly - Huma-Huma.mp3',
  'Dark': '[Dark] Court and Page - Silent Partner.mp3',
  'Funky': '[Funky] Lines - Topher Mohr and Alex Elena.mp3',
  'Happy': '[Happy] Good Starts - Jingle Punks.mp3',
  'Inspirational': '[Inspirational] Grass - Silent Partner.mp3',
  'Romantic': '[Romantic] Ode to Joy - Cooper Cannell.mp3',
  'Sad': '[Sad] Ether - Silent Partner.mp3'
}


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

export async function concatenateVideos(gcsVideoUris: string[], speachAudioFiles: string[], withVoiceOver: boolean, mood: string, logoOverlay?: string): Promise<string> {
  console.log(`Concatenate all videos`);
  console.log(mood);
  console.log(`logoOverlay ${logoOverlay}`)
  const id = uuidv4();
  const outputFileName = `${id}.mp4`;
  const outputFileNameWithAudio = `${id}_with_audio.mp4`;
  const outputFileNameWithVoiceover = `${id}_with_voiceover.mp4`;
  const outputFileNameWithOverlay = `${id}_with_overlay.mp4`;
  let finalOutputPath;
  const storage = new Storage();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-concat-'));
  const concatenationList = path.join(tempDir, 'concat-list.txt');

  try {
    // Download all videos to local temp directory
    console.log(`Download all videos`);
    console.log(gcsVideoUris);
    const localPaths = await Promise.all(
      gcsVideoUris.map(async (signedUri, index) => {
        let localPath: string;
        if (USE_SIGNED_URL) {
          const uri = signedUrlToGcsUri(signedUri);
          const match = uri.match(/gs:\/\/([^\/]+)\/(.+)/);
          if (!match) {
            throw new Error(`Invalid GCS URI format: ${uri}`);
          }

          const [, bucket, filePath] = match;
          localPath = path.join(tempDir, `video-${index}${path.extname(filePath)}`);

          await storage
            .bucket(bucket)
            .file(filePath)
            .download({ destination: localPath });
        } else {
          const publicDir = path.join(process.cwd(), 'public');
          localPath = path.join(publicDir, signedUri);
        }
        return localPath;
      })
    );

    // Create concatenation list file
    const fileContent = localPaths
      .map(path => `file '${path}'`)
      .join('\n');
    fs.writeFileSync(concatenationList, fileContent);


    const writtenFileContent = await fs.readFileSync(concatenationList, 'utf8'); // 'utf8' for text files

    // 3. Log the content
    console.log(writtenFileContent);

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
    finalOutputPath = outputPath;

    const publicDir = path.join(process.cwd(), 'public');
    const audioFile = path.join(publicDir, MOOD_MUSIC[mood]);
    const outputPathWithAudio = path.join(tempDir, outputFileNameWithAudio);
    const outputPathWithVoiceover = path.join(tempDir, outputFileNameWithVoiceover);
    const outputPathWithOverlay = path.join(tempDir, outputFileNameWithOverlay);


    // Mix Voiceover and Music
    let musicAudioFile = audioFile;
    if (withVoiceOver) {
      await mixAudioWithVoiceovers(speachAudioFiles, audioFile, outputPathWithVoiceover);
      musicAudioFile = outputPathWithVoiceover;
    }




    // Adding an audio file
    console.log(`Adding music`);
    await addAudioToVideoWithFadeOut(outputPath, musicAudioFile, outputPathWithAudio)
    finalOutputPath = outputPathWithAudio;

    if (logoOverlay) {
      // Add overlay
      await addOverlayTopRight(
        finalOutputPath,
        path.join(publicDir, logoOverlay),
        outputPathWithOverlay,
      )
      finalOutputPath = outputPathWithOverlay;
    }

    const publicFile = path.join(publicDir, outputFileNameWithVoiceover);
    fs.copyFileSync(finalOutputPath, publicFile);
    let url: string;
    if (USE_SIGNED_URL) {
      // // Upload result to GCS
      console.log(`Upload result to GCS`);
      const bucketName = GCS_VIDEOS_STORAGE_URI.replace("gs://", "").split("/")[0];
      // Extract the destination path from the GCS URI, and combine with the outputFileName
      const destinationPath = path.join(GCS_VIDEOS_STORAGE_URI.replace(`gs://${bucketName}/`, ''), outputFileName);
      const bucket = storage.bucket(bucketName);

      await bucket
        .upload(finalOutputPath, {
          destination: destinationPath,
          metadata: {
            contentType: 'video/mp4',
          },
        });
      const file = bucket.file(destinationPath);
      // Generate a signed URL (as explained in the previous response)
      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'read', // Change this to the desired action
        expires: Date.now() + 60 * 60 * 1000, // 1 hour expiration
      };
      [url] = await file.getSignedUrl(options);
    } else {
      url = outputFileNameWithVoiceover;
    }
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

async function addOverlayTopRight(
  videoInputPath: string,
  imageInputPath: string,
  outputPath: string,
  margin: number = 10,
  overlayScale: number = 0.15 // Default to 15% of video width
): Promise<void> {
  console.log('Starting video processing...');
  console.log(`  Input Video: ${videoInputPath}`);
  console.log(`  Overlay Image: ${imageInputPath}`);
  console.log(`  Output Video: ${outputPath}`);
  console.log(`  Margin: ${margin}px`);
  console.log(`  Overlay Scale: ${overlayScale * 100}% of video width`);

  return new Promise((resolve, reject) => {
    // First, get the video dimensions
    ffmpeg.ffprobe(videoInputPath, (err, metadata) => {
      if (err) {
        console.error('Error getting video metadata:', err);
        return reject(err);
      }

      // Get video dimensions
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }

      const videoWidth = videoStream.width;
      const videoHeight = videoStream.height;

      if (!videoWidth || !videoHeight) {
        return reject(new Error('Could not determine video dimensions'));
      }

      // Calculate the overlay width based on the video width and scale factor
      const overlayWidth = Math.round(videoWidth * overlayScale);

      console.log(`  Video dimensions: ${videoWidth}x${videoHeight}`);
      console.log(`  Overlay width: ${overlayWidth}px (scaled)`);

      // Now run ffmpeg with the calculated dimensions
      ffmpeg()
        .input(videoInputPath)
        .input(imageInputPath)
        .complexFilter([
          // Scale the overlay image to the calculated width, preserving aspect ratio
          `[1:v]scale=${overlayWidth}:-1[scaled]`,

          // Apply the overlay in the top-right corner with margin
          `[0:v][scaled]overlay=W-w-${margin}:${margin}[outv]`
        ], 'outv')
        .outputOptions([
          '-c:v libx264',
          '-crf 23',
          '-preset veryfast',
          '-c:a copy',
          '-pix_fmt yuv420p'
        ])
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${Math.floor(progress.percent)}% done`);
          } else if (progress.timemark) {
            console.log(`Processing: Time mark ${progress.timemark}`);
          }
        })
        .on('error', (err, stdout, stderr) => {
          console.error('Error processing video:', err.message);
          console.error('ffmpeg stdout:', stdout);
          console.error('ffmpeg stderr:', stderr);
          reject(err);
        })
        .on('end', (stdout, stderr) => {
          console.log(`Video processing finished successfully!`);
          console.log(`Output saved to: ${outputPath}`);
          resolve();
        })
        .save(outputPath);
    });
  });
}

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`ffprobe error for ${filePath}: ${err.message}`));
      }
      if (metadata && metadata.format && typeof metadata.format.duration === 'number') {
        resolve(metadata.format.duration);
      } else {
        reject(new Error(`Could not get duration for ${filePath}`));
      }
    });
  });
}

export async function mixAudioWithVoiceovers(
  speechAudioFiles: string[],
  musicAudioFile: string,
  outputAudioPath: string,
  musicVolumeDuringVoiceover: number = 0.7,
  voiceoverIntervalSeconds: number = 8
): Promise<void> {
  if (!musicAudioFile) {
    throw new Error("Music audio file path (musicAudioFile) is required.");
  }
  if (!outputAudioPath) {
    throw new Error("Output audio file path (outputAudioPath) is required.");
  }

  // Handle case with no voiceovers: just copy the music file
  if (!speechAudioFiles || speechAudioFiles.length === 0) {
    console.warn("No speech audio files provided. Copying music file as output.");
    return new Promise<void>((resolve, reject) => {
      ffmpeg(musicAudioFile)
        .outputOptions('-c:a copy') // Copy codec without re-encoding
        .on('error', (err: Error) => {
          const errorMessage = `Error copying music file ${musicAudioFile} to ${outputAudioPath}: ${err.message}`;
          console.error(errorMessage);
          reject(new Error(errorMessage));
        })
        .on('end', () => {
          console.log(`Music file copied to ${outputAudioPath}`);
          resolve();
        })
        .save(outputAudioPath);
    });
  }

  try {
    console.log('Fetching voiceover durations...');
    const voiceoverDurations: number[] = await Promise.all(
      speechAudioFiles.map((voPath: string) => getAudioDuration(voPath))
    );
    console.log('Voiceover durations:', voiceoverDurations);

    const command = ffmpeg();

    command.input(musicAudioFile); // Input 0: Music
    speechAudioFiles.forEach((voPath: string) => { // Inputs 1 to N: Voiceovers
      command.input(voPath);
    });

    const filterComplex: string[] = [];
    let musicStreamLabel = '[0:a]'; // Music is the first input

    // 1. Construct the volume ducking condition for the music
    const duckingConditions: string[] = voiceoverDurations.map((duration: number, index: number) => {
      const startTime: number = index * voiceoverIntervalSeconds;
      const endTime: number = startTime + duration;
      // .toFixed(3) for precision with float seconds in FFmpeg filters
      return `between(t,${startTime.toFixed(3)},${endTime.toFixed(3)})`;
    });

    // Only apply volume filter if there are conditions (i.e., voiceovers)
    const duckingConditionString: string = duckingConditions.join('+');
    if (duckingConditionString) {
      filterComplex.push(
        `${musicStreamLabel}volume=eval=frame:volume='if(${duckingConditionString}, ${musicVolumeDuringVoiceover}, 1.0)'[music_ducked]`
      );
      musicStreamLabel = '[music_ducked]'; // Update music stream to the ducked version
    }

    // 2. Prepare voiceover streams with delays and give them labels
    const delayedVoiceoverLabels: string[] = [];
    speechAudioFiles.forEach((_voFile: string, index: number) => {
      const voInputStreamLabel = `[${index + 1}:a]`; // Voiceover inputs start from 1
      const voOutputLabel = `[vo${index}]`;
      const delaySeconds: number = index * voiceoverIntervalSeconds;
      // adelay takes values in milliseconds or seconds (with 's' suffix)
      // 'all=1' ensures all channels (e.g. stereo) are delayed.
      filterComplex.push(`${voInputStreamLabel}adelay=${delaySeconds}s:all=1${voOutputLabel}`);
      delayedVoiceoverLabels.push(voOutputLabel);
    });

    // 3. Mix the ducked music and all delayed voiceovers
    const allStreamsToMix: string[] = [musicStreamLabel, ...delayedVoiceoverLabels];
    filterComplex.push(
      `${allStreamsToMix.join('')}amix=inputs=${allStreamsToMix.length}:duration=first:dropout_transition=0[aout]`
    );
    filterComplex.push(
      `[aout]loudnorm=I=-14:LRA=11:TP=-1.0[final_output]`
    );

    command.complexFilter(filterComplex, 'final_output');

    // Set output options based on extension
    const outputExtension: string = path.extname(outputAudioPath).toLowerCase();
    // fluent-ffmpeg typically expects an array of strings for multiple options
    if (outputExtension === '.mp3') {
      command.outputOptions(['-c:a libmp3lame', '-q:a 2']); // VBR quality 2
    } else if (outputExtension === '.aac' || outputExtension === '.m4a') {
      command.outputOptions(['-c:a aac', '-b:a 192k']); // AAC with 192kbps
    } else if (outputExtension === '.wav') {
      command.outputOptions('-c:a pcm_s16le'); // Uncompressed WAV (single option string is fine)
    } else {
      console.warn(`Unknown output extension ${outputExtension}. Using libmp3lame audio codec by default.`);
      command.outputOptions(['-c:a libmp3lame', '-q:a 2']);
    }

    return new Promise<void>((resolve, reject) => {
      command
        .on('start', (commandLine: string) => {
          console.log('Spawned FFmpeg with command: ' + commandLine);
        })
        .on('progress', (progress: {
          frames: number;
          currentFps: number;
          currentKbps: number;
          targetSize: number;
          timemark: string;
          percent?: number | undefined;
        }) => {
          if (typeof progress.percent === 'number') { // Check if percent is a number
            console.log(`Processing: ${progress.percent.toFixed(2)}% done`);
          } else if (progress.timemark) {
            console.log(`Processing at: ${progress.timemark}`); // Fallback to timemark
          }
        })
        .on('error', (err: Error, stdout: string | null, stderr: string | null) => {
          const errorMessage = `Error processing audio: ${err.message}\nFFmpeg stdout: ${stdout?.toString()}\nFFmpeg stderr: ${stderr?.toString()}`;
          console.error(errorMessage);
          reject(new Error(errorMessage));
        })
        .on('end', (stdout: string | null, stderr: string | null) => {
          console.log(`Audio mixing finished successfully. Output: ${outputAudioPath}`);
          const stdOutput = stdout?.toString();
          const stdError = stderr?.toString();
          if (stdOutput) console.log('ffmpeg stdout:', stdOutput);
          // stderr can contain informational messages as well, not just errors
          if (stdError) console.log('ffmpeg stderr:', stdError);
          resolve();
        })
        .save(outputAudioPath);
    });

  } catch (error: unknown) {
    // Catch 'unknown' and then perform type checking for robust error handling
    let errorMessage = "An unexpected error occurred during audio mixing.";
    if (error instanceof Error) {
      errorMessage = `Failed to mix audio: ${error.message}`;
    } else if (typeof error === 'string') {
      errorMessage = `Failed to mix audio: ${error}`;
    }
    console.error(errorMessage, error); // Log original error object for more context
    throw new Error(errorMessage); // Re-throw as a standard Error object
  }
}