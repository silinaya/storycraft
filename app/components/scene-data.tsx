'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, RefreshCw, Video } from 'lucide-react'
import { EditSceneModal } from './edit-scene-modal'
import Image from 'next/image'
import { VideoPlayer } from "./video-player"

interface SceneDataProps {
  scene: {
    imagePrompt: string;
    description: string;
    voiceover: string;
    imageBase64?: string;
    videoUri?: string
  };
  sceneNumber: number;
  onUpdate: (updatedScene: SceneDataProps['scene']) => void;
  onRegenerateImage: () => void;
  onGenerateVideo: () => void;
}

export function SceneData({ scene, sceneNumber, onUpdate, onRegenerateImage, onGenerateVideo }: SceneDataProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col">
        <div className="relative w-full aspect-video overflow-hidden group">
          {scene.videoUri ? (
            <div className="absolute inset-0">
              <VideoPlayer src={scene.videoUri} />
            </div>
          ) : scene.imageBase64 ? (
            <Image
              src={`data:image/png;base64,${scene.imageBase64}`}
              alt={`Scene ${sceneNumber}`}
              className="absolute inset-0 w-full h-full object-cover object-center rounded-t-lg"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
                target.onerror = null; // Prevent infinite loop
              }}
            />
          ) : (
            <Image
              src='/placeholder.svg'
              alt={`Scene ${sceneNumber}`}
              className="absolute inset-0 w-full h-full object-cover object-center rounded-t-lg"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
                target.onerror = null; // Prevent infinite loop
              }}
            />
          )}
          <div className="absolute top-2 left-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="bg-black/50 hover:bg-red-500 hover:text-white"
              onClick={onRegenerateImage}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Regenerate image</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="bg-black/50 hover:bg-blue-500 hover:text-white"
              onClick={onGenerateVideo}
            >
              <Video className="h-4 w-4" />
              <span className="sr-only">Generate video for scene</span>
            </Button>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-primary">Scene {sceneNumber}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="text-secondary hover:text-primary hover:bg-primary/10"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{scene.description}</p>
        </CardContent>
      </div>
      <EditSceneModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        scene={scene}
        sceneNumber={sceneNumber}
        onUpdate={onUpdate}
      />
    </Card>
  )
}