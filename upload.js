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

  const repeatGroup = document.getElementById('repeatStyleGroup');
  const legacySelect = document.getElementById('repeatStyle');

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

  // NEW: elements that should stay hidden until a file is uploaded
  const gatedUI = document.querySelectorAll('.product-upload-options, .input-wrap');
  function setUploadDependentUI(hasFile) {
    gatedUI.forEach(el => {
      // use inline style to override existing layout; empty string = default display
      el.style.display = hasFile ? '' : 'none';
    });
  }
  setUploadDependentUI(false); // hide on load

  // Loupe state
  let lensActive = false;
  let lensX = 0;
  let lensY = 0;
  const LENS_RADIUS = 100;
  const LENS_BORDER_PX = 1;

  function getRepeatStyle() {
    const checked = document.querySelector('input[name="repeatStyle"]:checked');
    if (checked && checked.value) return checked.value;
    if (legacySelect) return legacySelect.value.toLowerCase().replace(/\s+/g, '-');
    return 'full-drop';
  }

  function setRepeatSelectedUI() {
    if (!repeatGroup) return;
    const options = repeatGroup.querySelectorAll('.repeat-option');
    const currentVal = getRepeatStyle();
    options.forEach(opt => {
      const isSelected = (opt.dataset.repeat === currentVal);
      opt.classList.toggle('selected', isSelected);
      const input = opt.querySelector('input[type="radio"]');
      if (input) input.checked = isSelected;
    });
  }

  function getUserPpi() {
    const rawPpi = ppiSelect.value;
    return parseFloat(rawPpi) || 300;
  }
  function getScale() {
    return parseInt(scaleSlider.value, 10) / 100;
  }

  // NEW: draw placeholder message inside the canvas when no image yet
  function drawPlaceholder() {
    const msg = 'your file will display here';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // soft background to make it feel intentional (optional)
    ctx.save();
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // subtle border (optional)
    ctx.save();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.restore();

    // centered text
    ctx.save();
    ctx.fillStyle = '#999';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
    ctx.restore();
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
    } else {
      // NEW: show placeholder whenever canvas is (re)Sized and no image yet
      drawPlaceholder();
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

  function drawTilesAtPhysicalScale(scale, pxPerCmPhysical, anchorPxX, anchorPxY) {
    const repeatStyle = getRepeatStyle();
    const userPpi = getUserPpi();

    const imageWidthCm  = (uploadedImage.width  / userPpi) * 2.54 * scale;
    const imageHeightCm = (uploadedImage.height / userPpi) * 2.54 * scale;

    const tileW = imageWidthCm  * pxPerCmPhysical;
    const tileH = imageHeightCm * pxPerCmPhysical;
    if (!isFinite(tileW) || !isFinite(tileH) || tileW <= 0 || tileH <= 0) return;

    const margin = Math.max(tileW, tileH) * 2;
    const left   = anchorPxX - (LENS_RADIUS + margin);
    const right  = anchorPxX + (LENS_RADIUS + margin);
    const top    = anchorPxY - (LENS_RADIUS + margin);
    const bottom = anchorPxY + (LENS_RADIUS + margin);

    const firstCol = Math.floor(left  / tileW);
    const lastCol  = Math.floor(right / tileW);
    const firstRow = Math.floor(top   / tileH);
    const lastRow  = Math.floor(bottom/ tileH);

    switch (repeatStyle) {
      case 'full-drop': {
        for (let col = firstCol; col <= lastCol; col++) {
          const x = col * tileW;
          for (let row = firstRow; row <= lastRow; row++) {
            const y = row * tileH;
            ctx.drawImage(uploadedImage, x, y, tileW, tileH);
          }
        }
        break;
      }
      case 'half-drop': {
        for (let col = firstCol - 2; col <= lastCol + 2; col++) {
          const x = col * tileW;
          const vOff = (col % 2) * (tileH / 2);
          const adjFirstRow = Math.floor((top - vOff) / tileH) - 2;
          const adjLastRow  = Math.floor((bottom - vOff) / tileH) + 2;
          for (let row = adjFirstRow; row <= adjLastRow; row++) {
            const y = row * tileH + vOff;
            ctx.drawImage(uploadedImage, x, y, tileW, tileH);
          }
        }
        break;
      }
      case 'mirror': {
        for (let row = firstRow - 2; row <= lastRow + 2; row++) {
          const y = row * tileH;
          for (let col = firstCol - 2; col <= lastCol + 2; col++) {
            const x = col * tileW;
            const flipX = (col & 1) === 1;
            const flipY = (row & 1) === 1;
            ctx.save();
            ctx.translate(x + (flipX ? tileW : 0), y + (flipY ? tileH : 0));
            ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            ctx.drawImage(uploadedImage, 0, 0, tileW, tileH);
            ctx.restore();
          }
        }
        break;
      }
      default: {
        for (let col = firstCol; col <= lastCol; col++) {
          const x = col * tileW;
          for (let row = firstRow; row <= lastRow; row++) {
            const y = row * tileH;
            ctx.drawImage(uploadedImage, x, y, tileW, tileH);
          }
        }
      }
    }
  }

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

  function drawLens(currentScale) {
    if (!imgLoaded) return;

    const PX_PER_CM_PHYSICAL = 37.8;
    const pxPerCmPreview = canvas.height / 100;

    const worldX_cm = lensX / pxPerCmPreview;
    const worldY_cm = lensY / pxPerCmPreview;

    const physX_px = worldX_cm * PX_PER_CM_PHYSICAL;
    const physY_px = worldY_cm * PX_PER_CM_PHYSICAL;

    ctx.save();
    ctx.beginPath();
    ctx.arc(lensX, lensY, LENS_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(lensX - physX_px, lensY - physY_px);
    drawTilesAtPhysicalScale(currentScale, PX_PER_CM_PHYSICAL, physX_px, physY_px);
    ctx.restore();

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

  // --- UI events (unchanged) -------------------------------------------------
  if (repeatGroup) {
    repeatGroup.addEventListener('click', (e) => {
      const label = e.target.closest('.repeat-option');
      if (!label) return;
      const input = label.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      setRepeatSelectedUI();
      if (typeof renderAll === 'function') renderAll();
    });
    repeatGroup.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const label = e.target.closest('.repeat-option');
      if (!label) return;
      e.preventDefault();
      const input = label.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      setRepeatSelectedUI();
      if (typeof renderAll === 'function') renderAll();
    });
  }

  if (legacySelect) {
    legacySelect.addEventListener('change', () => {
      setRepeatSelectedUI();
      if (imgLoaded) renderAll();
    });
  }

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

  const repeatStyleSelectElem = document.getElementById('repeatStyle');
  if (repeatStyleSelectElem) {
    repeatStyleSelectElem.addEventListener('change', () => {
      setRepeatSelectedUI();
      if (imgLoaded) renderAll();
    });
  }

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
    uploadedImage.onload = () => {
      imgLoaded = true;
      setupImageForCanvas();

      // NEW: reveal gated UI after the image is actually ready
      setUploadDependentUI(true);

      setCartEnabled(true);
    };
    uploadedImage.src = fileUrl;
  });

  function setupImageForCanvas() {
    scaleSlider.value = 100;
    scaleValue.textContent = 100;

    updateCanvasSize();   // will render image now that imgLoaded = true
    setRepeatSelectedUI();
    renderAll();
    calculateDPI();
  }

  // Init from CMS and render
  const widthFromCMS = printWidthInput.getAttribute('data-width');
  if (widthFromCMS) printWidthInput.value = widthFromCMS;

  setRepeatSelectedUI();
  updateCanvasSize();     // shows placeholder at first load
});
