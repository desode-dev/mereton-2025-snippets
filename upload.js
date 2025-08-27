window.addEventListener('DOMContentLoaded', () => {
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleValue = document.getElementById('scaleValue');
  const dpiDisplay = document.getElementById('dpiDisplay');
  const printWidthInput = document.getElementById('printWidth');
  const imageWidthCmDisplay = document.getElementById('imageWidthCm');
  const assumedDpiDisplay = document.getElementById('assumedDpi');
  const ppiSelect = document.getElementById('imagePpi');
  const ppiHelpText = document.getElementById('ppiHelpText');
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');

  // ❌ We won't use the single-tile canvas anymore
  // const singleTileCanvas = document.getElementById('singleTileCanvas');
  // const singleCtx = singleTileCanvas.getContext('2d');

  const fileUrlField = document.getElementById('uploadcare-file-url');
  const fileNameField = document.getElementById('file-name');
  const hiddenWidth = document.getElementById('image-width');
  const hiddenRepeat = document.getElementById('repeat-style');
  const hiddenScale = document.getElementById('image-scale');

  // Add to Cart button control
  const addToCartBtn = document.getElementById('addToCart');
  function setCartEnabled(enabled) {
    if (!addToCartBtn) return;
    addToCartBtn.disabled = !enabled;
    addToCartBtn.style.opacity = enabled ? '1' : '0.2';
    addToCartBtn.style.pointerEvents = enabled ? 'auto' : 'none';
  }
  setCartEnabled(false);

  let uploadedImage = new Image();
  let imgLoaded = false;

  // ⭐ NEW: magnifier state
  let lensActive = false;
  let lensX = 0;
  let lensY = 0;
  const LENS_RADIUS = 90;         // tweak as you like
  const LENS_BORDER_PX = 2;       // lens ring thickness

  function getRepeatStyle() {
    // normalize repeat style value (matches your existing logic)
    return document.getElementById('repeatStyle')
      .value.toLowerCase()
      .replace(/\s+/g, '-');
  }

  function getUserPpi() {
    const rawPpi = ppiSelect.value;
    return parseFloat(rawPpi) || 300;
  }

  function getScale() {
    return parseInt(scaleSlider.value, 10) / 100;
  }

  function updateCanvasSize() {
    const fabricWidthCM = parseFloat(printWidthInput.value);
    const previewHeightPx = 500;
    const previewWidthPx = (fabricWidthCM / 100) * previewHeightPx;

    canvas.width = previewWidthPx;
    canvas.height = previewHeightPx;

    if (imgLoaded) {
      renderAll();
      calculateDPI();
    }
  }

  function drawRulers(pxPerCm) {
    const notchLength = 10;
    const fontSize = 10;

    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, notchLength + fontSize + 2);
    ctx.fillRect(0, 0, notchLength + fontSize + 2, canvas.height);

    ctx.strokeStyle = '#999';
    ctx.fillStyle = '#666';
    ctx.lineWidth = 1;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';

    const cmPerNotch = 5;
    const totalWidthCM = canvas.width / pxPerCm;
    const totalHeightCM = canvas.height / pxPerCm;

    for (let cm = 0; cm <= totalWidthCM; cm += cmPerNotch) {
      const x = cm * pxPerCm;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, notchLength);
      ctx.stroke();
      if (cm % 10 === 0) ctx.fillText(cm.toString(), x, notchLength + fontSize);
    }

    for (let cm = 0; cm <= totalHeightCM; cm += cmPerNotch) {
      const y = cm * pxPerCm;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(notchLength, y);
      ctx.stroke();
      if (cm % 10 === 0) {
        ctx.save();
        ctx.translate(notchLength + 2, y + fontSize / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(cm.toString(), 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // ⭐ NEW: core tiling routine that can draw at ANY logical scale
  function drawTilesAtScale(logicalScale) {
    const repeatStyle = getRepeatStyle();
    const userPpi = getUserPpi();

    // image physical size (cm) at 100% (logicalScale=1), then apply logicalScale
    const imageWidthCm  = (uploadedImage.width  / userPpi) * 2.54;
    const imageHeightCm = (uploadedImage.height / userPpi) * 2.54;

    const scaledImageWidthCm  = imageWidthCm  * logicalScale;
    const scaledImageHeightCm = imageHeightCm * logicalScale;

    // screen mapping: preview canvas is 100 cm tall
    const pxPerCm = canvas.height / 100;
    const tileWidth  = scaledImageWidthCm  * pxPerCm;
    const tileHeight = scaledImageHeightCm * pxPerCm;

    switch (repeatStyle) {
      case 'full-drop': {
        for (let y = 0; y <= canvas.height; y += tileHeight) {
          for (let x = 0; x <= canvas.width; x += tileWidth) {
            ctx.drawImage(uploadedImage, x, y, tileWidth, tileHeight);
          }
        }
        break;
      }
      case 'half-drop': {
        for (let x = 0; x <= canvas.width + tileWidth; x += tileWidth) {
          const col = Math.floor(x / tileWidth);
          const vOff = (col % 2) * (tileHeight / 2);
          for (let y = -tileHeight; y <= canvas.height + tileHeight; y += tileHeight) {
            ctx.drawImage(uploadedImage, x, y + vOff, tileWidth, tileHeight);
          }
        }
        break;
      }
      case 'mirror': {
        for (let y = 0; y <= canvas.height; y += tileHeight) {
          for (let x = 0; x <= canvas.width; x += tileWidth) {
            const col = Math.floor(x / tileWidth);
            const row = Math.floor(y / tileHeight);
            const flipX = col % 2 === 1;
            const flipY = row % 2 === 1;
            ctx.save();
            ctx.translate(x + (flipX ? tileWidth : 0), y + (flipY ? tileHeight : 0));
            ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            ctx.drawImage(uploadedImage, 0, 0, tileWidth, tileHeight);
            ctx.restore();
          }
        }
        break;
      }
      default: {
        // fallback: single tile
        ctx.drawImage(uploadedImage, 0, 0, tileWidth, tileHeight);
      }
    }

    // update UI bits only when drawing the main view (the caller will handle)
    return { scaledImageWidthCm, scaledImageHeightCm, pxPerCm };
  }

  // ⭐ NEW: full render pass (main pattern + rulers + lens if active)
  function renderAll() {
    const scale = getScale();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { scaledImageWidthCm, pxPerCm } = drawTilesAtScale(scale);

    // rulers after pattern
    drawRulers(pxPerCm);

    // update hidden fields & labels
    if (hiddenWidth)  hiddenWidth.value  = scaledImageWidthCm.toFixed(2) + 'cm';
    if (hiddenRepeat) hiddenRepeat.value = getRepeatStyle();
    if (hiddenScale)  hiddenScale.value  = scaleSlider.value + '%';
    imageWidthCmDisplay.textContent = Math.round(scaledImageWidthCm);

    // lens overlay last
    if (lensActive) drawLens(scale);
  }

  // ⭐ NEW: lens overlay that shows 100% scale at the same world position
  function drawLens(currentScale) {
    if (!imgLoaded) return;

    const factor = 1 / currentScale; // how much we need to scale up to get to 100%
    ctx.save();

    // clip to circle
    ctx.beginPath();
    ctx.arc(lensX, lensY, LENS_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    // Transform so the point under the cursor stays fixed when we scale
    // We scale the whole canvas content by `factor`, but translate so that (lensX, lensY)
    // in the scaled space maps back to (lensX, lensY) on screen.
    ctx.translate(lensX - lensX * factor, lensY - lensY * factor);
    ctx.scale(factor, factor);

    // draw tiles at TRUE 100% scale inside the clip
    drawTilesAtScale(1);

    ctx.restore();

    // lens ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(lensX, lensY, LENS_RADIUS, 0, Math.PI * 2);
    ctx.lineWidth = LENS_BORDER_PX;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();
  }

  function calculateDPI() {
    const printWidthCM = parseFloat(printWidthInput.value);
    const scale = getScale();
    const userPpi = getUserPpi();
    const printWidthInches = (printWidthCM / 2.54) * scale;
    const dpi = uploadedImage.width / printWidthInches;

    if (dpiDisplay) dpiDisplay.textContent = Math.round(dpi);
    if (assumedDpiDisplay) assumedDpiDisplay.textContent = isNaN(userPpi) ? 'N/A' : userPpi;
  }

  // --- UI events -------------------------------------------------------------

  scaleSlider.addEventListener('input', () => {
    scaleValue.textContent = scaleSlider.value;
    if (imgLoaded) {
      renderAll();
      calculateDPI();
    }
  });

  printWidthInput.addEventListener('input', () => {
    updateCanvasSize();
    if (imgLoaded) calculateDPI();
  });

  ppiSelect.addEventListener('change', () => {
    const isUnsure = ppiSelect.value.toLowerCase() === 'unsure';
    ppiHelpText.style.display = isUnsure ? 'block' : 'none';
    if (!isUnsure && imgLoaded) {
      renderAll();
      calculateDPI();
    }
  });

  document.getElementById('repeatStyle').addEventListener('change', () => {
    if (imgLoaded) renderAll();
  });

  // ⭐ NEW: lens mouse handlers
  canvas.addEventListener('mouseenter', (e) => {
    lensActive = true;
    const rect = canvas.getBoundingClientRect();
    lensX = e.clientX - rect.left;
    lensY = e.clientY - rect.top;
    if (imgLoaded) renderAll();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!lensActive) return;
    const rect = canvas.getBoundingClientRect();
    lensX = e.clientX - rect.left;
    lensY = e.clientY - rect.top;
    if (imgLoaded) renderAll();
  });

  canvas.addEventListener('mouseleave', () => {
    lensActive = false;
    if (imgLoaded) renderAll();
  });

  // --- Upload handling -------------------------------------------------------

  const allowedExtensions = ['png', 'jpg', 'jpeg'];
  function isFileTypeAllowed(fileName) {
    return allowedExtensions.includes(fileName.split('.').pop().toLowerCase());
  }

  UploadTool.initializeUploadTool("1d97ae1bd6c1cf6efc5d6d6a937d05e47bb464528d8cdad5");

  document.getElementById('single-test-upload').addEventListener('fileUploaded', (event) => {
    const { fileUrl, fileName } = event.detail;

    setCartEnabled(false);

    if (!isFileTypeAllowed(fileName)) {
      alert("File type not allowed. Please upload PNG, or JPG files only.");
      window.location.reload();
      return;
    }

    if (fileUrlField) fileUrlField.value = fileUrl;
    if (fileNameField) fileNameField.value = fileName;

    uploadedImage = new Image();
    uploadedImage.crossOrigin = "Anonymous";
    uploadedImage.onload = () => {
      imgLoaded = true;
      setupImageForCanvas();
      setCartEnabled(true);
    };
    uploadedImage.src = fileUrl;
  });

  function setupImageForCanvas() {
    scaleSlider.value = 100;
    scaleValue.textContent = 100;

    updateCanvasSize();
    renderAll();       // draw initial view
    calculateDPI();
  }

  const widthFromCMS = printWidthInput.getAttribute('data-width');
  if (widthFromCMS) printWidthInput.value = widthFromCMS;
  updateCanvasSize();
});
