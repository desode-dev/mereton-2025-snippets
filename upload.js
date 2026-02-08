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

  // Image-based repeat selector group
  const repeatGroup = document.getElementById('repeatStyleGroup'); // new UI group
  const legacySelect = document.getElementById('repeatStyle');     // optional fallback

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

  // NEW: track file type support
  let isEditableFile = false;

  // Loupe (magnifier) state — shows REAL physical scale
  let lensActive = false;
  let lensX = 0;
  let lensY = 0;
  const LENS_RADIUS = 100;   // adjust as needed
  const LENS_BORDER_PX = 1;  // ring thickness

  // NEW: elements hidden until a file is uploaded
  const gatedUI = document.querySelectorAll('.product-upload-options, .input-wrap');

  // NEW: canvas area (centered by default; align-start after upload)
  const canvasArea = document.querySelector('.canvas-area');

  // NEW: non-editable notice element (optional)
  // Add something like: <div id="nonEditableNotice" style="display:none;"></div>
  const nonEditableNotice = document.getElementById('nonEditableNotice');

  function showNonEditableNotice(fileName) {
    if (!nonEditableNotice) return;
    nonEditableNotice.textContent =
      `Heads up: “${fileName}” can still be uploaded and ordered, but this file type can’t be previewed or edited in our tool.`;
    nonEditableNotice.style.display = '';
  }

  function hideNonEditableNotice() {
    if (!nonEditableNotice) return;
    nonEditableNotice.textContent = '';
    nonEditableNotice.style.display = 'none';
  }

  function setUploadDependentUI(hasFile) {
    gatedUI.forEach(el => {
      el.style.display = hasFile ? '' : 'none';
    });
    if (canvasArea && hasFile) {
      canvasArea.style.alignItems = 'flex-start';
    }
  }
  setUploadDependentUI(false); // hide on load

  // Helpers
  function getRepeatStyle() {
    const checked = document.querySelector('input[name="repeatStyle"]:checked');
    if (checked && checked.value) return checked.value; // "full-drop" | "half-drop" | "mirror"
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

    // soft background
    ctx.save();
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // subtle border
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

  // NEW: when file is non-editable, render a dedicated message in the canvas
  function drawNonEditableCanvasMessage(fileName) {
    const msg1 = 'Preview unavailable for this file type';
    const msg2 = `(${fileName})`;
    const msg3 = 'You can still continue to checkout.';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#666';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg1, canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillStyle = '#999';
    ctx.fillText(msg2, canvas.width / 2, canvas.height / 2 + 6);
    ctx.fillStyle = '#666';
    ctx.fillText(msg3, canvas.width / 2, canvas.height / 2 + 26);
    ctx.restore();
  }

  function updateCanvasSize() {
    const fabricWidthCM = parseFloat(printWidthInput.value);
    const previewHeightPx = 500;
    const previewWidthPx = (fabricWidthCM / 100) * previewHeightPx;

    canvas.width = previewWidthPx;
    canvas.height = previewHeightPx;

    if (imgLoaded && isEditableFile) {
      renderAll();
      calculateDPI();
    } else if (imgLoaded && !isEditableFile) {
      drawNonEditableCanvasMessage(fileNameField?.value || 'file');
    } else {
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

  // Draw tiles at REAL physical size (like SingleTile: 37.8 px/cm),
  // over exactly the area the lens can show, anchored to the cursor's world point.
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

  // Full render (preview + rulers + lens)
  function renderAll() {
    if (!imgLoaded || !isEditableFile) return;

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

  // Loupe that shows TRUE physical size (37.8 px/cm) aligned to the same world point
  function drawLens(currentScale) {
    if (!imgLoaded || !isEditableFile) return;

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
    if (!imgLoaded || !isEditableFile) return;

    const printWidthCM = parseFloat(printWidthInput.value);
    const scale = getScale();
    const userPpi = getUserPpi();
    const printWidthInches = (printWidthCM / 2.54) * scale;
    const dpi = uploadedImage.width / printWidthInches;

    if (dpiDisplay) dpiDisplay.textContent = Math.round(dpi);
    if (assumedDpiDisplay) assumedDpiDisplay.textContent = isNaN(userPpi) ? 'N/A' : userPpi;
  }

  // --- UI events -------------------------------------------------------------

  if (repeatGroup) {
    repeatGroup.addEventListener('click', (e) => {
      if (!isEditableFile) return;
      const label = e.target.closest('.repeat-option');
      if (!label) return;
      const input = label.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      setRepeatSelectedUI();
      if (imgLoaded) renderAll();
    });

    repeatGroup.addEventListener('keydown', (e) => {
      if (!isEditableFile) return;
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const label = e.target.closest('.repeat-option');
      if (!label) return;
      e.preventDefault();
      const input = label.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      setRepeatSelectedUI();
      if (imgLoaded) renderAll();
    });
  }

  if (legacySelect) {
    legacySelect.addEventListener('change', () => {
      if (!isEditableFile) return;
      setRepeatSelectedUI();
      if (imgLoaded) renderAll();
    });
  }

  scaleSlider.addEventListener('input', () => {
    scaleValue.textContent = scaleSlider.value;
    if (imgLoaded && isEditableFile) {
      renderAll();
      calculateDPI();
    }
  });

  printWidthInput.addEventListener('input', () => {
    updateCanvasSize();
    if (imgLoaded && isEditableFile) calculateDPI();
  });

  // --- Sync imagePPI -> #image-quality --------------------------------------
  const imageQualityInput = document.getElementById('image-quality');
  function syncImageQualityFromPpi() {
    if (!ppiSelect || !imageQualityInput) return;
    imageQualityInput.value = ppiSelect.value || '';
    imageQualityInput.dispatchEvent(new Event('input', { bubbles: true }));
    imageQualityInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (ppiSelect) {
    ppiSelect.addEventListener('change', () => {
      if (!isEditableFile) return;

      const isUnsure = ppiSelect.value.toLowerCase() === 'unsure';
      if (ppiHelpText) ppiHelpText.style.display = isUnsure ? 'block' : 'none';
      syncImageQualityFromPpi();
      if (!isUnsure && imgLoaded) {
        renderAll();
        calculateDPI();
      }
    });
    ppiSelect.addEventListener('input', syncImageQualityFromPpi);
    syncImageQualityFromPpi();
  }
  // ---------------------------------------------------------------------------

  const repeatStyleSelectElem = document.getElementById('repeatStyle');
  if (repeatStyleSelectElem) {
    repeatStyleSelectElem.addEventListener('change', () => {
      if (!isEditableFile) return;
      setRepeatSelectedUI();
      if (imgLoaded) renderAll();
    });
  }

  // Lens handlers (disable for non-editable)
  canvas.addEventListener('mouseenter', (e) => {
    if (!isEditableFile) return;
    lensActive = true;
    const rect = canvas.getBoundingClientRect();
    lensX = e.clientX - rect.left;
    lensY = e.clientY - rect.top;
    if (imgLoaded) renderAll();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isEditableFile) return;
    if (!lensActive) return;
    const rect = canvas.getBoundingClientRect();
    lensX = e.clientX - rect.left;
    lensY = e.clientY - rect.top;
    if (imgLoaded) renderAll();
  });

  canvas.addEventListener('mouseleave', () => {
    if (!isEditableFile) return;
    lensActive = false;
    if (imgLoaded) renderAll();
  });

  // --- Sync "Type" dropdown -> #category -------------------------------------
  const typeSelectEl = document.getElementById('Type') || document.querySelector('select[name="Type"]');
  const categoryInput = document.getElementById('category');

  function syncCategoryFromType() {
    if (!typeSelectEl || !categoryInput) return;
    const val = typeSelectEl.value || '';
    categoryInput.value = val;
    categoryInput.dispatchEvent(new Event('input', { bubbles: true }));
    categoryInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (typeSelectEl) {
    typeSelectEl.addEventListener('change', syncCategoryFromType);
    typeSelectEl.addEventListener('input', syncCategoryFromType);
    syncCategoryFromType();
  }

  // --- Upload handling -------------------------------------------------------
  // Editable: png, jpg, jpeg (can render in canvas)
  // Non-editable (allowed): pdf, psd, ai, tif/tiff (allowed to checkout but no tool editing)
  const editableExtensions = ['png', 'jpg', 'jpeg'];
  const nonEditableAllowedExtensions = ['pdf', 'psd', 'ai', 'tif', 'tiff'];
  const allAllowedExtensions = [...editableExtensions, ...nonEditableAllowedExtensions];

  function getFileExt(fileName) {
    return (fileName || '').split('.').pop().toLowerCase().trim();
  }

  function isAllowedExt(ext) {
    return allAllowedExtensions.includes(ext);
  }

  function isEditableExt(ext) {
    return editableExtensions.includes(ext);
  }

  UploadTool.initializeUploadTool("1d97ae1bd6c1cf6efc5d6d6a937d05e47bb464528d8cdad5");

  document.getElementById('single-test-upload').addEventListener('fileUploaded', (event) => {
    const { fileUrl, fileName } = event.detail;

    setCartEnabled(false);
    hideNonEditableNotice();

    const ext = getFileExt(fileName);

    if (!isAllowedExt(ext)) {
      alert("File type not allowed. Please upload PNG, JPG, JPEG, PDF, PSD, AI, or TIF files.");
      window.location.reload();
      return;
    }

    if (fileUrlField) fileUrlField.value = fileUrl;
    if (fileNameField) fileNameField.value = fileName;

    // Show UI once we have a file (even if not editable)
    setUploadDependentUI(true);

    // Editable image types: load into canvas
    if (isEditableExt(ext)) {
      isEditableFile = true;

      uploadedImage = new Image();
      uploadedImage.onload = () => {
        imgLoaded = true;
        setupImageForCanvas();
        setCartEnabled(true);
      };
      uploadedImage.onerror = () => {
        alert("We couldn't load that image for preview. You can try another file.");
        // Keep cart disabled since we can't confirm preview state
        setCartEnabled(false);
      };
      uploadedImage.src = fileUrl;
      return;
    }

    // Non-editable allowed: permit checkout, but no canvas/controls
    isEditableFile = false;
    imgLoaded = true; // we have a file, just not previewable

    // Show notice + render non-editable canvas message
    showNonEditableNotice(fileName);
    updateCanvasSize();

    // Disable interactive editing controls (but still allow checkout)
    if (repeatGroup) repeatGroup.style.pointerEvents = 'none';
    if (legacySelect) legacySelect.disabled = true;
    if (scaleSlider) scaleSlider.disabled = true;
    if (ppiSelect) ppiSelect.disabled = true;

    // If you want to keep printWidth editable for non-editable types, leave it enabled.
    // If you want to lock it too, uncomment:
    // if (printWidthInput) printWidthInput.disabled = true;

    setCartEnabled(true);
  });

  function setupImageForCanvas() {
    // re-enable editing controls in case previous upload was non-editable
    if (repeatGroup) repeatGroup.style.pointerEvents = '';
    if (legacySelect) legacySelect.disabled = false;
    if (scaleSlider) scaleSlider.disabled = false;
    if (ppiSelect) ppiSelect.disabled = false;

    scaleSlider.value = 100;
    scaleValue.textContent = 100;

    updateCanvasSize();
    setRepeatSelectedUI();
    renderAll();
    calculateDPI();
  }

  // Init from CMS and render
  const widthFromCMS = printWidthInput.getAttribute('data-width');
  if (widthFromCMS) printWidthInput.value = widthFromCMS;

  setRepeatSelectedUI();
  updateCanvasSize();
});
