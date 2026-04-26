import { GoogleGenAI, Type } from "@google/genai";
import { Channel, Program } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getEPGData(channelName: string): Promise<{ current: Program | null, upcoming: Program[] }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the current and next 3 upcoming programs for the Indian TV channel "${channelName}" today. 
      Return the data in JSON format with "current" (a single program) and "upcoming" (an array of 3 programs). 
      Each program should have "title", "start" (HH:MM), "end" (HH:MM), and a short "description".`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            current: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "start", "end"]
            },
            upcoming: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  start: { type: Type.STRING },
                  end: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "start", "end"]
              }
            }
          },
          required: ["current", "upcoming"]
        }
      },
    });
    
    const data = JSON.parse(response.text || "{}");
    return {
      current: data.current || null,
      upcoming: data.upcoming || []
    };
  } catch (error) {
    console.error("Gemini EPG Error:", error);
    // Fallback to static data
    return {
      current: {
        title: "Live Program",
        start: "Now",
        end: "Later",
        description: `Currently broadcasting live on ${channelName}.`
      },
      upcoming: [
        { title: "Next Program", start: "Soon", end: "Later", description: "Stay tuned for the next broadcast." },
        { title: "Evening Highlights", start: "Evening", end: "Night", description: "The best moments from today's shows." }
      ]
    };
  }
}

export async function getSmartRecommendations(history: string[], allChannels: Channel[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this viewing history: ${history.join(", ")}, recommend 3 channels from this list: ${allChannels.map(c => c.name).join(", ")}. Return only the names as a comma separated list.`,
    });
    
    const recommendedNames = response.text?.split(",").map(n => n.trim()) || [];
    return allChannels.filter(c => recommendedNames.includes(c.name));
  } catch (error) {
    console.error("Gemini Error:", error);
    return allChannels.slice(0, 3);
  }
}

export async function smartSearch(query: string, allChannels: Channel[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is searching for: "${query}". Based on these channels: ${allChannels.map(c => c.name).join(", ")}, which ones match the intent? Return only the names as a comma separated list.`,
    });
    
    const matchedNames = response.text?.split(",").map(n => n.trim()) || [];
    return allChannels.filter(c => matchedNames.includes(c.name));
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return allChannels.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  }
}

export async function categorizeChannel(channelName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categorize the Indian TV channel "${channelName}" into one of: News, Sports, Entertainment, Movies, Regional, or Other. Return only the category name.`,
    });
    return response.text?.trim() || "Other";
  } catch (error) {
    return "Other";
  }
}
