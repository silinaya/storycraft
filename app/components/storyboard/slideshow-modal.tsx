'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Scene } from "../types"

interface SlideshowModalProps {
  scenes: Scene[];
  isOpen: boolean;
  onClose: () => void;
}

export function SlideshowModal({ scenes, isOpen, onClose }: SlideshowModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const goToPrevious = () => {
    setDirection(-1)
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : scenes.length - 1))
  }

  const goToNext = () => {
    setDirection(1)
    setCurrentIndex((prevIndex) => (prevIndex < scenes.length - 1 ? prevIndex + 1 : 0))
  }

  const currentScene = scenes[currentIndex]

  if (!currentScene) {
    return null
  }

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
      };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Scene {currentIndex + 1}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full pb-[56.25%] overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0"
            >
              <Image
                src={currentScene.imageBase64 ? `data:image/png;base64,${currentScene.imageBase64}` : "/placeholder.svg"}
                alt={`Scene ${currentIndex + 1}`}
                fill
                className="w-full h-full object-cover object-center rounded-md absolute inset-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </motion.div>
          </AnimatePresence>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous scene</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next scene</span>
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          <h3 className="font-semibold">Description:</h3>
          <p>{currentScene.description}</p>
        </div>
        <div className="mt-4 space-y-2">
          <h3 className="font-semibold">Voiceover:</h3>
          <p>{currentScene.voiceover}</p>
        </div>
        <div className="mt-4 space-y-2">
          <h3 className="font-semibold">Characters:</h3>
          <p>{currentScene.charactersPresent.join(",")}</p>
          </div>
      </DialogContent>
    </Dialog>
  )
}

