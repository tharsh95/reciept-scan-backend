import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateResponse(prompt: string) {
  try {
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return result.choices[0].message.content ?? "";
  } catch (error) {
    console.error("Error generating response from OpenAI:", error);
    throw new Error("Failed to generate response from OpenAI API");
  }
}