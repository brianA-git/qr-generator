/* =============================================
  GRABBING ELEMENTS
  We get references to all the HTML elements
  we need to read from or write to.
  Storing them in variables is faster than
  searching the page every time we need them.
============================================= */
const urlInput    = document.getElementById('url-input');
const colorDark   = document.getElementById('color-dark');
const colorLight  = document.getElementById('color-light');
const presetBtns  = document.querySelectorAll('.preset-btn');
const qrEmpty     = document.getElementById('qr-empty');
const qrOutput    = document.getElementById('qr-output');
const dogOverlay  = document.getElementById('dog-overlay');
const exportBtn   = document.getElementById('export-btn');

/* =============================================
  STATE
  These variables track the current values
  the app is working with. When any of them
  change, we regenerate the QR code.
============================================= */
let currentURL   = '';
let darkColor    = '#1A1916';
let lightColor   = '#F5F3EE';
let qrInstance   = null;   // holds the QR code object from the library
let debounceTimer = null;  // used to avoid regenerating on every single keystroke

/* =============================================
  GENERATE QR CODE
  This is the core function. It:
  1. Validates the URL (must start with http)
  2. Clears any previous QR code
  3. Tells the qrcode.js library to draw a new one
  4. Shows/hides the right UI elements
============================================= */
function generateQR() {
  const url = urlInput.value.trim();

  // If empty or too short, show the empty state
  if (!url || url.length < 4) {
    qrOutput.innerHTML = '';
    qrOutput.classList.remove('visible');
    qrEmpty.classList.remove('hidden');
    dogOverlay.classList.remove('visible');
    exportBtn.disabled = true;
    qrInstance = null;
    return;
  }

  // Add https:// automatically if the user didn't type it
  const finalURL = url.startsWith('http') ? url : 'https://' + url;

  // Clear the previous QR code from the container
  qrOutput.innerHTML = '';

  // Ask the qrcode.js library to generate a new QR code
  // It draws directly onto a <canvas> inside qrOutput
  qrInstance = new QRCode(qrOutput, {
    text:           finalURL,
    width:          220,
    height:         220,
    colorDark:      darkColor,
    colorLight:     lightColor,
    correctLevel:   QRCode.CorrectLevel.H  // H = highest error correction (needed for the logo overlay)
  });

  // Show the QR output, hide the empty state
  qrOutput.classList.add('visible');
  qrEmpty.classList.add('hidden');
  dogOverlay.classList.add('visible');
  exportBtn.disabled = false;
}

/* =============================================
  DEBOUNCE
  We don't want to regenerate the QR code on
  every single keystroke — it would flicker.
  Instead, we wait 400ms after the user stops
  typing, then generate. This technique is
  called "debouncing" and is used everywhere
  in web development.
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
  attributes storing the color values.
  When clicked, we apply those colors to
  both the pickers and our state, then regenerate.
============================================= */
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    darkColor  = btn.dataset.dark;
    lightColor = btn.dataset.light;

    // Update the color picker UI to reflect the new colors
    colorDark.value  = darkColor;
    colorLight.value = lightColor;

    // Highlight the active preset button
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    generateQR();
  });
});

/* =============================================
  EXPORT — MERGE QR + DOG LOGO
  This is the most complex part. We can't just
  save the QR canvas directly because the dog
  overlay is a separate HTML element floating
  on top. Instead, we:
  1. Create a new hidden canvas the same size
  2. Draw the QR code onto it
  3. Draw a white circle in the center
  4. Draw the dog SVG on top of that circle
  5. Trigger a download of the final merged image
============================================= */
exportBtn.addEventListener('click', () => {
  // Get the canvas the QR library created
  const qrCanvas = qrOutput.querySelector('canvas');
  if (!qrCanvas) return;

  const size   = qrCanvas.width;
  const center = size / 2;

  // Create a new canvas to merge everything onto
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width  = size;
  exportCanvas.height = size;
  const ctx = exportCanvas.getContext('2d');

  // Step 1: Draw the QR code as the base layer
  ctx.drawImage(qrCanvas, 0, 0);

  // Step 2: Draw a white circle in the center (the logo background)
  const radius = size * 0.14;
  ctx.beginPath();
  ctx.arc(center, center, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Step 3: Draw the dog SVG onto the canvas
  // We convert the SVG element to a data URL, then draw it as an image
  const dogSVG  = dogOverlay.querySelector('svg');
  const svgData = new XMLSerializer().serializeToString(dogSVG);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgURL  = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    // Draw the dog centered on the circle
    const logoSize = radius * 2;
    ctx.drawImage(img, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize);
    URL.revokeObjectURL(svgURL);

    // Step 4: Trigger download of the merged canvas as a PNG
    const link      = document.createElement('a');
    link.download   = 'qr-code.png';
    link.href       = exportCanvas.toDataURL('image/png');
    link.click();
  };
  img.src = svgURL;
});
