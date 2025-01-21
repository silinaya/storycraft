'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SceneData } from './components/scene-data'
import { SlideshowModal } from './components/slideshow-modal'
import { VideoPlayer } from "./components/video-player"
import { generateScenes } from './actions/generate-scenes'
import { regenerateImage } from './actions/regenerate-image'
import { generateVideo } from './actions/generate-video'
import { Loader2, FileSlidersIcon as Slideshow, Video } from 'lucide-react'

export default function Home() {
  const [pitch, setPitch] = useState('')
  const [numScenes, setNumScenes] = useState(8)
  const [isLoading, setIsLoading] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [scenes, setScenes] = useState<Array<{
    imagePrompt: string;
    description: string;
    voiceover: string;
    imageBase64?: string;
  }>>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)
  const [videoUri, setVideoUri] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (pitch.trim() === '' || numScenes < 1) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const generatedScenes = await generateScenes(pitch, numScenes)
      setScenes(generatedScenes)
      setPitch('')
    } catch (error) {
      console.error('Error generating scenes:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred while generating scenes')
      setScenes([]) // Clear any partially generated scenes
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerateImages = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const regeneratedScenes = await Promise.all(scenes.map(async (scene, index) => {
        try {
          console.log(`Regenerating image for scene ${index + 1}`);
          const { imageBase64 } = await regenerateImage(scene.imagePrompt);
          console.log(`Successfully regenerated image for scene ${index + 1}`);
          return { ...scene, imageBase64 };
        } catch (error) {
          console.error(`Error regenerating image for scene ${index + 1}:`, error);
          setErrorMessage(prev => prev ? `${prev}\n` : '' + `Failed to generate image for scene ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return scene; // Keep the existing image if regeneration fails
        }
      }));
      setScenes(regeneratedScenes);
    } catch (error) {
      console.error('Error regenerating images:', error);
      setErrorMessage(prev => prev ? `${prev}\n` : '' + `Failed to regenerate images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
    
  const handleGenerateVideo = async () => {
    setIsVideoLoading(true)
    setErrorMessage(null)
    try {
      if (scenes[0].imageBase64) {
          const result = await generateVideo(scenes)
          if (result.success) {
              setVideoUri(result.videoUrl)
          } else {
              setVideoUri("https://videos.pexels.com/video-files/3042473/3042473-sd_426_240_30fps.mp4")
          }
      } else {
          setErrorMessage("No image for scene")
      }
    } catch (error) {
      console.error("Error generating video:", error)
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while generating video")
    } finally {
      setIsVideoLoading(false)
    }
  };

  const handleUpdateScene = (index: number, updatedScene: typeof scenes[0]) => {
    const newScenes = [...scenes];
    newScenes[index] = updatedScene;
    setScenes(newScenes);
  };

  return (
    <main className="container mx-auto p-4 min-h-screen bg-background">
      <h1 className="text-3xl font-bold text-center mb-8 text-primary">StoryCraft</h1>
      {scenes.length === 0 ? (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Enter your story pitch</h2>
            <p className="text-muted-foreground">
              Describe your story idea and we&apos;ll generate a complete storyboard with scenes, descriptions, and voiceover text.
            </p>
          </div>
          <div className="space-y-4">
            <Input
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Once upon a time..."
              className="min-h-[100px]"
            />
            <div className="flex items-center space-x-2">
              <label htmlFor="numScenes" className="text-sm font-medium">
                Number of Scenes:
              </label>
              <Input
                id="numScenes"
                type="number"
                min="1"
                max="20"
                value={numScenes}
                onChange={(e) => setNumScenes(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-20"
              />
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || pitch.trim() === ''}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Storyboard'
              )}
            </Button>
            {errorMessage && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-wrap">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {videoUri && (
            <div className="mb-8">
              <VideoPlayer src={videoUri} />
            </div>
          )}
          <div className="flex justify-end space-x-4">
            <Button
              onClick={() => setIsSlideshowOpen(true)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              disabled={scenes.length === 0}
            >
              <Slideshow className="mr-2 h-4 w-4" />
              Start Slideshow
            </Button>
            <Button 
              onClick={handleRegenerateImages} 
              disabled={isLoading}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Generate Storyboard Images'
              )}
            </Button>
            <Button
              onClick={handleGenerateVideo}
              disabled={isVideoLoading || scenes.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isVideoLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene, index) => (
              <SceneData
                key={index}
                sceneNumber={index + 1}
                scene={scene}
                onUpdate={(updatedScene) => handleUpdateScene(index, updatedScene)}
              />
            ))}
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setScenes([])} variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
              Start Over
            </Button>
          </div>
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-wrap">
              {errorMessage}
            </div>
          )}
        </div>
      )}
      {scenes.length > 0 && (
        <SlideshowModal
          scenes={scenes}
          isOpen={isSlideshowOpen}
          onClose={() => setIsSlideshowOpen(false)}
        />
      )}
    </main>
  )
}

