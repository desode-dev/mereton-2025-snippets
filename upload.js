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

  // Loupe (magnifier) state — shows REAL physical scale (like SingleTile)
  let lensActive = false;
  let lensX = 0;
  let lensY = 0;
  const LENS_RADIUS = 90;   // adjust as needed
  const LENS_BORDER_PX = 2; // ring thickness

  // Helpers
  function getRepeatStyle() {
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

  // Draw tiles using the preview mapping (canvas is 100 cm tall)
  function drawTilesAtScale(logicalScale) {
    const repeatStyle = getRepeatStyle();
    const userPpi = getUserPpi();

    const imageWidthCm  = (uploadedImage.width  / userPpi) * 2.54;
    const imageHeightCm = (uploadedImage.height / userPpi) * 2.54;

    const scaledImageWidthCm  = imageWidthCm  * logicalScale;
    const scaledImageHeightCm = imageHeightCm * logicalScale;

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
        ctx.drawImage(uploadedImage, 0, 0, tileWidth, tileHeight);
      }
    }

    return { scaledImageWidthCm, scaledImageHeightCm, pxPerCm };
  }

  // Draw tiles at REAL physical size (like your old SingleTile: 37.8 px/cm)
  function drawTilesAtPhysicalScale(scale, pxPerCmPhysical) {
    const repeatStyle = getRepeatStyle();
    const userPpi = getUserPpi();

    const imageWidthCm  = (uploadedImage.width  / userPpi) * 2.54 * scale;
    const imageHeightCm = (uploadedImage.height / userPpi) * 2.54 * scale;

    const tileWidthPx  = imageWidthCm  * pxPerCmPhysical;
    const tileHeightPx = imageHeightCm * pxPerCmPhysical;

    switch (repeatStyle) {
      case 'full-drop': {
        for (let y = -tileHeightPx; y <= canvas.height + tileHeightPx; y += tileHeightPx) {
          for (let x = -tileWidthPx; x <= canvas.width + tileWidthPx; x += tileWidthPx) {
            ctx.drawImage(uploadedImage, x, y, tileWidthPx, tileHeightPx);
          }
        }
        break;
      }
      case 'half-drop': {
        for (let x = -tileWidthPx; x <= canvas.width + tileWidthPx * 2; x += tileWidthPx) {
          const col = Math.floor(x / tileWidthPx);
          const vOff = (col % 2) * (tileHeightPx / 2);
          for (let y = -tileHeightPx * 2; y <= canvas.height + tileHeightPx * 2; y += tileHeightPx) {
            ctx.drawImage(uploadedImage, x, y + vOff, tileWidthPx, tileHeightPx);
          }
        }
        break;
      }
      case 'mirror': {
        for (let y = -tileHeightPx; y <= canvas.height + tileHeightPx; y += tileHeightPx) {
          for (let x = -tileWidthPx; x <= canvas.width + tileWidthPx; x += tileWidthPx) {
            const col = Math.floor(x / tileWidthPx);
            const row = Math.floor(y / tileHeightPx);
            const flipX = col % 2 === 1;
            const flipY = row % 2 === 1;
            ctx.save();
            ctx.translate(x + (flipX ? tileWidthPx : 0), y + (flipY ? tileHeightPx : 0));
            ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            ctx.drawImage(uploadedImage, 0, 0, tileWidthPx, tileHeightPx);
            ctx.restore();
          }
        }
        break;
      }
      default: {
        ctx.drawImage(uploadedImage, 0, 0, tileWidthPx, tileHeightPx);
      }
    }
  }

  // Full render (preview + rulers + lens)
  function renderAll() {
    const scale = getScale();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { scaledImageWidthCm, pxPerCm } = drawTilesAtScale(scale);

    drawRulers(pxPerCm);

    if (hiddenWidth)  hiddenWidth.value  = scaledImageWidthCm.toFixed(2) + 'cm';
    if (hiddenRepeat) hiddenRepeat.value = getRepeatStyle();
    if (hiddenScale)  hiddenScale.value  = scaleSlider.value + '%';
    if (imageWidthCmDisplay) imageWidthCmDisplay.textContent = Math.round(scaledImageWidthCm);

    if (lensActive) drawLens(scale);
  }

  // Loupe that shows TRUE physical scale (37.8 px/cm) while aligned to the same world point
  function drawLens(currentScale) {
    if (!imgLoaded) return;

    const PX_PER_CM_PHYSICAL = 37.8;              // 96dpi baseline
    const pxPerCmPreview = canvas.height / 100;   // your preview mapping

    // Convert cursor px in preview -> world cm
    const worldX_cm = lensX / pxPerCmPreview;
    const worldY_cm = lensY / pxPerCmPreview;

    ctx.save();

    // Circular clip
    ctx.beginPath();
    ctx.arc(lensX, lensY, LENS_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    // Where does that world point land in physical pixels?
    const physX_px = worldX_cm * PX_PER_CM_PHYSICAL;
    const physY_px = worldY_cm * PX_PER_CM_PHYSICAL;

    // Align it to the lens center
    ctx.translate(lensX - physX_px, lensY - physY_px);

    // Draw at physical size (includes user's scale)
    drawTilesAtPhysicalScale(currentScale, PX_PER_CM_PHYSICAL);

    ctx.restore();

    // Lens ring
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

  // UI events
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
    if (ppiHelpText) ppiHelpText.style.display = isUnsure ? 'block' : 'none';
    if (!isUnsure && imgLoaded) {
      renderAll();
      calculateDPI();
    }
  });

  document.getElementById('repeatStyle').addEventListener('change', () => {
    if (imgLoaded) renderAll();
  });

  // Lens handlers
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

  // Upload handling
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
    renderAll();
    calculateDPI();
  }

  // Init from CMS and render
  const widthFromCMS = printWidthInput.getAttribute('data-width');
  if (widthFromCMS) printWidthInput.value = widthFromCMS;
  updateCanvasSize();
});
