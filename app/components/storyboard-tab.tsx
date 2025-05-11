'use client'

import { Button } from "@/components/ui/button"
import { SceneData } from './scene-data'
import { Loader2, FileSlidersIcon as Slideshow, Video } from 'lucide-react'
import { Scene } from "../types"
import { SlideshowModal } from './slideshow-modal'
import { useState } from 'react'

interface StoryboardTabProps {
  scenes: Scene[]
  isLoading: boolean
  isVideoLoading: boolean
  generatingScenes: Set<number>
  errorMessage: string | null
  onRegenerateAllImages: () => Promise<void>
  onGenerateAllVideos: () => Promise<void>
  onUpdateScene: (index: number, updatedScene: Scene) => void
  onRegenerateImage: (index: number) => Promise<void>
  onGenerateVideo: (index: number) => Promise<void>
  onUploadImage: (index: number, file: File) => Promise<void>
  onStartOver: () => void
}

export function StoryboardTab({
  scenes,
  isLoading,
  isVideoLoading,
  generatingScenes,
  errorMessage,
  onRegenerateAllImages,
  onGenerateAllVideos,
  onUpdateScene,
  onRegenerateImage,
  onGenerateVideo,
  onUploadImage,
  onStartOver,
}: StoryboardTabProps) {
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)

  return (
    <div className="space-y-8">
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
          onClick={onRegenerateAllImages} 
          disabled={isLoading || generatingScenes.size > 0}
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
          onClick={onGenerateAllVideos}
          disabled={isVideoLoading || scenes.length === 0 || generatingScenes.size > 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isVideoLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Videos...
            </>
          ) : (
            <>
              <Video className="mr-2 h-4 w-4" />
              Generate Videos
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
            onUpdate={(updatedScene) => onUpdateScene(index, updatedScene)}
            onRegenerateImage={() => onRegenerateImage(index)}
            onGenerateVideo={() => onGenerateVideo(index)}
            onUploadImage={(file) => onUploadImage(index, file)}
            isGenerating={generatingScenes.has(index)}
          />
        ))}
      </div>
      {errorMessage && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-wrap">
          {errorMessage}
        </div>
      )}
      {scenes.length > 0 && (
        <SlideshowModal
          scenes={scenes}
          isOpen={isSlideshowOpen}
          onClose={() => setIsSlideshowOpen(false)}
        />
      )}
    </div>
  )
} 