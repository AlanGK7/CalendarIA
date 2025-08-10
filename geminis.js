import { GoogleGenAI } from "@google/genai";
import fs from 'fs'; // lectura de archivos
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ai = new GoogleGenAI({});

const systemPrompt = fs.readFileSync('./prompt.txt', 'utf8');
async function Response(message) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
        systemInstruction: systemPrompt.replace('{{HOY}}', today)
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("Response from Gemini:", text);

    return text;
  } catch (error) {
    console.error("Error en Gemini API:", error);
    throw new Error("Error en la API de Gemini");
  }
}

export { Response };