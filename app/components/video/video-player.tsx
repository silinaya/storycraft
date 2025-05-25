"use client"

import { useRef, useEffect } from "react"

interface VideoPlayerProps {
  src: string
  vttSrc?: string | null
  language?: { name: string; code: string }
}

export function VideoPlayer({ src, vttSrc, language }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [src, vttSrc])

  return (
    <div className="w-full max-w-3xl mx-auto">
      <video ref={videoRef} controls className="w-full rounded-lg shadow-lg">
        <source src={src} type="video/mp4" />
        {vttSrc && (
          <track
            src={vttSrc}
            kind="subtitles"
            srcLang={language?.code}
            label={language?.name}
            default
          />
        )}
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

