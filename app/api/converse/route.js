import { chat } from "@/lib/openaiClient";
import { checkSafety } from "@/lib/contentSafety";
import { initMonitor, trackEvent } from "@/lib/monitor";
import fs from "fs";
import path from "path";

initMonitor();

async function detectAndTranslate(text, targetLanguage) {
  const key = process.env.TRANSLATOR_KEY;
  const endpoint = process.env.TRANSLATOR_ENDPOINT;

  const detectResponse = await fetch(endpoint + "/detect?api-version=3.0", {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ text: text }]),
  });
  const detectData = await detectResponse.json();
  const detection = detectData[0];
  const detectedLanguage = (detection && detection.language && detection.score > 0.7)
    ? detection.language
    : "en";

  if (detectedLanguage === targetLanguage) {
    return { translatedText: text, detectedLanguage: detectedLanguage };
  }

  const translateResponse = await fetch(
    endpoint + "/translate?api-version=3.0&from=" + detectedLanguage + "&to=" + targetLanguage,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ text: text }]),
    }
  );
  const translateData = await translateResponse.json();
  const translatedText = translateData[0] && translateData[0].translations && translateData[0].translations[0]
    ? translateData[0].translations[0].text
    : text;
  return { translatedText: translatedText, detectedLanguage: detectedLanguage };
}

async function translateText(text, fromLanguage, toLanguage) {
  if (fromLanguage === toLanguage) return text;
  const key = process.env.TRANSLATOR_KEY;
  const endpoint = process.env.TRANSLATOR_ENDPOINT;

  const response = await fetch(
    endpoint + "/translate?api-version=3.0&from=" + fromLanguage + "&to=" + toLanguage,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ text: text }]),
    }
  );
  const data = await response.json();
  return data[0] && data[0].translations && data[0].translations[0]
    ? data[0].translations[0].text
    : text;
}

async function triggerCaregiverAlert(message) {
  try {
    await fetch(process.env.LOGIC_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        timestamp: new Date().toISOString(),
        alert: "DISTRESS DETECTED — immediate caregiver review required",
      }),
    });
    console.log("Caregiver alert sent via Logic Apps");
  } catch (err) {
    console.error("Logic Apps alert failed:", err);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message;
    const mode = body.mode || "normal";
    const history = body.history || [];

    console.log("User interaction:", userMessage, "Mode:", mode);
    trackEvent("chat_message", { mode, messageLength: userMessage.length });

    // DISTRESS DETECTION
    const distressPhrases = [
      "don't want to be here",
      "dont want to be here",
      "want to die",
      "end my life",
      "kill myself",
      "no reason to live",
      "give up",
      "can't go on",
      "cant go on",
      "not worth living",
      "wish i was dead",
      "veux mourir",
      "quiero morir",
      "voglio morire"
    ];
    const isDistressed = distressPhrases.some(function(phrase) {
      return userMessage.toLowerCase().includes(phrase);
    });

    if (isDistressed) {
      const alertPath = path.join(process.cwd(), "data", "alerts.json");
      let alerts = [];
      if (fs.existsSync(alertPath)) {
        alerts = JSON.parse(fs.readFileSync(alertPath, "utf-8"));
      }
      alerts.push({ message: userMessage, timestamp: new Date().toISOString() });
      fs.writeFileSync(alertPath, JSON.stringify(alerts, null, 2));
      await triggerCaregiverAlert(userMessage);
      trackEvent("distress_detected", { message: userMessage });

      const distressResponses = [
        "I hear you, and I am so glad you told me. You matter so much. Let us stay together right now — can you tell me one person who loves you?",
        "Thank you for trusting me with that. I am right here with you. You are not alone — can you tell me about someone who makes you feel safe?",
        "I am so glad you are talking to me. What you are feeling matters. Can you tell me one thing that has brought you comfort before?",
        "I hear how hard things feel right now. I am not going anywhere. Can you tell me about a time when you felt loved?"
      ];
      const randomDistress = distressResponses[Math.floor(Math.random() * distressResponses.length)];
      return Response.json({ response: randomDistress, alert: true });
    }

    // CONTENT SAFETY CHECK
    const isFlagged = await checkSafety(userMessage);
    if (isFlagged) {
      await triggerCaregiverAlert(userMessage);
      trackEvent("content_flagged", { message: userMessage });
      const safeResponses = [
        "I am right here with you. You are not alone in this. Can you tell me about someone who makes you feel safe?",
        "I hear that things feel hard right now. That is okay. What is one small thing that brought you comfort today?",
        "You matter so much to me. Let us just sit together for a moment. Is there a happy place you like to think of?",
        "I am so glad you are talking to me. Tell me — what is something you used to love doing?"
      ];
      const randomSafe = safeResponses[Math.floor(Math.random() * safeResponses.length)];
      return Response.json({ response: randomSafe, alert: true });
    }

    // DETECT LANGUAGE AND TRANSLATE TO ENGLISH
    let detectedLanguage = "en";
    let messageForAI = userMessage;
    const wordCount = userMessage.trim().split(/\s+/).length;
    if (wordCount > 4) {
      try {
        const result = await detectAndTranslate(userMessage, "en");
        detectedLanguage = result.detectedLanguage;
        messageForAI = result.translatedText;
      } catch (translationError) {
        console.error("Translation error:", translationError);
      }
    }

    // LOAD MEMORIES
    const filePath = path.join(process.cwd(), "data", "patientMemory.json");
    let memories = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      memories = JSON.parse(fileData);
    }
    const memoryContext = memories.length
      ? "Here are important memories about the user:\n- " + memories.join("\n- ")
      : "No memories yet.";

    let toneInstruction = "";
    if (mode === "gentle") {
      toneInstruction = "GENTLE MODE: Use very short sentences. Maximum 2 sentences per response. Speak like a warm grandmother or trusted friend. Always start by acknowledging the feeling before anything else. Use soft words like I hear you, That sounds lovely, How wonderful. Never ask more than one question. If the person is sad or upset, sit with them in it first. Do not rush to fix.";
    } else if (mode === "hard") {
      toneInstruction = "DIRECT MODE: Be clear, calm, and grounding. Use plain simple language. Get to the point quickly but stay warm. Acknowledge the feeling in one short sentence, then respond practically. Ask direct, clear questions.";
    } else {
      toneInstruction = "NORMAL MODE: Be conversational, warm, and natural. Balance acknowledging feelings with gentle conversation. Ask one question at a time.";
    }

    const systemPrompt = "You are a compassionate AI companion for someone experiencing memory loss. You are talking directly TO this person, not about them.\n" +
      toneInstruction + "\n" +
      "When the person tells you their name, remember it is THEIR name. Use it warmly in conversation.\n" +
      "Actively reference specific memories when appropriate.\n" +
      memoryContext + "\n" +
      "RULES:\n" +
      "- NEVER correct the user\n" +
      "- NEVER mention memory loss or dementia\n" +
      "- NEVER say you cannot respond to something\n" +
      "- NEVER give the same response twice\n" +
      "- Always respond with presence and warmth\n" +
      "- Keep responses short and focused\n" +
      "- Always acknowledge what was just said before moving forward";

    const aiResponse = await chat(systemPrompt, [
      ...history,
      { role: "user", content: messageForAI },
    ]);

    trackEvent("chat_response", { mode, detectedLanguage, responseLength: aiResponse.length });

    // TRANSLATE RESPONSE BACK TO USER LANGUAGE
    let finalResponse = aiResponse;
    if (detectedLanguage !== "en") {
      try {
        finalResponse = await translateText(aiResponse, "en", detectedLanguage);
      } catch (translationError) {
        console.error("Response translation error:", translationError);
      }
    }

    return Response.json({ response: finalResponse });

  } catch (error) {
    console.error("Converse API Error:", error);
    trackEvent("chat_error", { error: error.message });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}