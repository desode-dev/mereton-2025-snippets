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
  const singleTileCanvas = document.getElementById('singleTileCanvas');
  const singleCtx = singleTileCanvas.getContext('2d');
  const fileUrlField = document.getElementById('uploadcare-file-url');
  const fileNameField = document.getElementById('file-name');
  const hiddenWidth = document.getElementById('image-width');
  const hiddenRepeat = document.getElementById('repeat-style');
  const hiddenScale = document.getElementById('image-scale');

  let uploadedImage = new Image();
  let imgLoaded = false;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function updateCanvasSize() {
    const fabricWidthCM = parseFloat(printWidthInput.value);
    const previewHeightPx = 500;
    const previewWidthPx = (fabricWidthCM / 100) * previewHeightPx;

    canvas.width = previewWidthPx;
    canvas.height = previewHeightPx;

    if (imgLoaded) {
      drawPattern();
      calculateDPI();
      drawSingleTile();
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
    if (cm % 10 === 0) {
      ctx.fillText(cm.toString(), x, notchLength + fontSize);
    }
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


  function drawPattern() {
    const scale = parseInt(scaleSlider.value) / 100;
    const repeatStyle = document.getElementById('repeatStyle').value;
    const userPpi = parseFloat(ppiSelect.value) || 300;

    const imageWidthCm = (uploadedImage.width / userPpi) * 2.54;
    const imageHeightCm = (uploadedImage.height / userPpi) * 2.54;

    const scaledImageWidthCm = imageWidthCm * scale;
    const scaledImageHeightCm = imageHeightCm * scale;
    const pxPerCm = canvas.height / 100;
    const tileWidth = scaledImageWidthCm * pxPerCm;
    const tileHeight = scaledImageHeightCm * pxPerCm;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (repeatStyle) {
      case 'full-drop':
        for (let y = 0; y <= canvas.height; y += tileHeight) {
          for (let x = 0; x <= canvas.width; x += tileWidth) {
            ctx.drawImage(uploadedImage, x, y, tileWidth, tileHeight);
          }
        }
        break;
      case 'half-drop':
        for (let x = 0; x <= canvas.width + tileWidth; x += tileWidth) {
          const col = Math.floor(x / tileWidth);
          const verticalOffset = (col % 2) * (tileHeight / 2);
          for (let y = -tileHeight; y <= canvas.height + tileHeight; y += tileHeight) {
            ctx.drawImage(uploadedImage, x, y + verticalOffset, tileWidth, tileHeight);
          }
        }
        break;
      case 'mirror':
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

drawRulers(pxPerCm);

    if (hiddenWidth) hiddenWidth.value = scaledImageWidthCm.toFixed(2) + 'cm';
if (hiddenRepeat) hiddenRepeat.value = repeatStyle;
if (hiddenScale) hiddenScale.value = scaleSlider.value + '%';
    imageWidthCmDisplay.textContent = Math.round(scaledImageWidthCm);
  }

  function calculateDPI() {
    const printWidthCM = parseFloat(printWidthInput.value);
    const scale = parseInt(scaleSlider.value) / 100;
    const userPpi = parseFloat(ppiSelect.value) || 300;
    const printWidthInches = (printWidthCM / 2.54) * scale;
    const dpi = uploadedImage.width / printWidthInches;

    if (dpiDisplay) dpiDisplay.textContent = Math.round(dpi);
    if (assumedDpiDisplay) assumedDpiDisplay.textContent = isNaN(userPpi) ? 'N/A' : userPpi;
  }

function drawSingleTile() {
  const userPpi = parseFloat(ppiSelect.value) || 300;
  const scale = parseInt(scaleSlider.value) / 100;

  // Convert image resolution to physical cm size
  const imageWidthCm = (uploadedImage.width / userPpi) * 2.54;
  const imageHeightCm = (uploadedImage.height / userPpi) * 2.54;

  // Apply user scale
  const scaledWidthCm = imageWidthCm * scale;
  const scaledHeightCm = imageHeightCm * scale;

  // Convert physical cm to screen pixels (37.8 px/cm @ 96dpi)
  const pxPerCm = 37.8;
  const renderWidthPx = scaledWidthCm * pxPerCm;
  const renderHeightPx = scaledHeightCm * pxPerCm;

  // Set canvas to target render size
  singleTileCanvas.width = renderWidthPx;
  singleTileCanvas.height = renderHeightPx;

  // Draw image scaled to real-world screen size
  singleCtx.clearRect(0, 0, singleTileCanvas.width, singleTileCanvas.height);
  singleCtx.drawImage(uploadedImage, 0, 0, renderWidthPx, renderHeightPx);

  // Apply transform for current pan position
  singleTileCanvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
}



  scaleSlider.addEventListener('input', () => {
    scaleValue.textContent = scaleSlider.value;
    if (imgLoaded) {
      drawPattern();
      calculateDPI();
      drawSingleTile();
    }
  });

  printWidthInput.addEventListener('input', updateCanvasSize);
  ppiSelect.addEventListener('change', () => {
    const isUnsure = ppiSelect.value === 'unsure';
    ppiHelpText.style.display = isUnsure ? 'block' : 'none';
    if (!isUnsure && imgLoaded) {
      drawPattern();
      calculateDPI();
      drawSingleTile();
    }
  });

  document.getElementById('repeatStyle').addEventListener('change', () => {
    if (imgLoaded) drawPattern();
  });

  singleTileCanvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
    singleTileCanvas.classList.add('dragging');
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    singleTileCanvas.classList.remove('dragging');
  });

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  offsetX = e.clientX - dragStartX;
  offsetY = e.clientY - dragStartY;
  singleTileCanvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
});

  const allowedExtensions = ['png', 'jpg', 'jpeg'];
  function isFileTypeAllowed(fileName) {
    return allowedExtensions.includes(fileName.split('.').pop().toLowerCase());
  }

  UploadTool.initializeUploadTool("1d97ae1bd6c1cf6efc5d6d6a937d05e47bb464528d8cdad5");

  document.getElementById('single-test-upload').addEventListener('fileUploaded', (event) => {
  const { fileUrl, fileName } = event.detail;

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
  };
  uploadedImage.src = fileUrl;
});


function setupImageForCanvas() {
  scaleSlider.value = 100;
  scaleValue.textContent = 100;

  // Reset tile preview offsets
  offsetX = 0;
  offsetY = 0;
  singleTileCanvas.style.transform = `translate(0px, 0px)`;

  updateCanvasSize();
  drawSingleTile(); // redraw the full image at actual size
}

  const widthFromCMS = printWidthInput.getAttribute('data-width');
  if (widthFromCMS) printWidthInput.value = widthFromCMS;
  updateCanvasSize();
});
