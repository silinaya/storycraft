'use client'

import { Button } from "@/components/ui/button"
import { LayoutGrid } from "lucide-react";
import Image from 'next/image'
import { Scenario } from "../types";

interface ScenarioTabProps {
    scenario?: Scenario;
    onGenerateStoryBoard: () => void;
}

export function ScenarioTab({ scenario, onGenerateStoryBoard }: ScenarioTabProps) {
    return (
        <div className="space-y-8">
            {scenario && (
                <>
                    <div className="flex justify-end space-x-4">
                        <Button
                            onClick={onGenerateStoryBoard}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Generate Storyboard
                        </Button>
                    </div>
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Scenario</h3>
                        </div>
                        <div className="col-span-2">
                            <p>{scenario.scenario}</p>
                        </div>
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Characters</h3>
                        </div>
                        {scenario.characters.map((character) => (
                            <>
                                <div className="col-span-1">
                                    <h4 className="text-lg">{character.name}</h4>
                                </div>
                                <div className="col-span-2">
                                    <Image
                                        src={`data:image/png;base64,${character.imageBase64}`}
                                        alt={`Character ${character.name}`}
                                        // --- Adjust width/height props for desired size ---
                                        width={200}
                                        height={200}
                                        // --- Keep object-cover if you want the image to fill the square/rect defined by width/height, cropping if necessary ---
                                        // --- Add rounded corners if desired ---
                                        className="object-cover rounded-lg shadow-md"
                                        // --- Keep onError ---
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = "/placeholder.svg"; // Make sure placeholder.svg is in your public folder
                                            target.onerror = null; // Prevent infinite loop
                                            target.width = 200; // Apply size to placeholder too
                                            target.height = 200;
                                            target.classList.add('object-contain'); // Maybe use contain for placeholder
                                            target.classList.remove('object-cover');
                                        }}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <p>{character.description}</p>
                                </div>
                            </>
                        ))}
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Settings</h3>
                        </div>
                        {scenario.settings.map((setting) => (
                            <>
                                <div className="col-span-1">
                                    <h4 className="text-lg">{setting.name}</h4>
                                </div>
                                <div className="col-span-2">
                                    <p>{setting.description}</p>
                                </div>
                            </>
                        ))}
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Music</h3>
                        </div>
                        <div className="col-span-2">
                            <p>{scenario.music}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

