# 🔮 Tarot Místico

Convierte fotografías en cartas de tarot personalizadas usando inteligencia artificial.

## Cómo funciona

1. El cliente sube su foto
2. La IA analiza la foto y le da una **lectura de tarot personalizada** (aparece en ~5 segundos)
3. Mientras el cliente lee su lectura, la IA **transforma la foto en carta de tarot** (~30-60 segundos)
4. La carta se muestra con marca de agua
5. El cliente paga **$129 MXN** para desbloquear la descarga sin marca

## Límites

- Cada persona puede generar **2 cartas gratis** (rastreado por dispositivo)
- Después de 2, debe pagar antes de generar más

## ⚡ Cómo publicar tu página (paso a paso)

### Paso 1: Crea una cuenta en GitHub
1. Ve a [github.com](https://github.com) y crea una cuenta gratuita
2. Crea un nuevo repositorio (botón verde "New")
3. Ponle nombre: `tarot-mistico`
4. Déjalo público
5. Click en "Create repository"

### Paso 2: Sube los archivos
1. En tu nuevo repositorio, click en "uploading an existing file"
2. Arrastra TODOS los archivos de esta carpeta (incluyendo las carpetas `api/` y `public/`)
3. Click en "Commit changes"

**La estructura debe quedar así:**
```
tarot-mistico/
├── api/
│   ├── reading.js
│   └── generate.js
├── public/
│   └── index.html
├── package.json
├── vercel.json
└── README.md
```

### Paso 3: Crea cuenta en Vercel y conecta
1. Ve a [vercel.com](https://vercel.com)
2. Click en "Sign Up" → selecciona "Continue with GitHub"
3. Autoriza Vercel a acceder a tu GitHub
4. Click en "Add New Project"
5. Busca y selecciona tu repositorio `tarot-mistico`
6. **IMPORTANTE:** En "Environment Variables", agrega:
   - Name: `OPENAI_API_KEY`
   - Value: `tu-api-key-de-openai`
7. Click en "Deploy"

### Paso 4: ¡Listo!
- Vercel te dará una URL como `tarot-mistico.vercel.app`
- Esa es tu página pública — compártela con tus clientes
- Tu API key está segura en el servidor, nadie la puede ver

## 🔑 ¿Dónde obtengo la API Key de OpenAI?

1. Ve a [platform.openai.com](https://platform.openai.com)
2. Inicia sesión (puedes usar tu misma cuenta de ChatGPT)
3. Ve a **API Keys** en el menú
4. Click en **"Create new secret key"**
5. Copia la key (empieza con `sk-`)
6. Ve a **Settings → Billing** y agrega un método de pago
7. Compra créditos ($5-10 USD para empezar)

## 💰 Costos de API

Cada carta que generas cuesta aproximadamente:
- **Lectura de tarot** (GPT-4o-mini): ~$0.005 USD (~$0.10 MXN)
- **Imagen transformada** (gpt-image-1): ~$0.02-0.08 USD (~$0.40-1.50 MXN)
- **Total por carta**: ~$0.03-0.09 USD (~$0.50-1.60 MXN)

Cobras **$129 MXN** por carta → Tu ganancia neta es de ~$127-128 MXN por carta.

## ⚠️ Notas importantes

- **El pago actualmente es simulado.** Para cobrar de verdad necesitas integrar Stripe, OpenPay, o Conekta. Esto requiere un paso adicional.
- **El límite de 2 cartas gratis** es por dispositivo (localStorage). Un usuario técnico podría borrarlo, pero el 99% de clientes no sabe hacerlo.
- **NUNCA compartas tu API key** en chats, código público, o con otras personas.
- Si necesitas cambiar tu API key, ve a Vercel → Settings → Environment Variables.

## 🔧 Personalización

- **Cambiar precio:** Busca `PRICE = 129` en `public/index.html`
- **Cambiar límite gratuito:** Busca `FREE_LIMIT = 2` en `public/index.html`
- **Cambiar estilo de la carta:** Edita el prompt en `api/generate.js`
