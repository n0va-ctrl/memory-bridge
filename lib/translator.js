export async function translateText(text, to = "es") {
  const key = process.env.TRANSLATOR_KEY;
  const endpoint = process.env.TRANSLATOR_ENDPOINT;

  const url = `${endpoint}/translate?api-version=3.0&to=${to}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ text }]),
  });

  const data = await response.json();

  return data[0]?.translations[0]?.text || text;
}