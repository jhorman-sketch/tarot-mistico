const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType || 'image/png'};base64,${image}` }
          },
          {
            type: 'text',
            text: `Eres un místico y sabio lector de tarot con décadas de experiencia. Analiza esta fotografía y asígnale una carta de los 22 Arcanos Mayores del Tarot que mejor represente la energía de esta persona.

Responde ÚNICAMENTE con JSON válido (sin backticks ni markdown):
{
  "numeral": "XVII",
  "nombre": "La Estrella",
  "elemento": "Agua",
  "energia": "Renovación y esperanza",
  "lectura": "Una lectura mística personalizada de 3-4 oraciones en español, poética y profunda, que conecte la esencia de la persona con el significado de la carta.",
  "consejo": "Un consejo místico de 1-2 oraciones basado en la carta.",
  "significado": "Explicación breve de 1-2 oraciones del significado general de esta carta en el tarot."
}`
          }
        ]
      }]
    });

    const text = response.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Reading error:', err);

    // Fallback reading
    return res.status(200).json({
      numeral: 'XVII',
      nombre: 'La Estrella',
      elemento: 'Agua',
      energia: 'Renovación y esperanza',
      lectura: 'Las estrellas reconocen en ti una luz que trasciende lo ordinario. Tu camino está iluminado por fuerzas que no siempre puedes ver, pero que siempre están presentes. Confía en el universo.',
      consejo: 'Permite que tu intuición te guíe en las decisiones importantes que se acercan.',
      significado: 'La Estrella representa la esperanza, la inspiración y la serenidad después de tiempos turbulentos.'
    });
  }
};
