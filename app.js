// ═══════════════════════════════════════
//  TAROT MÍSTICO — Main App
// ═══════════════════════════════════════
const PRICE = 129, FREE_LIMIT = 2;
const LS = { key: 'tarot_api_key', used: 'tarot_free_used', paid: 'tarot_paid' };
let cards = [], paidIds = new Set(), payMode = null, isPrepaid = false;
let imageReady = false, readingData = null, currentItem = null;
let progressInterval = null, factsInterval = null, progress = 0;
let useBackend = false;

// ═══════════════════════════════════════
//  DETECT MODE
// ═══════════════════════════════════════
async function detectMode() {
  try {
    const r = await fetch('/api/reading', { method: 'OPTIONS' });
    if (r.ok || r.status === 405 || r.status === 200) useBackend = true;
  } catch { useBackend = false; }
  if (!useBackend) {
    const k = localStorage.getItem(LS.key);
    if (k) {
      document.getElementById('apiKeyInput').value = k;
      document.getElementById('apiKeyStatus').textContent = '✓ Key guardada';
      document.getElementById('apiKeyStatus').className = 'api-key-status ok';
    }
  }
}

// ═══════════════════════════════════════
//  ADMIN KEY (5-tap logo)
// ═══════════════════════════════════════
let tapCount = 0, tapTimer = null;
document.getElementById('logoSymbol').addEventListener('click', () => {
  tapCount++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => tapCount = 0, 2000);
  if (tapCount >= 5) {
    tapCount = 0;
    const el = document.getElementById('apiSetup');
    el.classList.toggle('show');
    if (el.classList.contains('show')) el.scrollIntoView({ behavior: 'smooth' });
  }
});

function saveApiKey() {
  const k = document.getElementById('apiKeyInput').value.trim();
  if (!k.startsWith('sk-')) {
    document.getElementById('apiKeyStatus').textContent = '✗ Debe empezar con sk-';
    document.getElementById('apiKeyStatus').className = 'api-key-status err'; return;
  }
  localStorage.setItem(LS.key, k);
  document.getElementById('apiKeyStatus').textContent = '✓ Guardada correctamente';
  document.getElementById('apiKeyStatus').className = 'api-key-status ok';
  setTimeout(() => document.getElementById('apiSetup').classList.remove('show'), 1000);
}
function getKey() { return localStorage.getItem(LS.key) || ''; }

// ═══════════════════════════════════════
//  FREE LIMIT
// ═══════════════════════════════════════
function fu() { return parseInt(localStorage.getItem(LS.used) || '0', 10); }
function fl() { return Math.max(0, FREE_LIMIT - fu()); }
function useSlot() { localStorage.setItem(LS.used, String(fu() + 1)); updFree(); }
function grantSlot() { localStorage.setItem(LS.used, String(Math.max(0, fu() - 1))); updFree(); }

function updFree() {
  const l = fl();
  document.getElementById('freeCountText').textContent = `${l} de ${FREE_LIMIT} disponibles`;
  document.getElementById('freeCountFill').style.width = (l / FREE_LIMIT * 100) + '%';
  if (l === 0) {
    document.getElementById('freeCounter').style.borderColor = 'rgba(192,57,43,.3)';
    document.getElementById('freeCountFill').style.background = 'linear-gradient(90deg,var(--red),#e74c3c)';
  } else {
    document.getElementById('freeCounter').style.borderColor = 'rgba(212,168,83,.2)';
    document.getElementById('freeCountFill').style.background = 'linear-gradient(90deg,var(--gold-dark),var(--gold))';
  }
}

function chkLimit() {
  const blocked = fl() <= 0;
  document.getElementById('limitWall').classList.toggle('active', blocked);
  document.getElementById('uploadSection').style.display = blocked ? 'none' : 'block';
  const b = document.getElementById('btnAddMore');
  if (b) {
    if (blocked) { b.textContent = '🔒 Pagar para generar más'; b.onclick = openPayPrepaid; }
    else { b.textContent = '✦ Generar otra carta'; b.onclick = addMore; }
  }
}

function toast(m, t = 'error') {
  const e = document.getElementById('toast');
  e.textContent = m; e.className = 'toast ' + t + ' show';
  setTimeout(() => e.classList.remove('show'), 4500);
}

// ═══════════════════════════════════════
//  UPLOAD
// ═══════════════════════════════════════
const ua = document.getElementById('uploadArea');
const fi = document.getElementById('fileInput');

ua.addEventListener('click', () => {
  if (fl() <= 0) { chkLimit(); return; }
  if (!useBackend && !getKey()) {
    document.getElementById('apiSetup').classList.add('show');
    toast('Primero configura tu API Key (toca 🔮 5 veces)');
    return;
  }
  fi.click();
});
ua.addEventListener('dragover', e => { e.preventDefault(); ua.classList.add('dragover'); });
ua.addEventListener('dragleave', () => ua.classList.remove('dragover'));
ua.addEventListener('drop', e => {
  e.preventDefault(); ua.classList.remove('dragover');
  if (fl() <= 0) { chkLimit(); return; }
  if (!useBackend && !getKey()) { document.getElementById('apiSetup').classList.add('show'); toast('Configura tu API Key'); return; }
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) processFiles(files);
});
fi.addEventListener('change', e => {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
  if (files.length) processFiles(files);
});
function addMore() { if (fl() <= 0) { chkLimit(); return; } fi.value = ''; fi.click(); }

// ═══════════════════════════════════════
//  RESIZE IMAGE
// ═══════════════════════════════════════
function resizeImg(file, max = 1500) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(cv.toDataURL('image/png').split(',')[1]);
    };
    img.src = URL.createObjectURL(file);
  });
}

// ═══════════════════════════════════════
//  PROCESS FILES
// ═══════════════════════════════════════
async function processFiles(files) {
  const file = files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast('Archivo demasiado grande (máx 10MB)'); return; }
  if (fl() <= 0) { chkLimit(); return; }

  const b64 = await resizeImg(file);
  const origB64 = 'data:image/png;base64,' + b64;

  const item = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: file.name, origB64, b64,
    resultURL: null, cardName: null, cardNum: null,
    reading: null, consejo: null, elemento: null, energia: null,
    status: 'processing'
  };
  cards.push(item);
  currentItem = item;
  imageReady = false;
  readingData = null;
  useSlot();
  showWaiting();

  // Fire BOTH requests in parallel
  const readingP = callReading(b64);
  const imageP = callGenerate(b64);

  readingP.then(data => {
    readingData = data;
    item.cardName = data.nombre; item.cardNum = data.numeral;
    item.reading = data.lectura; item.consejo = data.consejo;
    item.elemento = data.elemento; item.energia = data.energia;
    showReading(data);
  }).catch(err => {
    console.error('Reading err:', err);
    const fb = { numeral: 'XVII', nombre: 'La Estrella', elemento: 'Agua', energia: 'Renovación', lectura: 'Las estrellas reconocen en ti una luz especial. Tu camino está iluminado por fuerzas misteriosas que guían cada paso.', consejo: 'Confía en tu intuición y deja que el universo te guíe.' };
    readingData = fb; item.cardName = fb.nombre; item.cardNum = fb.numeral; item.reading = fb.lectura; item.consejo = fb.consejo; item.elemento = fb.elemento; item.energia = fb.energia;
    showReading(fb);
  });

  imageP.then(data => {
    if (data.image) item.resultURL = 'data:image/png;base64,' + data.image;
    else if (data.url) item.resultURL = data.url;
    else if (data.b64_json) item.resultURL = 'data:image/png;base64,' + data.b64_json;
    item.status = 'done'; imageReady = true; onImageReady();
  }).catch(err => {
    console.error('Image err:', err);
    item.resultURL = item.origB64; item.status = 'error'; imageReady = true;
    toast('Error generando imagen: ' + err.message); onImageReady();
  });
}

// ═══════════════════════════════════════
//  API CALLS (dual mode)
// ═══════════════════════════════════════
async function callReading(b64) {
  if (useBackend) {
    const r = await fetch('/api/reading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64, mimeType: 'image/png' }) });
    if (!r.ok) throw new Error('API ' + r.status);
    return r.json();
  } else {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getKey() },
      body: JSON.stringify({
        model: 'gpt-4o-mini', max_tokens: 600,
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
          { type: 'text', text: 'Eres un místico lector de tarot. Analiza esta foto y asígnale un Arcano Mayor.\nResponde SOLO JSON válido sin backticks:\n{"numeral":"XVII","nombre":"La Estrella","elemento":"Agua","energia":"Renovación","lectura":"3-4 oraciones místicas en español.","consejo":"1-2 oraciones de consejo místico.","significado":"1-2 oraciones del significado de la carta."}' }
        ] }]
      })
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'Error ' + r.status); }
    const data = await r.json();
    const txt = (data.choices?.[0]?.message?.content || '');
    return JSON.parse(txt.replace(/```json|```/g, '').trim());
  }
}

async function callGenerate(b64) {
  if (useBackend) {
    const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64 }) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.details || e.error || 'Error ' + r.status); }
    return r.json();
  } else {
    const blob = await fetch('data:image/png;base64,' + b64).then(r => r.blob());
    const file = new File([blob], 'photo.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('model', 'gpt-image-1');
    fd.append('image[]', file);
    fd.append('prompt', 'Transforma esta fotografía en una ilustración artística de carta de tarot.\nCRUCIAL: Mantén el parecido físico EXACTO de la persona — sus facciones, estructura facial, color de piel y rasgos distintivos deben ser claramente reconocibles.\nEstilo: ilustración mística de tarot clásico estilo Rider-Waite. Colores ricos: dorados, púrpuras profundos, azules noche. La persona aparece como personaje central vestida con ropas místicas. Rodear con simbolismo arcano: estrellas, lunas, elementos celestiales, marcos dorados. Estilo: pintura detallada mística, NO fotorrealista.');
    fd.append('size', '1024x1536');
    fd.append('quality', 'high');
    const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { 'Authorization': 'Bearer ' + getKey() }, body: fd });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || 'Error ' + r.status); }
    const data = await r.json();
    const img = data.data?.[0];
    if (img?.b64_json) return { image: img.b64_json };
    if (img?.url) return { url: img.url };
    throw new Error('No image returned');
  }
}

// ═══════════════════════════════════════
//  WAITING SCREEN
// ═══════════════════════════════════════
const PHASES = [
  { at: 0, t: 'Conectando con las energías cósmicas...' }, { at: 10, t: 'Analizando tu aura...' },
  { at: 20, t: 'Consultando los arcanos...' }, { at: 35, t: 'Canalizando tu esencia mística...' },
  { at: 50, t: 'Creando tu carta personalizada...' }, { at: 65, t: 'Pintando los detalles místicos...' },
  { at: 80, t: 'Añadiendo simbolismo arcano...' }, { at: 90, t: 'Casi listo... Los astros se alinean...' }
];
const FACTS = [
  'El Tarot tiene <strong>78 cartas</strong> divididas en Arcanos Mayores y Menores.',
  'Los <strong>22 Arcanos Mayores</strong> representan el viaje del alma.',
  'El Tarot se originó en el <strong>siglo XV</strong> en Italia como juego de cartas.',
  'Cada carta tiene un <strong>significado invertido</strong> diferente al derecho.',
  'Los cuatro palos representan los <strong>cuatro elementos</strong>: fuego, agua, tierra y aire.',
  'La carta de <strong>La Torre</strong> puede significar liberación y nuevos comienzos.',
  'El diseño <strong>Rider-Waite</strong> fue creado en 1909 y sigue siendo el más famoso.',
  '<strong>Carl Jung</strong> usaba el Tarot como herramienta de análisis psicológico.',
  'La carta de <strong>El Loco</strong> representa el potencial infinito.',
  'Cada Arcano Mayor es un <strong>arquetipo universal</strong> del inconsciente colectivo.'
];

function showWaiting() {
  ['uploadSection', 'stepsSection', 'freeCounter', 'resultsContainer'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  document.getElementById('limitWall').classList.remove('active');
  document.getElementById('readingReveal').classList.remove('visible');
  document.getElementById('readingConsejo').classList.remove('visible');
  document.getElementById('mysticalFacts').classList.remove('visible');
  document.getElementById('imageReadyBanner').classList.remove('active');
  document.getElementById('waitingPhase').textContent = 'Barajando las cartas del destino...';
  document.getElementById('waitingPhase').style.animation = 'pulse 1.5s ease-in-out infinite';
  document.getElementById('progressFill').style.width = '0%';
  progress = 0;
  document.getElementById('waitingScreen').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  startProgress();
}

function startProgress() {
  clearInterval(progressInterval); clearInterval(factsInterval);
  let fi2 = 0;
  progressInterval = setInterval(() => {
    if (imageReady) { progress = 100; document.getElementById('progressFill').style.width = '100%'; document.getElementById('progressLabel').textContent = '¡Carta completada!'; clearInterval(progressInterval); return; }
    if (progress < 92) { progress += .3 + Math.random() * .5; document.getElementById('progressFill').style.width = Math.min(progress, 92) + '%'; }
    const ph = [...PHASES].reverse().find(p => progress >= p.at);
    if (ph) document.getElementById('progressLabel').textContent = ph.t;
  }, 500);
  setTimeout(() => {
    if (!imageReady) {
      document.getElementById('mysticalFacts').classList.add('visible');
      showFact(fi2);
      factsInterval = setInterval(() => { fi2 = (fi2 + 1) % FACTS.length; showFact(fi2); }, 6000);
    }
  }, 15000);
}

function showFact(i) { const el = document.getElementById('currentFact'); el.style.opacity = '0'; setTimeout(() => { el.innerHTML = '✦ ' + FACTS[i]; el.style.opacity = '1'; }, 300); }

function showReading(data) {
  document.getElementById('waitingPhase').textContent = 'Tu carta ha sido revelada...';
  document.getElementById('waitingPhase').style.animation = 'none';
  document.getElementById('readingNumeral').textContent = data.numeral || '';
  document.getElementById('readingCardName').textContent = data.nombre || '';
  document.getElementById('readingElement').innerHTML = 'Elemento: <span>' + (data.elemento || '?') + '</span> · Energía: <span>' + (data.energia || '?') + '</span>';
  document.getElementById('readingReveal').classList.add('visible');
  const text = data.lectura || ''; const c = document.getElementById('readingTypewriter');
  c.innerHTML = '<span class="cursor"></span>';
  let i = 0;
  function typeN() {
    if (i < text.length) { c.innerHTML = text.substring(0, i + 1) + '<span class="cursor"></span>'; i++; setTimeout(typeN, 35 + Math.random() * 20); }
    else { c.innerHTML = text; setTimeout(() => { document.getElementById('consejoText').textContent = data.consejo || ''; document.getElementById('readingConsejo').classList.add('visible'); }, 800); }
  }
  setTimeout(typeN, 1000);
}

function onImageReady() {
  clearInterval(progressInterval); clearInterval(factsInterval);
  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressLabel').textContent = '¡Carta completada!';
  document.getElementById('imageReadyBanner').classList.add('active');
  document.getElementById('mysticalFacts').classList.remove('visible');
}

function revealCard() {
  document.getElementById('waitingScreen').classList.remove('active');
  document.getElementById('freeCounter').style.display = 'block';
  chkLimit(); showResults();
}

// ═══════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════
function showResults() {
  document.getElementById('resultsContainer').style.display = 'block';
  const g = document.getElementById('resultsGrid'); g.innerHTML = '';
  cards.filter(c => c.status !== 'processing').forEach((item, i) => {
    const paid = paidIds.has(item.id);
    const wm = paid ? '' : '<div class="watermark-overlay"><div class="watermark-grid">' + Array(30).fill('<span class="watermark-text">TAROT MÍSTICO</span>').join('') + '</div></div>';
    const el = document.createElement('div'); el.className = 'result-card'; el.style.animationDelay = (i * .15) + 's';
    el.innerHTML = '<div class="tarot-card"><div class="card-border-top"><div class="card-numeral">' + (item.cardNum || '') + '</div></div><div class="card-image-area"><div class="card-corner tl"></div><div class="card-corner tr"></div><div class="card-corner bl"></div><div class="card-corner br"></div><img src="' + (item.resultURL || item.origB64) + '" alt="Carta">' + wm + '</div><div class="card-border-bottom"><div class="card-title">' + (item.cardName || '') + '</div></div></div><div class="ai-reading"><div class="ai-reading-title">✦ Lectura Mística ✦</div><div class="ai-reading-text">' + (item.reading || '') + '</div></div><div class="card-actions">' + (paid ? '<button class="btn btn-download" onclick="dlCard(\'' + item.id + '\')">⬇ Descargar HD sin marca</button>' : '<button class="btn btn-primary" onclick="openPaySingle(\'' + item.id + '\')">🔓 Desbloquear · $' + PRICE + ' MXN</button>') + '</div>';
    g.appendChild(el);
  });
  const unpaid = cards.filter(c => c.status === 'done' && !paidIds.has(c.id));
  const bb = document.getElementById('btnBatchPay');
  if (unpaid.length > 1) { bb.style.display = 'block'; document.getElementById('batchPrice').textContent = unpaid.length + ' cartas · $' + (unpaid.length * PRICE) + ' MXN'; }
  else bb.style.display = 'none';
  window.scrollTo({ top: document.getElementById('resultsContainer').offsetTop - 20, behavior: 'smooth' });
}
function scrollToResults() { const e = document.getElementById('resultsContainer'); if (e && e.style.display !== 'none') e.scrollIntoView({ behavior: 'smooth' }); }

// ═══════════════════════════════════════
//  PAYMENT
// ═══════════════════════════════════════
function openPaySingle(id) { payMode = { t: 'single', id }; isPrepaid = false; setMP(PRICE, 'Desbloquea tu carta personalizada', '1 carta'); openM(); }
function openPayAll() { const u = cards.filter(c => c.status === 'done' && !paidIds.has(c.id)); payMode = { t: 'all' }; isPrepaid = false; setMP(u.length * PRICE, 'Desbloquea ' + u.length + ' cartas', u.length + ' cartas'); openM(); }
function openPayPrepaid() { payMode = { t: 'prepaid' }; isPrepaid = true; setMP(PRICE, 'Paga por adelantado para generar una carta nueva', '1 carta nueva'); openM(); }
function setMP(a, s, d) { document.getElementById('paymentSubtitle').textContent = s; document.getElementById('modalPrice').innerHTML = '$' + a + '<small>MXN · ' + d + '</small>'; document.getElementById('payBtnTotal').textContent = '$' + a + ' MXN'; }
function openM() { document.getElementById('paymentModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closePay() { document.getElementById('paymentModal').classList.remove('active'); document.body.style.overflow = ''; }
function selMethod(el, m) { document.querySelectorAll('.pay-method').forEach(e => e.classList.remove('active')); el.classList.add('active'); document.getElementById('cardPayForm').style.display = m === 'card' ? 'block' : 'none'; document.getElementById('paypalForm').style.display = m === 'paypal' ? 'block' : 'none'; document.getElementById('oxxoForm').style.display = m === 'oxxo' ? 'block' : 'none'; }

function doPay() {
  const btn = event.target, orig = btn.innerHTML;
  btn.innerHTML = '<span style="animation:pulse 1s infinite">Procesando...</span>'; btn.disabled = true;
  // ── SIMULATED — Replace with Stripe/OpenPay/Conekta ──
  setTimeout(() => {
    btn.innerHTML = orig; btn.disabled = false;
    if (payMode.t === 'all') cards.forEach(c => { if (c.status === 'done') paidIds.add(c.id); });
    else if (payMode.t === 'single') paidIds.add(payMode.id);
    else if (payMode.t === 'prepaid') grantSlot();
    localStorage.setItem(LS.paid, JSON.stringify([...paidIds]));
    closePay(); toast('¡Pago exitoso! ✨', 'success');
    if (isPrepaid) { isPrepaid = false; chkLimit(); setTimeout(() => { fi.value = ''; fi.click(); }, 500); }
    else { showResults(); chkLimit(); }
  }, 2200);
}

// ═══════════════════════════════════════
//  DOWNLOAD HD
// ═══════════════════════════════════════
function dlCard(id) {
  const item = cards.find(c => c.id === id); if (!item?.resultURL) return;
  const cv = document.createElement('canvas'), W = 768, H = 1152; cv.width = W; cv.height = H; const cx = cv.getContext('2d');
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    cx.fillStyle = '#111120'; cx.fillRect(0, 0, W, H);
    cx.strokeStyle = '#a07830'; cx.lineWidth = 5; rr(cx, 5, 5, W - 10, H - 10, 16); cx.stroke();
    cx.strokeStyle = 'rgba(212,168,83,.3)'; cx.lineWidth = 1; rr(cx, 16, 16, W - 32, H - 32, 12); cx.stroke();
    const tH = 58, bH = 62, iY = tH, iH = H - tH - bH;
    cx.fillStyle = 'rgba(42,26,62,.6)'; cx.fillRect(18, 18, W - 36, tH - 4);
    cx.strokeStyle = 'rgba(212,168,83,.5)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(W * .1, tH); cx.lineTo(W * .9, tH); cx.stroke();
    cx.fillStyle = '#d4a853'; cx.font = 'bold 20px serif'; cx.textAlign = 'center'; cx.fillText(item.cardNum || '', W / 2, 46);
    const sc = Math.max((W - 36) / img.width, iH / img.height), sw = img.width * sc, sh = img.height * sc;
    cx.save(); cx.beginPath(); cx.rect(18, iY, W - 36, iH); cx.clip(); cx.drawImage(img, 18 + (W - 36 - sw) / 2, iY + (iH - sh) / 2, sw, sh); cx.restore();
    cx.strokeStyle = 'rgba(212,168,83,.5)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(W * .1, iY + iH); cx.lineTo(W * .9, iY + iH); cx.stroke();
    cx.fillStyle = 'rgba(42,26,62,.6)'; cx.fillRect(18, iY + iH, W - 36, bH);
    cx.fillStyle = '#f0d78c'; cx.font = 'bold 20px serif'; cx.textAlign = 'center'; cx.fillText((item.cardName || '').toUpperCase(), W / 2, iY + iH + 38);
    const cs = 34, co = 24; cx.strokeStyle = 'rgba(212,168,83,.5)'; cx.lineWidth = 2.5;
    [[co, co + cs, co, co, co + cs, co], [W - co - cs, co, W - co, co, W - co, co + cs], [co, H - co - cs, co, H - co, co + cs, H - co], [W - co - cs, H - co, W - co, H - co, W - co, H - co - cs]].forEach(p => { cx.beginPath(); cx.moveTo(p[0], p[1]); cx.lineTo(p[2], p[3]); cx.lineTo(p[4], p[5]); cx.stroke(); });
    const a = document.createElement('a'); a.download = 'tarot-' + (item.cardName || 'carta').replace(/\s+/g, '-').toLowerCase() + '.png'; a.href = cv.toDataURL('image/png'); a.click();
  };
  img.onerror = () => { const a = document.createElement('a'); a.download = 'tarot.png'; a.href = item.resultURL; a.click(); };
  img.src = item.resultURL;
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }

function resetAll() {
  cards = []; document.getElementById('resultsContainer').style.display = 'none';
  document.getElementById('stepsSection').style.display = 'grid';
  document.getElementById('freeCounter').style.display = 'block';
  fi.value = ''; chkLimit(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Input formatting
document.getElementById('cardNumber')?.addEventListener('input', function () { let v = this.value.replace(/\D/g, '').substring(0, 16); this.value = v.replace(/(.{4})/g, '$1 ').trim(); });
document.getElementById('expDate')?.addEventListener('input', function () { let v = this.value.replace(/\D/g, '').substring(0, 4); if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2); this.value = v; });
document.getElementById('paymentModal').addEventListener('click', function (e) { if (e.target === this) closePay(); });

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════
(async function () {
  try { JSON.parse(localStorage.getItem(LS.paid) || '[]').forEach(id => paidIds.add(id)); } catch {}
  updFree(); chkLimit();
  await detectMode();
  console.log('Tarot Místico — Modo:', useBackend ? 'Backend (Vercel)' : 'Directo (API Key local)');
})();
