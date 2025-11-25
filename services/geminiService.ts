

import { GoogleGenAI, Modality } from "@google/genai";
import { Character } from '../types';

// Initialize the client. The API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a new image using Imagen 4.0
 */
export const generateComicImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' = '1:1'): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) {
      throw new Error("No image generated");
    }
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

/**
 * Generates an image based on a reference sketch and a prompt
 * Uses Gemini 2.5 Flash Image (Multimodal)
 */
export const generateImageFromSketch = async (
  base64Sketch: string, 
  prompt: string
): Promise<string> => {
  try {
    // Extract raw base64 data if the prefix exists
    const base64Data = base64Sketch.includes('base64,') 
      ? base64Sketch.split('base64,')[1] 
      : base64Sketch;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg', // Using jpeg as standard container
            },
          },
          {
            text: `Turn this rough sketch into a finished comic panel. ${prompt}. Maintain the composition of the sketch but apply the requested art style heavily.`,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Parse the response for the image part
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No content in response");

    let newImageBase64 = '';
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        newImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!newImageBase64) {
      throw new Error("No image data found in sketch response");
    }

    return newImageBase64;

  } catch (error) {
    console.error("Error transforming sketch:", error);
    throw error;
  }
};

/**
 * Edits an existing image using Gemini 2.5 Flash Image (Nano Banana)
 * This follows the pattern: Image + Text Prompt -> New Image
 */
export const editComicImage = async (base64Image: string, editPrompt: string): Promise<string> => {
  try {
    // Extract raw base64 data if the prefix exists
    const base64Data = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg', 
            },
          },
          {
            text: editPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Parse the response for the image part
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No content in response");

    let newImageBase64 = '';
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        newImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!newImageBase64) {
      throw new Error("No image data found in edit response");
    }

    return newImageBase64;

  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Generates text content for narrative assistance using Gemini 2.5 Flash
 */
export const generateNarrativeElement = async (
  type: 'PLOT' | 'DIALOGUE' | 'NEXT_PANEL',
  context: string,
  characterContext: string = ''
): Promise<string> => {
  try {
    let prompt = '';
    // Prompt engineering for specific narrative tasks
    switch (type) {
      case 'PLOT':
        prompt = `You are a comic book writer. Generate a single, visually descriptive scene idea for a comic panel based on this theme (or random if empty): "${context}". 
        ${characterContext ? `Include these established characters in the scene: ${characterContext}` : ''}
        Output ONLY the visual description suitable for an image generator. Keep it under 40 words. Do not surround the text with quotes.`;
        break;
      case 'DIALOGUE':
        prompt = `You are a comic book writer. Write a short, punchy dialogue or caption (max 15 words) for a panel described as: "${context}". 
        Output ONLY the text to be written in the speech bubble/caption box. Do not include character names like 'Hero:'. Do not surround with quotes.`;
        break;
      case 'NEXT_PANEL':
        prompt = `You are a comic book writer. 
        CONTEXT - Previous Panel Description: "${context}".
        ${characterContext ? `CONTEXT - Established Characters/Setting: ${characterContext}.` : ''}

        Task: Write a visual description for the NEXT panel to continue the story.
        
        CRITICAL INSTRUCTION: You MUST explicitly mention and describe the characters based on the 'Established Characters' context provided. 
        If the previous panel had multiple characters, ensure the next panel maintains their distinct identities.
        
        VERY IMPORTANT: Do NOT use vague pronouns like 'he', 'she', or 'they'. ALWAYS follow names with a brief visual trait from the context.
        Example: Instead of "Alice jumps", write "Alice, the blonde woman in red armor, jumps".

        Output ONLY the visual description for the image generator. Keep it under 40 words. Do not surround with quotes.`;
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text?.trim() || '';
    // Clean up quotes if they still appear
    text = text.replace(/^["']|["']$/g, '');
    return text;
  } catch (error) {
    console.error("Error generating narrative:", error);
    throw error;
  }
};