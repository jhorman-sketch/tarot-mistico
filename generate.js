const OpenAI = require('openai');
const { toFile } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Convert base64 to file for OpenAI SDK
    const buffer = Buffer.from(image, 'base64');
    const file = await toFile(buffer, 'photo.png', { type: 'image/png' });

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: [file],
      prompt: `Transforma esta fotografía en una ilustración artística de carta de tarot.

CRUCIAL: Mantén el parecido físico EXACTO de la persona — sus facciones, estructura facial, color de piel, forma de ojos, nariz, boca y rasgos distintivos deben ser claramente reconocibles. Esta persona debe poder verse a sí misma en la carta.

Estilo visual:
- Ilustración mística de tarot clásico estilo Rider-Waite
- Colores ricos y saturados: dorados brillantes, púrpuras profundos, azules noche, rojos místicos
- La persona aparece como el personaje central de la carta
- Vestida con ropas místicas, etéreas y ornamentales apropiadas para una carta de tarot
- Rodeada de simbolismo arcano: estrellas, lunas, constelaciones, elementos celestiales
- Marco ornamental dorado con detalles intrincados
- Fondo con elementos cósmicos y místicos
- Estilo artístico: pintura detallada mística de alta calidad, NO fotorrealista
- Iluminación dramática con resplandores dorados y místicos`,
      size: '1024x1536',
    });

    const b64 = response.data?.[0]?.b64_json;
    const url = response.data?.[0]?.url;

    if (b64) {
      return res.status(200).json({ image: b64 });
    } else if (url) {
      return res.status(200).json({ url });
    } else {
      throw new Error('No image returned from API');
    }

  } catch (err) {
    console.error('Generate error:', err.message);
    return res.status(500).json({
      error: 'Error al generar la imagen',
      details: err.message
    });
  }
};
