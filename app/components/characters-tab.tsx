'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from '@/components/ui/input'

interface CharactersTabProps {
    scenario: {
      scenario: string;
      genre: string;
      mood: string;
      characters: Array<{name:string, description: string}>;
      settings: Array<{name:string, description: string}>;
    };
  }

export function CharactersTab({ scenario }: CharactersTabProps) {
  return (
    <div className="max-w-xl mx-auto space-y-4">
            {scenario.characters.map((character, index) => (
                <>
                    <div className="col-span-1">
                        <h3 className="text-xl font-bold">{character.name}</h3>
                    </div>
                    <div className="col-span-2">
                        <p>{character.description}</p>
                    </div>
                </>
            ))}
        </div>
  )
}

