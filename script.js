/* =============================================
  GRABBING ELEMENTS
  We get references to all the HTML elements
  we need to read from or write to.
  Storing them in variables is faster than
  searching the page every time we need them.
============================================= */
const urlInput      = document.getElementById('url-input');
const colorDark     = document.getElementById('color-dark');
const colorLight    = document.getElementById('color-light');
const presetBtns    = document.querySelectorAll('.preset-btn');
const qrEmpty       = document.getElementById('qr-empty');
const qrOutput      = document.getElementById('qr-output');
const dogOverlay    = document.getElementById('dog-overlay');
const exportBtn     = document.getElementById('export-btn');

/* Shortened URL elements */
const shortSection  = document.getElementById('short-section');
const shortLoading  = document.getElementById('short-loading');
const shortResult   = document.getElementById('short-result');
const shortError    = document.getElementById('short-error');
const shortURL      = document.getElementById('short-url');
const copyBtn       = document.getElementById('copy-btn');
const copyIcon      = document.getElementById('copy-icon');
const checkIcon     = document.getElementById('check-icon');

/* =============================================
  STATE
  These variables track the current values
  the app is working with. When any of them
  change, we regenerate the QR code.
============================================= */
let currentURL    = '';
let darkColor     = '#1A1916';
let lightColor    = '#F5F3EE';
let qrInstance    = null;   // holds the QR code object from the library
let debounceTimer = null;   // used to avoid regenerating on every single keystroke
let shortTimer    = null;   // separate debounce for the API call

/* =============================================
  SHOW / HIDE SHORT URL STATES
  Three inner states inside the short-box:
  'loading', 'result', or 'error'.
  We show one and hide the others.
============================================= */
function showShortState(state) {
  shortSection.classList.add('visible');
  shortLoading.classList.toggle('visible', state === 'loading');
  shortResult.classList.toggle('visible',  state === 'result');
  shortError.classList.toggle('visible',   state === 'error');
}

function hideShortSection() {
  shortSection.classList.remove('visible');
  shortLoading.classList.remove('visible');
  shortResult.classList.remove('visible');
  shortError.classList.remove('visible');
}

/* =============================================
  URL SHORTENER API CALL
  This is your first real API call — a "fetch".
  fetch() sends a request to an external server
  and waits for a response. It's "async/await"
  because it takes time (network round trip).

  We use is.gd — a free URL shortener with a
  clean API that supports CORS (meaning browsers
  are allowed to call it directly, no proxy needed).

  API format:
  https://is.gd/create.php?format=simple&url=YOUR_URL
  It returns the short URL as plain text.
============================================= */
async function shortenURL(url) {
  showShortState('loading');

  try {
    const apiURL   = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;
    const response = await fetch(apiURL);

    if (!response.ok) throw new Error('Bad response');

    const shortened = (await response.text()).trim();

    // Validate we got a real URL back
    if (!shortened.startsWith('http')) throw new Error('Invalid response');

    // Show the result
    shortURL.textContent = shortened;
    shortURL.href        = shortened;
    showShortState('result');

  } catch (err) {
    // If anything goes wrong, show the error state
    showShortState('error');
  }
}

/* =============================================
  GENERATE QR CODE
  This is the core function. It:
  1. Validates the URL (must start with http)
  2. Clears any previous QR code
  3. Tells the qrcode.js library to draw a new one
  4. Shows/hides the right UI elements
  5. Triggers the URL shortener
============================================= */
function generateQR() {
  const url = urlInput.value.trim();

  // If empty or too short, reset everything
  if (!url || url.length < 4) {
    qrOutput.innerHTML = '';
    qrOutput.classList.remove('visible');
    qrEmpty.classList.remove('hidden');
    dogOverlay.classList.remove('visible');
    exportBtn.disabled = true;
    qrInstance = null;
    hideShortSection();
    return;
  }

  // Add https:// automatically if the user didn't type it
  const finalURL = url.startsWith('http') ? url : 'https://' + url;

  // Clear the previous QR code from the container
  qrOutput.innerHTML = '';

  // Ask the qrcode.js library to generate a new QR code
  qrInstance = new QRCode(qrOutput, {
    text:           finalURL,
    width:          220,
    height:         220,
    colorDark:      darkColor,
    colorLight:     lightColor,
    correctLevel:   QRCode.CorrectLevel.H
  });

  // Show the QR output, hide the empty state
  qrOutput.classList.add('visible');
  qrEmpty.classList.add('hidden');
  dogOverlay.classList.add('visible');
  exportBtn.disabled = false;

  // Trigger URL shortening (with its own debounce so we
  // don't hammer the API on every keystroke)
  clearTimeout(shortTimer);
  shortTimer = setTimeout(() => shortenURL(finalURL), 600);
}

/* =============================================
  DEBOUNCE — URL INPUT
  We wait 400ms after the user stops typing
  before generating the QR code. This prevents
  flickering on every keystroke.
============================================= */
urlInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generateQR, 400);
});

/* =============================================
  COLOR PICKERS
  When either color changes, we update our
  state variables and regenerate the QR code.
============================================= */
colorDark.addEventListener('input', () => {
  darkColor = colorDark.value;
  generateQR();
});

colorLight.addEventListener('input', () => {
  lightColor = colorLight.value;
  generateQR();
});

/* =============================================
  PRESET BUTTONS
  Each button has data-dark and data-light
  attributes. When clicked, we apply those
  colors to the pickers and state, then regenerate.
============================================= */
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    darkColor  = btn.dataset.dark;
    lightColor = btn.dataset.light;

    colorDark.value  = darkColor;
    colorLight.value = lightColor;

    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    generateQR();
  });
});

/* =============================================
  COPY BUTTON
  Copies the short URL to the clipboard using
  the modern navigator.clipboard API.
  We briefly swap the copy icon for a checkmark
  to give the user visual feedback.
============================================= */
copyBtn.addEventListener('click', () => {
  const text = shortURL.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    // Show checkmark
    copyIcon.style.display  = 'none';
    checkIcon.style.display = 'block';
    copyBtn.classList.add('copied');

    // Revert after 2 seconds
    setTimeout(() => {
      copyIcon.style.display  = 'block';
      checkIcon.style.display = 'none';
      copyBtn.classList.remove('copied');
    }, 2000);
  });
});

/* =============================================
  EXPORT — MERGE QR + DOG LOGO
  Creates a hidden canvas, draws the QR code
  and dog SVG onto it, then triggers a PNG download.
============================================= */
exportBtn.addEventListener('click', () => {
  const qrCanvas = qrOutput.querySelector('canvas');
  if (!qrCanvas) return;

  const size   = qrCanvas.width;
  const center = size / 2;

  const exportCanvas    = document.createElement('canvas');
  exportCanvas.width    = size;
  exportCanvas.height   = size;
  const ctx             = exportCanvas.getContext('2d');

  ctx.drawImage(qrCanvas, 0, 0);

  const radius = size * 0.14;
  ctx.beginPath();
  ctx.arc(center, center, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  const dogSVG  = dogOverlay.querySelector('svg');
  const svgData = new XMLSerializer().serializeToString(dogSVG);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgURL  = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const logoSize = radius * 2;
    ctx.drawImage(img, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize);
    URL.revokeObjectURL(svgURL);

    const link    = document.createElement('a');
    link.download = 'qr-code.png';
    link.href     = exportCanvas.toDataURL('image/png');
    link.click();
  };
  img.src = svgURL;
});
