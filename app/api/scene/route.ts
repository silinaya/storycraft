export async function POST(req: Request): Promise<Response> {
  const scene: {
      imagePrompt: string;
      description: string;
      voiceover: string;
      imageBase64?: string;
    } = await req.json();

  // Simulate processing (e.g., fetching data, saving to DB, etc.)
  console.log(`start temp for ${scene.voiceover}`)
  await new Promise((resolve) => setTimeout(resolve, 10000))
  console.log(`end temp for ${scene.voiceover}`)
  const message = `temp for ${scene.voiceover}`
  return Response.json({ success: true, message }); // Return response data if needed
}