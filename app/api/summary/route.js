import { chat } from "@/lib/openaiClient";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const filePath = path.join(process.cwd(), "data", "patientMemory.json");
    let memories = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      memories = JSON.parse(fileData);
    }

    if (memories.length === 0) {
      return Response.json({
        patientName: "Patient",
        mood: { label: "Stable", score: 72, trend: "up" },
        weekSummary: ["No conversations recorded yet. Start a chat to see insights here."],
        lastActive: "Not yet active"
      });
    }

    const memoryContext = memories.join("\n- ");

    const aiResponse = await chat("You are a caregiver assistant. Return only valid JSON, no markdown, no explanation, no extra text.", [
      {
        role: "user",
        content: `Based on these memories about a patient, return a JSON object:
- ${memoryContext}

Return ONLY this exact JSON structure with no other text:
{"patientName":"NAME","mood":{"label":"Stable","score":75,"trend":"up"},"weekSummary":["insight 1","insight 2","insight 3"],"lastActive":"Today"}

Rules:
- patientName: extract the person's first name from memories
- mood.label: one of Stable, Good, Struggling, Anxious, Calm
- mood.score: number 0-100 based on emotional tone of memories
- mood.trend: up or down
- weekSummary: 3 insights based on actual memories
- Return ONLY the JSON, nothing else`
      }
    ]);

    const clean = aiResponse.replace(/```json|```/g, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return Response.json({
        patientName: "Patient",
        mood: { label: "Stable", score: 72, trend: "up" },
        weekSummary: ["Unable to parse insights. Please try refreshing."],
        lastActive: "Today"
      });
    }

    const safe = {
      patientName: parsed.patientName || "Patient",
      mood: {
        label: parsed.mood?.label || "Stable",
        score: parsed.mood?.score || 72,
        trend: parsed.mood?.trend || "up"
      },
      weekSummary: parsed.weekSummary || ["No insights available yet."],
      lastActive: parsed.lastActive || "Today"
    };

    return Response.json(safe);
  } catch (error) {
    console.error("Summary API Error:", error);
    return Response.json({
      patientName: "Patient",
      mood: { label: "Stable", score: 72, trend: "up" },
      weekSummary: ["Unable to load insights. Please try again."],
      lastActive: "Today"
    });
  }
}