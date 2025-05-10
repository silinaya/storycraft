'use client'

import Image from 'next/image'

interface ScenarioTabProps {
    scenario: {
        scenario: string;
        genre: string;
        mood: string;
        characters: Array<{name:string, description: string, imageBase64?: string}>;
        settings: Array<{ name: string, description: string }>;
    };
}

export function ScenarioTab({ scenario }: ScenarioTabProps) {
    return (
        <div className="max-w-xl mx-auto space-y-4">
            <p>{scenario.scenario}</p>
            {scenario.characters.map((character) => (
                <>
                    <div className="col-span-1">
                        <h3 className="text-xl font-bold">{character.name}</h3>
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
            {scenario.settings.map((setting) => (
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

