'use client'

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { VideoPlayer } from "./video-player"
import { Loader2, Video } from 'lucide-react'

interface VideoTabProps {
  videoUri: string | null
  isVideoLoading: boolean
  withVoiceOver: boolean
  setWithVoiceOver: (value: boolean) => void
  onEditVideo: () => Promise<void>
  scenes: Array<{ videoUri?: string | Promise<string> }>
  generatingScenes: Set<number>
}

export function VideoTab({
  videoUri,
  isVideoLoading,
  withVoiceOver,
  setWithVoiceOver,
  onEditVideo,
  scenes,
  generatingScenes
}: VideoTabProps) {
  return (
    <div className="space-y-8">
      <div className="flex justify-end space-x-4">
        <Button
          onClick={onEditVideo}
          disabled={isVideoLoading || scenes.length === 0 || !scenes.every((scene) => typeof scene.videoUri === 'string') || generatingScenes.size > 0} 
          className="bg-purple-500 text-primary-foreground hover:bg-primary/90"
        >
          {isVideoLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Editing Final Video...
            </>
          ) : (
            <>
              <Video className="mr-2 h-4 w-4" />
              Edit Final Video
            </>
          )}
        </Button>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="withVocieover" 
            checked={withVoiceOver} 
            onCheckedChange={(checked) => {
              const isChecked = typeof checked === "boolean" ? checked : false;
              setWithVoiceOver(isChecked);
            }} 
          />
          <label
            htmlFor="withVocieover"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Voiceover
          </label>
        </div>
      </div>
      {videoUri && (
        <div className="mb-8">
          <VideoPlayer src={videoUri} />
        </div>
      )}
    </div>
  )
} 