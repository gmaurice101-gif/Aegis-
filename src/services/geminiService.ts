import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeCrowd(imageData: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Analyze this surveillance frame from a political rally. Identify any security risks, crowd mood, and general demographics. Be technical and precise. Do not invent names for people unless they are world-famous figures you are absolutely certain of." },
            { inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] } }
          ]
        }
      ],
      config: {
        temperature: 0.4,
        topP: 0.8,
      }
    });

    return response.text;
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    return "Analysis engine temporarily unavailable. Check connectivity.";
  }
}
