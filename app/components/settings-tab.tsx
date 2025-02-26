'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SettingsTabProps {
    scenario: {
        scenario: string;
        genre: string;
        mood: string;
        characters: Array<{ name: string, description: string }>;
        settings: Array<{ name: string, description: string }>;
    };
}

export function SettingsTab({ scenario }: SettingsTabProps) {
    return (
        <div className="max-w-xl mx-auto space-y-4">
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

