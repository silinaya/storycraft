'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScenarioTabProps {
    scenario: {
        scenario: string;
        genre: string;
        mood: string;
        characters: Array<{ name: string, description: string }>;
        settings: Array<{ name: string, description: string }>;
    };
}

export function ScenarioTab({ scenario }: ScenarioTabProps) {
    return (
        <div className="max-w-xl mx-auto space-y-4">
            <p>{scenario.scenario}</p>
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
            {scenario.settings.map((setting, index) => (
                <>
                    <div className="col-span-1">
                        <h3 className="text-xl font-bold">{setting.name}</h3>
                    </div>
                    <div className="col-span-2">
                        <p>{setting.description}</p>
                    </div>
                </>
            ))}
        </div>
    )
}

