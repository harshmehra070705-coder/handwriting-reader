/* =====================================================
   FILE: js/app.js
   Handwriting Reader — Google Gemini API (FIXED)
   ===================================================== */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const LS_KEY     = 'gemini_api_key';

const state = {
  apiKey:    localStorage.getItem(LS_KEY) || '',
  imgBase64: '',
  imgMime:   '',
  busy:      false,
};

/* =====================================================
   INIT
   ===================================================== */
function init() {
  if (state.apiKey) {
    document.getElementById('apiKeyInput').value = state.apiKey;
    showKeyStatus('✓ API key saved hai — ready!', 'ok');
  }

  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadImageFile(file);
  });

  initDragDrop();
}

/* =====================================================
   API KEY SAVE — FIXED
   Pehle wala problem: HTML mein "AIza" prefix tha box ke bahar
   ab poori key ek hi input mein — koi confusion nahi
   ===================================================== */
function saveApiKey() {
  let key = document.getElementById('apiKeyInput').value.trim();

  if (!key) {
    showKeyStatus('❌ Key khali hai — pehle key paste karo', 'err');
    return;
  }

  // Clean karo — spaces, newlines hata do
  key = key.replace(/\s/g, '');

  // Length check
  if (key.length < 20) {
    showKeyStatus('❌ Key bahut choti hai — poori key paste karo', 'err');
    return;
  }

  state.apiKey = key;
  localStorage.setItem(LS_KEY, key);
  showKeyStatus('✓ API key save ho gayi! Ab image upload karo.', 'ok');
}

function showKeyStatus(msg, type) {
  const el = document.getElementById('keyStatus');
  el.textContent = msg;
  el.className   = 'key-status ' + type;
}

/* =====================================================
   DRAG & DROP
   ===================================================== */
function initDragDrop() {
  const zone = document.getElementById('dropZone');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file);
    } else {
      alert('Sirf image files (JPG, PNG, WEBP) upload kar sakte ho');
    }
  });
}

/* =====================================================
   IMAGE LOAD
   ===================================================== */
function loadImageFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const dataUrl       = e.target.result;
    state.imgMime       = file.type || 'image/jpeg';
    state.imgBase64     = dataUrl.split(',')[1];

    document.getElementById('previewImg').src = dataUrl;
    document.getElementById('resultGrid').classList.add('visible');

    setOutput('<span class="ph-text">Image ready ✓ — "Text Convert Karo" dabao</span>');
    document.getElementById('wordCount').textContent  = '';
    document.getElementById('copyWrap').style.display = 'none';
    document.getElementById('statusBadge').innerHTML  = '';
    document.getElementById('progressTrack').classList.remove('on');
    resetBtn();

    document.getElementById('resultGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  reader.onerror = () => alert('File load nahi hui — dobara try karo');
  reader.readAsDataURL(file);
}

/* =====================================================
   CONVERT — GEMINI API CALL
   ===================================================== */
async function convertImage() {
  if (!state.apiKey) {
    alert('Pehle API key save karo! (Step 1 mein)');
    return;
  }
  if (!state.imgBase64) {
    alert('Pehle image upload karo! (Step 2 mein)');
    return;
  }
  if (state.busy) return;

  setLoading(true);

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: state.imgMime,
                data:      state.imgBase64,
              },
            },
            {
              text: buildPrompt(),
            },
          ],
        },
      ],
      generationConfig: {
        temperature:     0.1,
        maxOutputTokens: 4096,
      },
    };

    // Gemini key URL mein jaati hai
    const url      = `${GEMINI_URL}?key=${state.apiKey}`;
    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `Error ${response.status}`;
      throw new Error(errMsg);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || !text.trim()) {
      throw new Error('AI ne koi text nahi diya — image mein shayad likhavat nahi mili');
    }

    showResult(text.trim());

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

/* =====================================================
   PROMPT
   ===================================================== */
function buildPrompt() {
  return `You are an expert at reading handwritten text, cursive writing, signatures, and doctor prescriptions.

Please transcribe ALL the text you can see in this image. Follow these rules:
1. Read every word carefully, even if handwriting is very messy
2. Write exactly what is written — do not change anything
3. Keep the same structure with line breaks
4. For unclear words: write best guess + [?]
5. For completely unreadable parts: write [unreadable]
6. If this is a MEDICAL PRESCRIPTION, clearly label:
   Patient Name: ...
   Date: ...
   Medicines & Dosage: ...
   Instructions: ...
   Doctor Name: ...

Output ONLY the transcribed text, nothing else. No explanations.`;
}

/* =====================================================
   UI HELPERS
   ===================================================== */
function setLoading(on) {
  state.busy = on;
  const btn   = document.getElementById('convertBtn');
  const track = document.getElementById('progressTrack');

  if (on) {
    btn.disabled    = true;
    btn.textContent = '⏳ AI Padh Raha Hai...';
    track.classList.add('on');
    setBadge('proc', true, 'Processing');
    setOutput('<span class="ph-text">Google Gemini AI image padh raha hai — thodi der mein result aayega...</span>');
    document.getElementById('copyWrap').style.display = 'none';
  } else {
    track.classList.remove('on');
    resetBtn();
  }
}

function resetBtn() {
  const btn       = document.getElementById('convertBtn');
  btn.disabled    = false;
  btn.textContent = '✨ Text Convert Karo';
}

function showResult(text) {
  setOutput(null, text);
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  document.getElementById('wordCount').textContent  = `${text.length} characters  ·  ${words} words`;
  document.getElementById('copyWrap').style.display = 'block';
  setBadge('done', false, 'Done ✓');
}

function showError(msg) {
  let html = `<span style="color:var(--red)">❌ Error:<br><br>${escHtml(msg)}</span>`;

  if (msg.includes('API_KEY_INVALID') || msg.includes('400') || msg.includes('invalid')) {
    html += `<br><br><span style="color:var(--text2);font-size:12px">
      💡 API key galat hai —
      <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>
      pe nayi key banao aur poori paste karo
    </span>`;
  } else if (msg.includes('QUOTA') || msg.includes('429')) {
    html += `<br><br><span style="color:var(--text2);font-size:12px">
      💡 Free limit khatam ho gayi — kal dobara try karo
    </span>`;
  }

  setOutput(html);
  setBadge('err', false, 'Error');
}

function setOutput(html, plainText) {
  const box = document.getElementById('outputBox');
  if (plainText !== undefined) {
    box.textContent = plainText;
  } else {
    box.innerHTML = html;
  }
}

function setBadge(type, pulse, label) {
  const dotClass = pulse ? 'bd spin' : 'bd';
  document.getElementById('statusBadge').innerHTML =
    `<span class="badge badge-${type}"><span class="${dotClass}"></span>${escHtml(label)}</span>`;
}

/* =====================================================
   COPY
   ===================================================== */
function copyText() {
  const text = document.getElementById('outputBox').textContent.trim();
  const btn  = document.querySelector('#copyWrap .btn');

  navigator.clipboard.writeText(text)
    .then(() => {
      btn.textContent = '✓ Copy Ho Gaya!';
      setTimeout(() => { btn.textContent = '📋 Text Copy Karo'; }, 2500);
    })
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = '✓ Copy Ho Gaya!';
      setTimeout(() => { btn.textContent = '📋 Text Copy Karo'; }, 2500);
    });
}

/* =====================================================
   RESET
   ===================================================== */
function resetAll() {
  state.imgBase64 = '';
  state.imgMime   = '';

  document.getElementById('resultGrid').classList.remove('visible');
  document.getElementById('fileInput').value           = '';
  document.getElementById('previewImg').src            = '';
  document.getElementById('statusBadge').innerHTML     = '';
  document.getElementById('wordCount').textContent     = '';
  document.getElementById('copyWrap').style.display    = 'none';
  document.getElementById('progressTrack').classList.remove('on');
  setOutput('<span class="ph-text">Yahan converted text aayega...</span>');
  resetBtn();

  document.getElementById('uploadSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =====================================================
   UTILITY
   ===================================================== */
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
