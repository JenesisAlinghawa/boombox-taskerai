import { HfInference } from '@huggingface/inference';
import { NextRequest, NextResponse } from "next/server";

const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { prompt, type } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Call Hugging Face API directly for field detection
    const response = await inference.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      inputs: prompt,
      parameters: {
        max_new_tokens: 50,
        temperature: 0.3, // Low temperature for consistent classification
        top_p: 0.9,
      },
    });

    // Extract the generated text
    const generatedText = response.generated_text.slice(prompt.length).trim();

    return NextResponse.json({
      response: generatedText,
      type: type,
    });
  } catch (error) {
    console.error("AI field detection error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
