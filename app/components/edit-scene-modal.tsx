'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import Image from 'next/image'

interface EditSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: {
    imagePrompt: string;
    description: string;
    voiceover: string;
    imageBase64?: string;
  };
  sceneNumber: number;
  onUpdate: (updatedScene: EditSceneModalProps['scene']) => void;
}

export function EditSceneModal({ isOpen, onClose, scene, sceneNumber, onUpdate }: EditSceneModalProps) {
  const [editedScene, setEditedScene] = useState(scene)

  const handleSave = () => {
    onUpdate(editedScene)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Scene {sceneNumber}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-4">
            <div className="relative w-full pb-[56.25%] overflow-hidden rounded-lg">
              <Image
                src={scene.imageBase64 ? `data:image/png;base64,${scene.imageBase64}` : "/placeholder.svg"}
                alt={`Scene ${sceneNumber}`}
                className="absolute inset-0 w-full h-full object-cover object-center"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="imagePrompt" className="text-sm font-medium">
                Image Prompt
              </label>
              <Textarea
                id="imagePrompt"
                value={editedScene.imagePrompt}
                onChange={(e) => setEditedScene({ ...editedScene, imagePrompt: e.target.value })}
                placeholder="Describe the scene visually..."
                rows={4}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={editedScene.description}
              onChange={(e) => setEditedScene({ ...editedScene, description: e.target.value })}
              placeholder="What happens in this scene?"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="voiceover" className="text-sm font-medium">
              Voiceover
            </label>
            <Textarea
              id="voiceover"
              value={editedScene.voiceover}
              onChange={(e) => setEditedScene({ ...editedScene, voiceover: e.target.value })}
              placeholder="What should the narrator say?"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

