'use client'

import { Button } from "@/components/ui/button"
import { LayoutGrid, Loader2, Pencil } from "lucide-react";
import { Scenario } from "../../types";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { GcsImage } from "../ui/gcs-image";

interface ScenarioTabProps {
    scenario?: Scenario;
    onGenerateStoryBoard: () => void;
    isLoading: boolean;
    onScenarioUpdate?: (updatedScenario: Scenario) => void;
}

export function ScenarioTab({ scenario, onGenerateStoryBoard, isLoading, onScenarioUpdate }: ScenarioTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedScenario, setEditedScenario] = useState(scenario?.scenario || '');
    const [isHovering, setIsHovering] = useState(false);
    const scenarioRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scenario?.scenario) {
            setEditedScenario(scenario.scenario);
        }
    }, [scenario?.scenario]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (scenarioRef.current && !scenarioRef.current.contains(event.target as Node)) {
                if (isEditing) {
                    handleSave();
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditing, editedScenario]);

    const handleScenarioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedScenario(e.target.value);
    };

    const handleSave = async () => {
        if (scenario && onScenarioUpdate) {
            const updatedScenario = {
                ...scenario,
                scenario: editedScenario
            };
            onScenarioUpdate(updatedScenario);
            setEditedScenario(updatedScenario.scenario);
        }
        setIsEditing(false);
    };

    return (
        <div className="space-y-8">
            {scenario && (
                <>
                    <div className="flex justify-end">
                        <Button
                            onClick={onGenerateStoryBoard}
                            disabled={isLoading}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isLoading ? (
                                <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Storyboard...
                                </>
                            ) : (
                                <>
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Generate Storyboard with Imagen 4.0
                                </>
                            )}
                        </Button>
                    </div>
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Scenario</h3>
                        </div>
                        <div 
                            ref={scenarioRef}
                            className="relative group"
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                        >
                            {!isEditing && isHovering && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all"
                                >
                                    <Pencil className="h-4 w-4 text-gray-600" />
                                </button>
                            )}
                            {isEditing ? (
                                <Textarea
                                    value={editedScenario}
                                    onChange={handleScenarioChange}
                                    className="min-h-[200px] w-full"
                                    placeholder="Enter your scenario..."
                                    autoFocus
                                />
                            ) : (
                                <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">{scenario.scenario}</p>
                            )}
                        </div>
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Characters</h3>
                        </div>
                        {scenario.characters.map((character) => (
                            <div key={character.name} className="flex gap-4 items-start">
                                <div className="flex-shrink-0 w-[200px] h-[200px] relative">
                                    <GcsImage
                                        gcsUri={character.imageGcsUri || null}
                                        alt={`Character ${character.name}`}
                                        className="object-cover rounded-lg shadow-md"
                                        sizes="200px"
                                    />
                                </div>
                                <div className="flex-grow">
                                    <h4 className="text-lg font-semibold mb-2">{character.name}</h4>
                                    <p>{character.description}</p>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Settings</h3>
                        </div>
                        {scenario.settings.map((setting) => (
                            <div key={setting.name}>
                                <div className="col-span-1">
                                    <h4 className="text-lg">{setting.name}</h4>
                                </div>
                                <div className="col-span-2">
                                    <p>{setting.description}</p>
                                </div>
                            </div>
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

