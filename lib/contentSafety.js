export async function checkSafety(text) {
  const endpoint = process.env.CONTENT_SAFETY_ENDPOINT;
  const key = process.env.CONTENT_SAFETY_KEY;

  const url = `${endpoint}/contentsafety/text:analyze?api-version=2023-10-01`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": key,
    },
    body: JSON.stringify({
      text: text,
    }),
  });

  const data = await response.json();

  // Check if any category is flagged
  const flagged = data.categoriesAnalysis?.some(
    (category) => category.severity > 0
  );

  return flagged;
}