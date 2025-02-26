'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from '@/components/ui/input'
import { Button } from "@/components/ui/button"

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: {
    scenario: string;
    genre: string;
    mood: string;
    characters: Array<{name:string, description: string}>;
    settings: Array<{name:string, description: string}>;
  };
}

export function ScenarioModal({ isOpen, onClose, scenario }: ScenarioModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Scenario</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
        <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <label htmlFor="characters" className="text-sm font-medium">
                Characters
              </label>
            </div>
            {scenario.characters.map((character, index) => (
              <>
                <div className="col-span-1">
                  <Input
                    className="col-span-1"
                    id={`character_name_${index}`}
                    value={character.name} />
                </div>
                <div className="col-span-2">
                  <Textarea
                    id={`character_description_${index}`}
                    value={character.description}
                    rows={4} />
                </div>
              </>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <label htmlFor="settings" className="text-sm font-medium">
                Characters
              </label>
            </div>
            {scenario.settings.map((setting, index) => (
              <>
                <div className="col-span-1">
                  <Input
                    className="col-span-1"
                    id={`setting_name_${index}`}
                    value={setting.name} />
                </div>
                <div className="col-span-2">
                  <Textarea
                    id={`setting_description_${index}`}
                    value={setting.description}
                    rows={4} />
                </div>
              </>
            ))}
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="scenario" className="text-sm font-medium">
                Scenario
              </label>
              <Textarea
                id="scenario"
                value={scenario.scenario}
                rows={6}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="genre" className="text-sm font-medium">
              Genre
            </label>
            <Input
              id="genre"
              value={scenario.genre}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="mood" className="text-sm font-medium">
              Mood
            </label>
            <Input
              id="mood"
              value={scenario.mood}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

