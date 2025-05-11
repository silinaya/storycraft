'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Film, LayoutGrid, PenLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { generateScenes } from './actions/generate-scenes'
import { editVideo } from './actions/generate-video'
import { regenerateImage } from './actions/regenerate-image'
import { resizeImage } from './actions/resize-image'
import { saveImageToPublic } from './actions/upload-image'
import { CreateTab } from './components/create-tab'
import { ScenarioTab } from "./components/scenario-tab"
import { StoryboardTab } from './components/storyboard-tab'
import { type Style } from "./components/style-selector"
import { VideoTab } from './components/video-tab'
import { Scenario, Scene, type Language } from './types'
import Image from 'next/image'

const styles: Style[] = [
  { name: "Live-Action", image: "/styles/cinematic.jpg" },
  { name: "2D Animation", image: "/styles/2d.jpg" },
  { name: "Anime", image: "/styles/anime.jpg" },
  { name: "3D Animation", image: "/styles/3d.jpg" },
  { name: "Claymation Animation", image: "/styles/claymation.jpg" },
]

const DEFAULT_LANGUAGE: Language = {
  name: "English (United States)",
  code: "en-US"
};

export default function Home() {
  const [pitch, setPitch] = useState('')
  const [style, setStyle] = useState('Live-Action')
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE)
  const [logoOverlay, setLogoOverlay] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false);
  const [numScenes, setNumScenes] = useState(8)
  const [isLoading, setIsLoading] = useState(false)
  const [withVoiceOver, setWithVoiceOver] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [scenario, setScenario] = useState<Scenario>()
  const [scenes, setScenes] = useState<Array<Scene>>([])
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [videoUri, setVideoUri] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("create")

  const FALLBACK_URL = "https://videos.pexels.com/video-files/4276282/4276282-hd_1920_1080_25fps.mp4"

  useEffect(() => {
    console.log("generatingScenes (in useEffect):", generatingScenes);
  }, [generatingScenes]); // Log only when generatingScenes changes

  const handleGenerate = async () => {
    if (pitch.trim() === '' || numScenes < 1) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const scenario = await generateScenes(pitch, numScenes, style, language)
      setScenario(scenario)
      if (logoOverlay) {
        scenario.logoOverlay = logoOverlay
      }
      setScenes(scenario.scenes)
      setActiveTab("scenario") // Switch to scenario tab after successful generation
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
      if (scenario && scenes.every((scene) => typeof scene.videoUri === 'string')) {
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
          scenario.language,
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

  const handleGenerateStoryBoard = async () => {
    console.log("Generating storyboard");
    setActiveTab("storyboard");
  }

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
      <div className="flex items-center justify-center gap-2 mb-8">
        <Image 
          src="/logo.png" 
          alt="Storycraft" 
          width={32} 
          height={32} 
          className="w-8 h-8" 
        />
        <h1 className="text-3xl font-bold text-primary">
          StoryCraft
        </h1>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="create" className="me-2">
            <PenLine className="w-4 h-4 me-2 text-muted-foreground group-hover:text-foreground group-data-[state=active]:text-primary" />
            Create
          </TabsTrigger>
          <TabsTrigger value="scenario" className="me-2">
            <BookOpen className="w-4 h-4 me-2 text-muted-foreground group-hover:text-foreground group-data-[state=active]:text-primary" />
            Scenario
          </TabsTrigger>
          <TabsTrigger value="storyboard" className="me-2">
            <LayoutGrid className="w-4 h-4 me-2 text-muted-foreground group-hover:text-foreground group-data-[state=active]:text-primary" />
            Storyboard
          </TabsTrigger>
          <TabsTrigger value="video">
            <Film className="w-4 h-4 me-2 text-muted-foreground group-hover:text-foreground group-data-[state=active]:text-primary" />
            Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateTab
            pitch={pitch}
            setPitch={setPitch}
            numScenes={numScenes}
            setNumScenes={setNumScenes}
            style={style}
            setStyle={setStyle}
            language={language}
            setLanguage={setLanguage}
            logoOverlay={logoOverlay}
            setLogoOverlay={setLogoOverlay}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onGenerate={handleGenerate}
            styles={styles}
            onLogoUpload={handleLogoUpload}
            onLogoRemove={handleLogoRemove}
          />
        </TabsContent>

        <TabsContent value="scenario">
          <ScenarioTab 
            scenario={scenario} 
            onGenerateStoryBoard={handleGenerateStoryBoard}
          />
        </TabsContent>

        <TabsContent value="storyboard">
          <StoryboardTab
            scenes={scenes}
            isLoading={isLoading}
            isVideoLoading={isVideoLoading}
            generatingScenes={generatingScenes}
            errorMessage={errorMessage}
            onRegenerateAllImages={handleRegenerateAllImages}
            onGenerateAllVideos={handleGenerateAllVideos}
            onUpdateScene={handleUpdateScene}
            onRegenerateImage={handleRegenerateImage}
            onGenerateVideo={handleGenerateVideo}
            onUploadImage={handleUploadImage}
            onStartOver={() => {
              setScenes([]);
              setActiveTab("create");
            }}
          />
        </TabsContent>

        <TabsContent value="video">
          <VideoTab
            videoUri={videoUri}
            isVideoLoading={isVideoLoading}
            withVoiceOver={withVoiceOver}
            setWithVoiceOver={setWithVoiceOver}
            onEditVideo={handleEditVideo}
            scenes={scenes}
            generatingScenes={generatingScenes}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}

