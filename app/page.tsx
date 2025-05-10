'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SceneData } from './components/scene-data'
import { SlideshowModal } from './components/slideshow-modal'
import { VideoPlayer } from "./components/video-player"
import { ScenarioTab } from "./components/scenario-tab"
import { generateScenes } from './actions/generate-scenes'
import { regenerateImage } from './actions/regenerate-image'
import { editVideo } from './actions/generate-video'
import { resizeImage } from './actions/resize-image'
import { saveImageToPublic } from './actions/upload-image'
import { Loader2, FileSlidersIcon as Slideshow, Video, Upload, DnaIcon } from 'lucide-react'
import { ScenarioModal } from './components/scenario-modal'
import { StyleSelector, type Style } from "./components/style-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from '@/components/ui/checkbox'
import Image from 'next/image'

const styles: Style[] = [
  { name: "Live-Action", image: "https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=500&h=500&fit=crop" },
  { name: "2D Animation", image: "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?rect=1500,1550,500,500&w=500&h=500&fit=crop" },
  { name: "Anime", image: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?rect=4000,650,500,500&w=500&h=500&fit=crop" },
  { name: "3D Animation", image: "https://images.unsplash.com/photo-1628260412297-a3377e45006f??w=500&h=500&fit=crop" },
  { name: "Claymation Animation", image: "https://images.unsplash.com/photo-1733173372615-accf145e3b17?w=500&h=500&fit=crop" },
]

interface Scenario {
  scenario: string;
  genre: string;
  mood: string;
  characters: Array<{name:string, description: string}>;
  settings: Array<{name:string, description: string}>;
  logoOverlay?: string;
}

interface Scene {
  imagePrompt: string;
  videoPrompt: string;
  description: string;
  voiceover: string;
  imageBase64?: string;
  videoUri?: string | Promise<string>;
}

export default function Home() {
  const [pitch, setPitch] = useState('')
  const [style, setStyle] = useState('Live-Action')
  const [logoOverlay, setLogoOverlay] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false);
  const [numScenes, setNumScenes] = useState(8)
  const [isLoading, setIsLoading] = useState(false)
  const [withVoiceOver, setWithVoiceOver] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [scenario, setScenario] = useState<Scenario>({scenario:'', genre: '', mood:'', characters: [], settings: []})
  const [scenes, setScenes] = useState<Array<Scene>>([])
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)
  const [isScenarioOpen, setScenarioOpen] = useState(false)
  const [videoUri, setVideoUri] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("storyboard")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const FALLBACK_URL = "https://videos.pexels.com/video-files/4276282/4276282-hd_1920_1080_25fps.mp4"
  
  useEffect(() => {
      console.log("generatingScenes (in useEffect):", generatingScenes);
    }, [generatingScenes]); // Log only when generatingScenes changes

  const handleGenerate = async () => {
    if (pitch.trim() === '' || numScenes < 1) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const scenario = await generateScenes(pitch, numScenes, style)
      setScenario(scenario)
      if (logoOverlay) {
        scenario.logoOverlay = logoOverlay
      }
      setScenes(scenario.scenes)
    } catch (error) {
      console.error('Error generating scenes:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred while generating scenes')
      setScenes([]) // Clear any partially generated scenes
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRegenerateAllImages = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
        // Regenerate all images
        const regeneratedScenes = await Promise.all(
          scenes.map(async (scene) => {
            try {
              const { imageBase64 } = await regenerateImage(scene.imagePrompt)
              return { ...scene, imageBase64, videoUri: undefined }
            } catch (error) {
              console.error(`Error regenerating image:`, error)
              return scene // Keep the existing image if regeneration fails
            }
          }),
        )
        setScenes(regeneratedScenes)
    } catch (error) {
      console.error("Error regenerating images:", error)
      setErrorMessage(`Failed to regenerate image(s): ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }
    
  const handleRegenerateImage = async (index: number) => {
    setGeneratingScenes(prev => new Set([...prev, index]));
    setErrorMessage(null)
    try {
        // Regenerate a single image
        const scene = scenes[index]
        const { imageBase64 } = await regenerateImage(scene.imagePrompt)
        const updatedScenes = [...scenes]
        updatedScenes[index] = { ...scene, imageBase64, videoUri: undefined }
        console.log(updatedScenes)
        setScenes(updatedScenes)
    } catch (error) {
      console.error("Error regenerating images:", error)
      setErrorMessage(`Failed to regenerate image(s): ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setGeneratingScenes(prev => {
        const updated = new Set(prev);
        updated.delete(index); // Remove index from generatingScenes
        return updated;
      });
    }
  }
  
  const handleEditVideo = async () => {
    setIsVideoLoading(true)
    setErrorMessage(null)
    try {
        console.log('Edit Video');
        console.log(withVoiceOver);
        if (scenes.every((scene) => typeof scene.videoUri === 'string')) {
            const result = await editVideo(
              await Promise.all(
                scenes.map(async (scene) => {
                  return {
                    voiceover: scene.voiceover,
                    videoUri: scene.videoUri,
                  };
                })
              ),
              scenario.mood,
              withVoiceOver,
              scenario.logoOverlay
            );
            if (result.success) {
                setVideoUri(result.videoUrl)
            } else {
                setVideoUri(FALLBACK_URL)
            }
        } else {
            setErrorMessage("All scenes should have a generated video")
            setVideoUri(FALLBACK_URL)
        }
    } catch (error) {
      console.error("Error generating video:", error)
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while generating video")
    } finally {
      setIsVideoLoading(false)
    }
  }
  
    const handleGenerateAllVideos = async () => {
      setErrorMessage(null);
      console.log("[Client] Generating videos for all scenes - START");
      setGeneratingScenes(new Set(scenes.map((_, i) => i)));

      const regeneratedScenes = await Promise.all(
        scenes.map(async (scene) => {
          try {
            const response = await fetch('/api/videos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([scene]),
            });

            const { success, videoUrls, error } = await response.json();

            if (success) {
              return { ...scene, videoUri: videoUrls[0] || FALLBACK_URL };
            } else {
              throw new Error(error);
            }
          } catch (error) {
            console.error("Error regenerating video:", error);
            return { ...scene, videoUri: FALLBACK_URL }; // Use fallback on error
          }
        })
      );

      setScenes(regeneratedScenes);
      setGeneratingScenes(new Set());
    };
    
  const handleGenerateVideo = async (index: number) => {
    setErrorMessage(null);
    try {
      // Single scene generation logic remains the same
      setGeneratingScenes(prev => new Set([...prev, index]));
      const scene = scenes[index];
      
      const response = await fetch('/api/videos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([scene]),
            });

      const { success, videoUrls } = await response.json();
      const videoUri = success ? videoUrls[0] : FALLBACK_URL;
      setScenes(prevScenes =>
        prevScenes.map((s, i) => (i === index ? { ...s, videoUri } : s))
      );
    } catch (error) {
      console.error("[Client] Error generating video:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unknown error occurred while generating video"
      );

      const videoUri = FALLBACK_URL;
      setScenes(prevScenes =>
        prevScenes.map((s, i) => (i === index ? { ...s, videoUri } : s))
      );
    } finally {
      console.log(`[Client] Generating video done`);
      
      setGeneratingScenes(prev => {
        const updated = new Set(prev);
        updated.delete(index); // Remove index from generatingScenes
        return updated;
      });
    }
  };

  const handleUpdateScene = (index: number, updatedScene: Scene) => {
    const newScenes = [...scenes]
    newScenes[index] = updatedScene
    setScenes(newScenes)
  };
    
  const handleUploadImage = async (index: number, file: File) => {
    setErrorMessage(null)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        const imageBase64 = base64String.split(",")[1] // Remove the data URL prefix
        const resizedImageBase64 = await resizeImage(imageBase64);
        const updatedScenes = [...scenes]
        updatedScenes[index] = { ...updatedScenes[index], imageBase64: resizedImageBase64, videoUri: undefined }
        setScenes(updatedScenes)
      }
      reader.onerror = () => {
        throw new Error("Failed to read the image file")
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading image:", error)
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while uploading the image")
    }
  }

  const handleLogoRemove = () => {
    setLogoOverlay(null)
  }

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Convert file to base64 string
      const base64String = await fileToBase64(file);
      
      // Call server action to save the image
      const imagePath = await saveImageToPublic(base64String, file.name);
      
      // Update state with the path to the saved image
      console.log(imagePath)
      setLogoOverlay(imagePath);
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Utility function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  console.log("Component rendered");

  return (
    <main className="container mx-auto p-8 min-h-screen bg-background">
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
            <Textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Once upon a time..."
              className="min-h-[100px]"
              rows={4} />
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
            <div className="space-y-2">
              <StyleSelector styles={styles} onSelect={setStyle} />
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="style" className="text-sm font-medium">
                Style:
              </label>
              <Input
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-200"
              />
            </div>
            <div className="flex items-center space-x-2">
            <label htmlFor="style" className="text-sm font-medium">
                Logo Overlay:
              </label>
              {logoOverlay ? (
                <div className="relative mx-auto w-full max-w-[100px] aspect-video overflow-hidden group">
                  <Image
                    src={logoOverlay || "/placeholder.svg"} 
                    alt={`Logo Overlay`}
                    className="w-full h-full object-contain rounded-t-lg"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                      target.onerror = null; // Prevent infinite loop
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogoRemove}
                      className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                    >
                      Remove Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-black/50 hover:bg-green-500 hover:text-white"
                    onClick={handleLogoClick}
                  >
                    <Upload className="h-4 w-4" />
                    <span className="sr-only">Upload image</span>
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                </div>
              )}
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
              <div className="mt-4 p-8 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-wrap">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scenario">Scenario</TabsTrigger>
            <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
          </TabsList>
          <TabsContent value="scenario">
            <ScenarioTab scenario={scenario} />
          </TabsContent>
          <TabsContent value="storyboard">
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
                  onClick={() => handleRegenerateAllImages()} 
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
                  onClick={() => handleGenerateAllVideos()}
                  disabled={isVideoLoading || scenes.length === 0  || generatingScenes.size > 0}
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
                    onUpdate={(updatedScene) => handleUpdateScene(index, updatedScene)}
                    onRegenerateImage={() => handleRegenerateImage(index)}
                    onGenerateVideo={() => handleGenerateVideo(index)}
                    onUploadImage={(file) => handleUploadImage(index, file)}
                    isGenerating={generatingScenes.has(index)}
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
              <div className="mt-auto pt-4 text-center text-xs text-gray-500">
                  made with ❤️ by @mblanc
              </div>
            </div>
          </TabsContent>
          <TabsContent value="video">
          <div className="space-y-8">
              <div className="flex justify-end space-x-4">
                <Button
                  onClick={() => handleEditVideo()}
                  disabled={isVideoLoading || scenes.length === 0 || !scenes.every((scene) => typeof scene.videoUri === 'string')  || generatingScenes.size > 0} 
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
                  <Checkbox id="withVocieover" 
                    checked={withVoiceOver} 
                    onCheckedChange={(checked) => {
                      const isChecked = typeof checked === "boolean" ? checked : false;
                      console.log(isChecked);
                      setWithVoiceOver(isChecked);
                    }} />
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
          </TabsContent>
        </Tabs>
        
      )}
      {scenes.length > 0 && (
        <SlideshowModal
          scenes={scenes}
          isOpen={isSlideshowOpen}
          onClose={() => setIsSlideshowOpen(false)}
        />
      )}
      <ScenarioModal
        isOpen={isScenarioOpen}
        onClose={() => setScenarioOpen(false)}
        scenario={scenario}
      />
    </main>
  )
}

