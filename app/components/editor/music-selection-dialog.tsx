import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'

export interface MusicParams {
  description: string
}

interface MusicSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onMusicGenerate: (params: MusicParams) => void
  isGenerating: boolean
  currentParams: MusicParams
}

export function MusicSelectionDialog({
  isOpen,
  onClose,
  onMusicGenerate,
  isGenerating,
  currentParams
}: MusicSelectionDialogProps) {
  const [description, setDescription] = useState<string>(currentParams.description)

  const handleGenerate = () => {
    if (description.trim()) {
      onMusicGenerate({
        description: description.trim()
      })
    }
  }

  const handleClose = () => {
    // Reset to current params when closing
    setDescription(currentParams.description)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Music Generation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Music Description:</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the music you want to generate..."
              className="min-h-[80px]"
            />
            <p className="text-xs text-gray-500">
              Describe the style, instruments, tempo, genre, mood, or any specific characteristics you want in the music.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={!description.trim() || isGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? 'Generating...' : 'Generate Music'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 