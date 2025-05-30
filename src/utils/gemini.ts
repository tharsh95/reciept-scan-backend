import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config()
// Initialize the API with proper error handling
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const ai = new GoogleGenerativeAI(apiKey);

export async function generateResponse(prompt: string) {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating response from Gemini:", error);
    throw new Error("Failed to generate response from Gemini API");
  }
}
