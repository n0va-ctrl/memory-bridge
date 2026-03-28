import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { checkSafety } from "./lib/contentSafety.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// HEALTH + ROOT ROUTES
// =======================
app.get("/", (req, res) => {
  res.send("Memory Bridge API is live 🚀");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// =======================
// TEMP MEMORY STORE (fallback if Cosmos fails)
// =======================
let memoryStore = [];

// =======================
// HARVEST (store memory)
// =======================
app.post("/api/harvest", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    memoryStore.push({
      id: Date.now(),
      text,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Harvest error:", err);
    res.status(500).json({ error: "Harvest failed" });
  }
});

// =======================
// CONVERSE (AI response)
// =======================
app.post("/api/converse", async (req, res) => {
  try {
    let { messages, message } = req.body;

    // Support BOTH formats
    if (!messages && message) {
      messages = [{ role: "user", content: message }];
    }

    if (!messages) {
      return res.json({ reply: "No messages provided" });
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content || "";

    // 🔥 CONTENT SAFETY CHECK
    const isUnsafe = await checkSafety(lastUserMessage);

    if (isUnsafe) {
      return res.json({
        reply: "I'm here to help, but I can't respond to that.",
      });
    }

    // Inject memory context
    const memoryContext =
      memoryStore.length > 0
        ? `User facts:\n${memoryStore.map((m) => "- " + m.text).join("\n")}`
        : "User is still being learned.";

    // Fake AI response (replace with Azure OpenAI if needed)
    const reply = `That reminds me — you told me: ${memoryContext}`;

    res.json({ reply });
  } catch (err) {
    console.error("Converse error:", err);
    res.status(500).json({ error: "Converse failed" });
  }
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});