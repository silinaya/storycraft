'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from 'lucide-react'
import { EditSceneModal } from './edit-scene-modal'
import Image from 'next/image'

interface SceneDataProps {
  scene: {
    imagePrompt: string;
    description: string;
    voiceover: string;
    imageBase64?: string;
  };
  sceneNumber: number;
  onUpdate: (updatedScene: SceneDataProps['scene']) => void;
}

export function SceneData({ scene, sceneNumber, onUpdate }: SceneDataProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col">
        {scene.imageBase64 && (
          <div className="w-full">
            <div className="relative w-full pb-[56.25%] overflow-hidden">
              <Image
                src={`data:image/png;base64,${scene.imageBase64}`}
                alt={`Scene ${sceneNumber}`}
                className="absolute inset-0 w-full h-full object-cover object-center rounded-t-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </div>
          </div>
        )}
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

