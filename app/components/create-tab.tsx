'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StyleSelector, type Style } from "./style-selector"
import { Loader2, Upload } from 'lucide-react'
import Image from 'next/image'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Language } from '../types'

const LANGUAGES: Language[] = [
  { name: "Arabic (Generic)", code: "ar-XA" },
  { name: "Bengali (India)", code: "bn-IN" },
  { name: "Dutch (Belgium)", code: "nl-BE" },
  { name: "Dutch (Netherlands)", code: "nl-NL" },
  { name: "English (Australia)", code: "en-AU" },
  { name: "English (India)", code: "en-IN" },
  { name: "English (United Kingdom)", code: "en-GB" },
  { name: "English (United States)", code: "en-US" },
  { name: "French (Canada)", code: "fr-CA" },
  { name: "French (France)", code: "fr-FR" },
  { name: "German (Germany)", code: "de-DE" },
  { name: "Gujarati (India)", code: "gu-IN" },
  { name: "Hindi (India)", code: "hi-IN" },
  { name: "Indonesian (Indonesia)", code: "id-ID" },
  { name: "Italian (Italy)", code: "it-IT" },
  { name: "Japanese (Japan)", code: "ja-JP" },
  { name: "Kannada (India)", code: "kn-IN" },
  { name: "Korean (South Korea)", code: "ko-KR" },
  { name: "Malayalam (India)", code: "ml-IN" },
  { name: "Mandarin Chinese (China)", code: "cmn-CN" },
  { name: "Marathi (India)", code: "mr-IN" },
  { name: "Polish (Poland)", code: "pl-PL" },
  { name: "Portuguese (Brazil)", code: "pt-BR" },
  { name: "Russian (Russia)", code: "ru-RU" },
  { name: "Spanish (Spain)", code: "es-ES" },
  { name: "Spanish (United States)", code: "es-US" },
  { name: "Swahili (Kenya)", code: "sw-KE" },
  { name: "Tamil (India)", code: "ta-IN" },
  { name: "Telugu (India)", code: "te-IN" },
  { name: "Thai (Thailand)", code: "th-TH" },
  { name: "Turkish (Turkey)", code: "tr-TR" },
  { name: "Ukrainian (Ukraine)", code: "uk-UA" },
  { name: "Urdu (India)", code: "ur-IN" },
  { name: "Vietnamese (Vietnam)", code: "vi-VN" }
];

interface CreateTabProps {
  pitch: string
  setPitch: (pitch: string) => void
  numScenes: number
  setNumScenes: (num: number) => void
  style: string
  setStyle: (style: string) => void
  language: Language
  setLanguage: (language: Language) => void
  logoOverlay: string | null
  setLogoOverlay: (logo: string | null) => void
  isLoading: boolean
  errorMessage: string | null
  onGenerate: () => Promise<void>
  styles: Style[]
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onLogoRemove: () => void
}

export function CreateTab({
  pitch,
  setPitch,
  numScenes,
  setNumScenes,
  style,
  setStyle,
  language,
  setLanguage,
  logoOverlay,
  setLogoOverlay,
  isLoading,
  errorMessage,
  onGenerate,
  styles,
  onLogoUpload,
  onLogoRemove
}: CreateTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  return (
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
          <label htmlFor="language" className="text-sm font-medium">
            Language:
          </label>
          <Select 
            value={language.code} 
            onValueChange={(code) => {
              const selectedLanguage = LANGUAGES.find(lang => lang.code === code);
              if (selectedLanguage) {
                setLanguage(selectedLanguage);
              }
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select language">
                {language.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                  target.onerror = null;
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogoRemove}
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
              <input type="file" ref={fileInputRef} onChange={onLogoUpload} accept="image/*" className="hidden" />
            </div>
          )}
        </div>
        <Button 
          onClick={onGenerate} 
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
  )
} 