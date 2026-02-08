/* =========================================================
   Global helpers for thumbnail + primary image handling
   ========================================================= */
function swapPrimaryImageResponsiveGlobal(imgEl, url) {
  if (!imgEl || !url) return;
  const pic = imgEl.closest('picture');
  if (pic) {
    pic.querySelectorAll('source').forEach(source => {
      source.setAttribute('srcset', url);
    });
  }
  imgEl.setAttribute('src', url);
  imgEl.setAttribute('srcset', url);
  imgEl.setAttribute('sizes', '100vw');
  if (imgEl.currentSrc && !imgEl.currentSrc.includes(url)) {
    const bust = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    imgEl.setAttribute('src', bust);
    imgEl.setAttribute('srcset', bust);
    if (pic) {
      pic.querySelectorAll('source').forEach(s => s.setAttribute('srcset', bust));
    }
  }
}

function setPrimaryImageAll(url) {
  if (!url) return;
  // background-based viewers
  document.querySelectorAll('.product-viewer-mini').forEach(el => {
    el.style.backgroundImage = `url('${url}')`;
  });
  document.querySelectorAll('.product-viewer-window').forEach(el => {
    el.style.backgroundImage = `url('${url}')`;
  });
  // optional <img id="primary-image">
  const primaryImage = document.getElementById('primary-image');
  if (primaryImage) swapPrimaryImageResponsiveGlobal(primaryImage, url);
}

function markActiveThumb(thumbEl) {
  document.querySelectorAll('.product-viewer-thumb, .change-viewer-thumb').forEach(t => {
    t.style.border = 'none';
  });
  if (thumbEl) thumbEl.style.border = '1px solid black';
}

/* =========================================================
   NEW: Colour swatch border helper
   ========================================================= */
function updateColourSwatchBorders(radioEl) {
  document.querySelectorAll('.colour-swatch').forEach(swatch => {
    swatch.style.border = 'none';
  });
  const swatch = radioEl?.closest('.colour-swatch');
  if (swatch) swatch.style.border = '1px solid black';
}

/* =========================================================
   Scale slider → background scaling + floating output
   ========================================================= */
document.getElementById('scaleSlider')?.addEventListener('input', function () {
  let scaleValue = this.value;

  // Convert: 100 → 50%, 200 → 100%
  let backgroundScale = (scaleValue - 100) / 2 + 50;

  // Update scale output text with %
  const output = document.getElementById('scaleOutput');
  if (output) output.textContent = `${scaleValue}%`;

  // Move output to match thumb
  const slider = this;
  const sliderWidth = slider.offsetWidth;
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const percent = (scaleValue - min) / (max - min);

  // Calculate exact thumb center offset
  const thumbWidth = 24; // match your styled thumb
  const offset = percent * (sliderWidth - thumbWidth) + thumbWidth / 2;
  if (output) output.style.left = `${offset}px`;

  // Apply background size
  document.querySelectorAll('.mask, .small-slide').forEach(function (el) {
    el.style.backgroundSize = `${backgroundScale}%`;
    el.style.backgroundRepeat = 'repeat';
    el.style.backgroundPosition = 'center';
  });
});

/* =========================================================
   Thumbnails: click → change main image (+ border)
   Supports both .product-viewer-thumb and .change-viewer-thumb
   ========================================================= */
document.querySelectorAll('.product-viewer-thumb, .change-viewer-thumb').forEach(function (thumb) {
  thumb.style.cursor = 'pointer';
  thumb.addEventListener('click', function () {
    const imgEl = (this.tagName.toLowerCase() === 'img') ? this : this.querySelector('img');
    const url = this.getAttribute('data-large')
             || imgEl?.getAttribute('data-large')
             || imgEl?.getAttribute('src');
    if (!url) return;
    setPrimaryImageAll(url);
    markActiveThumb(this);
  });
});

/* =========================================================
   Display colour names under thumbs
   ========================================================= */
document.querySelectorAll('.product-viewer-thumb').forEach(function (thumb) {
  const img = thumb.querySelector('img');
  if (img) {
    const src = img.getAttribute('src');
    const fullName = src.split('/').pop().split('.')[0];
    const imageName = fullName.split('_').pop();
    const serviceTitle = document.querySelector('.service-title')?.textContent.trim() || '';
    let nameWithoutServiceTitle = imageName.replace(serviceTitle + '-', '');
    nameWithoutServiceTitle = nameWithoutServiceTitle.replace(/-\d+$/, '');
    const capitalizedName = nameWithoutServiceTitle
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const colourNameElement = thumb.querySelector('.product-viewer-colour-name');
    if (colourNameElement) {
      colourNameElement.textContent = capitalizedName;
    }
  }
});

/* =========================================================
   Webflow slider-thumbs sync (uses jQuery from Webflow)
   ========================================================= */
Webflow.push(function () {
  $('[data-thumbs-for]').on('click', '.w-slide', function () {
    var target = $($(this).parents('.w-slider').attr('data-thumbs-for'));
    if (target.length == 0) return;
    target.find('.w-slider-nav').children().eq($(this).index()).trigger('tap');
  });
});

/* =========================================================
   Fabric Selection + Save Nudge + Pricing + Cart Gating
   ========================================================= */
window.addEventListener('DOMContentLoaded', function () {
  const allFabricCards = document.querySelectorAll('.design-fabric');
  const radios = document.querySelectorAll('input[type="radio"][name="fabric"]');
  const quantityInput = document.getElementById('quantity');
  const typeSelect = document.getElementById('Type'); // <select name="Type" id="Type">
  const designAddCart = document.getElementById('designAddCart');
  const largeButtonChange = document.querySelector('.large-button-change');
  const largeButton = document.querySelector('.large-button');
  const initialLargeButtonBg = largeButton ? getComputedStyle(largeButton).backgroundImage : '';
  const selectedImageEl = document.getElementById('selectedImage'); // optional

  // --- Sync "Type" -> #category --------------------------------------------
  const categoryInput = document.getElementById('category');
  function syncCategoryFromType() {
    if (!typeSelect || !categoryInput) return;
    categoryInput.value = typeSelect.value || '';
    categoryInput.dispatchEvent(new Event('input', { bubbles: true }));
    categoryInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // --- Add to Cart gating (use existing grey-out/disable) ---
  function setCartEnabled(enabled) {
    if (!designAddCart) return;
    designAddCart.disabled = !enabled;
    designAddCart.style.opacity = enabled ? '1' : '0.2';
    designAddCart.style.pointerEvents = enabled ? 'auto' : 'none';
    designAddCart.setAttribute('aria-disabled', String(!enabled));
  }
  function isFabricSelected() {
    return !!document.querySelector('input[type="radio"][name="fabric"]:checked');
  }
  function isColourRequired() {
    return document.querySelectorAll('input[type="radio"][name="Colour"]').length > 0;
  }
  function isColourSelected() {
    return !!document.querySelector('input[type="radio"][name="Colour"]:checked');
  }

  // Compute minimum for the current selection (1 | 5 | 10)
  function getMinRequiredForSelected() {
    const type = typeSelect?.value;
    if (type !== 'Meterage') return 1;
    const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
    if (!selected) return 1;
    const explicitMin = parseInt(selected.getAttribute('data-min'), 10);
    if (Number.isFinite(explicitMin) && explicitMin > 1) return explicitMin;
    const tier1 = (selected.getAttribute('data-tier1') || '').trim();
    return tier1 === '' ? 5 : 1;
  }

  // Gating includes meeting the min when "Metres"
  function updateCartState() {
    const baseOk = isFabricSelected() && (!isColourRequired() || isColourSelected());
    let qtyOk = true;
    const type = typeSelect?.value;
    if (type === 'Meterage') {
      const minRequired = getMinRequiredForSelected(); // 1 | 5 | 10
      const q = parseInt(quantityInput?.value || '0', 10) || 0;
      qtyOk = q >= minRequired;
    }
    setCartEnabled(baseOk && qtyOk);
  }

  // Save selection nudges/animations
  function nudgeSaveSelection() {
    const el = document.getElementById('saveSelection');
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = 'translateY(100%)';
    void el.offsetHeight; // reflow
    el.style.transition = '';
    el.style.transform = 'translateY(0)';
  }
  const saveSelection = document.getElementById('saveSelection');
  function revealSaveSelection() {
    if (!saveSelection) return;
    saveSelection.classList.remove('is-visible');
    void saveSelection.offsetWidth;
    saveSelection.classList.add('is-visible');
  }

  function updateSelectedFabricDisplay(name) {
    const displayTarget = document.getElementById('selectedFabric');
    const fabricName = name || 'No fabric selected';
    if (displayTarget) displayTarget.textContent = fabricName;
  }

  // Toggle main/secondary button state
  function toggleButtonsBasedOnSession() {
    const hasSelected = !!sessionStorage.getItem('selectedFabric');
    if (largeButtonChange) largeButtonChange.style.display = hasSelected ? 'block' : 'none';
    if (largeButton) {
      largeButton.style.backgroundImage = hasSelected ? 'none' : initialLargeButtonBg;
    }
  }

  // Helpers for price formatting
  function formatPrice(value) {
    if (!value || isNaN(value)) return value;
    return `$${parseFloat(value).toFixed(2)}`;
  }
  function isEmpty(value) {
    return !value || value.trim() === '' || value === 'NaN';
  }

  /* =========================================
     NEW: Dedicated minimum notice beside price
     ========================================= */
  function ensureMinNoticeEl() {
    const priceEl = document.getElementById('price');
    if (!priceEl) return null;

    let notice = document.getElementById('min-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'min-notice';
      notice.style.marginTop = '6px';
      notice.style.fontSize = '14px';
      notice.style.display = 'none';
      priceEl.insertAdjacentElement('afterend', notice);
    }
    return notice;
  }

  function setMinNotice(text, force = false) {
    const notice = ensureMinNoticeEl();
    if (!notice) return;

    if (!text) {
      notice.textContent = '';
      notice.style.display = 'none';
      notice.dataset.forced = 'false';
      return;
    }

    notice.textContent = text;
    notice.style.display = 'block';
    notice.dataset.forced = force ? 'true' : 'false';
  }

  // Keep Print Width in sync with Type (Sample → 30x30cm, else selected fabric width)
  function updatePrintWidthForType() {
    const widthField = document.querySelector('input[name="Print Width"]');
    if (!widthField) return;
    const type = typeSelect?.value;
    if (type === 'Sample') {
      widthField.value = '30x30cm';
    } else {
      const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
      const fabricWidth = selected ? (selected.getAttribute('data-fabric-width') || '') : '';
      if (fabricWidth) widthField.value = fabricWidth;
    }
  }

  // Pricing: always show price; show min notice separately
  function updatePriceDisplayFromRadio(radio) {
    const type = typeSelect?.value; // "Sample" or "Meterage"
    const quantity = parseInt(quantityInput?.value || '1', 10);
    const priceElement = document.getElementById('price');
    const uomElement = document.getElementById('price-uom');
    const hiddenPriceField = document.querySelector('input[name="price"]');
    if (!type || !priceElement || !uomElement || !radio) return;

    const tier1 = radio.getAttribute('data-tier1'); // may be empty when min fabric
    const tier2 = radio.getAttribute('data-tier2');
    const tier3 = radio.getAttribute('data-tier3');

    const explicitMin = parseInt(radio.getAttribute('data-min'), 10);
    const minRequired = Number.isFinite(explicitMin) ? explicitMin : (isEmpty(tier1) ? 5 : 1);

    let price = '';
    let showUom = true;

    if (type === 'Sample') {
      setMinNotice('', false);
      const sample = radio.getAttribute('data-sample');
      price = sample;
      uomElement.textContent = 'per sample';
    } else if (type === 'Meterage') {
      const isBelowMin = quantity < minRequired;
      const noticeText = (minRequired > 1 && isBelowMin) ? `Minimum ${minRequired}m required` : '';

      const noticeEl = ensureMinNoticeEl();
      const isForced = noticeEl?.dataset.forced === 'true';

      if (noticeText) {
        setMinNotice(noticeText, false);
      } else if (!isForced) {
        setMinNotice('', false);
      }

      const effectiveQty = Math.max(quantity, minRequired);

      if (effectiveQty >= 50 && !isEmpty(tier3)) {
        price = tier3;
      } else {
        if (minRequired === 1) {
          if (effectiveQty <= 5 && !isEmpty(tier1)) {
            price = tier1;
          } else if (!isEmpty(tier2)) {
            price = tier2;
          } else {
            price = tier1;
          }
        } else {
          price = !isEmpty(tier2) ? tier2 : '';
        }
      }

      uomElement.textContent = 'per meter';
      showUom = true;
    }

    priceElement.textContent = formatPrice(price);
    uomElement.style.display = showUom ? 'inline' : 'none';

    if (hiddenPriceField) {
      hiddenPriceField.value = price ? parseFloat(price).toFixed(2) : '';
    }
  }

  function updateHiddenInputsFromRadio(radio) {
    if (!radio) return;
    const fabricName  = radio.getAttribute('data-fabric-name') || '';
    const fabricWidth = radio.getAttribute('data-fabric-width') || '';
    const fabricGSM   = radio.getAttribute('data-gsm') || '';
    const fabricImage = radio.getAttribute('data-fabric-image') || '';

    sessionStorage.setItem('selectedFabric', fabricName);

    // Store & show selected fabric image
    if (fabricImage) {
      sessionStorage.setItem('selectedFabricImage', fabricImage);
      if (selectedImageEl) {
        selectedImageEl.src = fabricImage;
        selectedImageEl.style.display = 'block';
      }
    }

    const nameField   = document.querySelector('input[name="Fabric"]');
    const priceField  = document.querySelector('input[name="price"]');
    const widthField  = document.querySelector('input[name="Print Width"]');
    const weightField = document.getElementById('packageWeight');

    if (nameField)  nameField.value  = fabricName;
    if (priceField) priceField.value = '';
    if (widthField) widthField.value = fabricWidth;
    if (weightField) {
      weightField.setAttribute('data-width', fabricWidth);
      weightField.setAttribute('data-gsm', fabricGSM);
    }

    // --- COLOUR HANDLING FIX ---
    const selectedColourRadio = document.querySelector('input[type="radio"][name="Colour"]:checked');
    const imageField  = document.getElementById('design-image') || document.querySelector('input[name="image"]');
    const colourField = document.getElementById('selected-colour') || document.querySelector('input[name="Colour"]');
    const primaryImage= document.getElementById('primary-image');

    if (selectedColourRadio) {
      if (colourField) colourField.value = selectedColourRadio.value;
      const imageUrl = selectedColourRadio.getAttribute('data-image');
      if (imageField) imageField.value = imageUrl || '';
      if (imageUrl) {
        if (primaryImage) swapPrimaryImageResponsiveGlobal(primaryImage, imageUrl);
        setPrimaryImageAll(imageUrl);
      }
      updateColourSwatchBorders(selectedColourRadio);
    }

    updatePriceDisplayFromRadio(radio);
    updatePrintWidthForType();
    calculatePackageWeight();
  }

  function calculatePackageWeight() {
    const weightEl = document.getElementById('packageWeight');
    if (!quantityInput || !weightEl) return;

    const totalFabricLength = parseFloat(quantityInput.value);
    const fabricWidthCm = parseFloat(weightEl.getAttribute('data-width'));
    const fabricGSM = parseFloat(weightEl.getAttribute('data-gsm'));
    if (isNaN(totalFabricLength) || totalFabricLength === 0 || isNaN(fabricWidthCm) || isNaN(fabricGSM)) return;

    const fabricWidthMeters = fabricWidthCm / 100;
    const coreWeightKg = 1;
    const area = totalFabricLength * fabricWidthMeters;
    const fabricWeightKg = (area * fabricGSM) / 1000;
    const totalWeightKg = fabricWeightKg + coreWeightKg;
    const perUnitWeightKg = totalWeightKg / totalFabricLength;
    weightEl.value = perUnitWeightKg.toFixed(2);
  }

  // Central handler for a fabric selection; nudge on user changes only
  function onFabricSelected(radio, { nudge = true } = {}) {
    if (!radio) return;

    // Update hidden fields & UI
    updateHiddenInputsFromRadio(radio);
    updateSelectedFabricDisplay(radio.getAttribute('data-fabric-name') || radio.value);
    toggleButtonsBasedOnSession();

    // Clear selection UI
    allFabricCards.forEach(card => {
      card.style.border = 'none';
      card.classList.remove('fabric-selected');
      const selectionEl = card.querySelector('.selection');
      if (selectionEl) selectionEl.style.display = 'none';
    });

    // Mark the selected card
    const wrapper = radio.closest('.design-fabric');
    if (wrapper) {
      wrapper.style.border = '1px solid black';
      wrapper.classList.add('fabric-selected');
      const selectionEl = wrapper.querySelector('.selection');
      if (selectionEl) selectionEl.style.display = 'block';
    }

    if (nudge) revealSaveSelection();
    updateCartState();
  }

  // Card click → set radio and dispatch change
  allFabricCards.forEach(wrapper => {
    wrapper.style.cursor = 'pointer';
    wrapper.addEventListener('click', function (e) {
      if (e.target.closest('.design-fabric-view-button')) return;
      const radio = wrapper.querySelector('input[type="radio"][name="fabric"]');
      if (!radio) return;

      document.querySelectorAll('input[type="radio"][name="fabric"]:checked')
        .forEach(r => { r.checked = false; });

      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Delegated radio change (fabric & colour)
  document.addEventListener('change', (e) => {
    const target = e.target;

    if (target && target.matches('input[type="radio"][name="fabric"]')) {
      const noticeEl = document.getElementById('min-notice');
      if (noticeEl) noticeEl.dataset.forced = 'false';
      onFabricSelected(target, { nudge: true });
    }

    if (target && target.matches('input[type="radio"][name="Colour"]')) {
      const imageField  = document.getElementById('design-image') || document.querySelector('input[name="image"]');
      const colourField = document.getElementById('selected-colour') || document.querySelector('input[name="Colour"]');

      if (imageField)  imageField.value  = target.getAttribute('data-image') || '';
      if (colourField) colourField.value = target.value || '';

      const imageUrl = target.getAttribute('data-image');
      if (imageUrl) setPrimaryImageAll(imageUrl);

      updateColourSwatchBorders(target);
      updateCartState();
    }
  });

  // Quantity changes update pricing, weight, and cart gating
  if (quantityInput) {
    quantityInput.addEventListener('input', () => {
      calculatePackageWeight();
      const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
      if (selected) updatePriceDisplayFromRadio(selected);

      const minRequired = getMinRequiredForSelected();
      const q = parseInt(quantityInput.value || '0', 10) || 0;
      if (q >= minRequired) {
        const noticeEl = document.getElementById('min-notice');
        if (noticeEl) noticeEl.dataset.forced = 'false';
      }

      updateCartState();
    });
  }

  // Type SELECT changes update pricing + print width + category mirror + cart gating
  if (typeSelect) {
    const onTypeChange = () => {
      const noticeEl = document.getElementById('min-notice');
      if (noticeEl) noticeEl.dataset.forced = 'false';

      const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
      if (selected) updatePriceDisplayFromRadio(selected);
      updatePrintWidthForType();
      syncCategoryFromType();
      updateCartState();
      applyQtyMin();
    };
    typeSelect.addEventListener('change', onTypeChange);
    typeSelect.addEventListener('input', onTypeChange);
  }

  // Restore selection from sessionStorage (no nudge on restore)
  const selectedFabric = sessionStorage.getItem('selectedFabric');
  const storedImage = sessionStorage.getItem('selectedFabricImage');
  let hasRestored = false;

  if (selectedFabric) {
    radios.forEach(function (radio) {
      const radioName = radio.getAttribute('data-fabric-name')?.trim().toLowerCase();
      const storedName = selectedFabric.trim().toLowerCase();
      if (radioName === storedName) {
        radio.checked = true;
        onFabricSelected(radio, { nudge: false });
        const fabricWrapper = radio.closest('.design-fabrics');
        const radioWrapper = radio.closest('.design-fabric');
        if (fabricWrapper && radioWrapper) {
          fabricWrapper.scrollTo({ left: radioWrapper.offsetLeft - 20, behavior: 'smooth' });
        }
        hasRestored = true;
      }
    });
  }

  if (!hasRestored && selectedFabric) {
    updateSelectedFabricDisplay(selectedFabric);
    toggleButtonsBasedOnSession();
  }

  if (storedImage && selectedImageEl) {
    selectedImageEl.src = storedImage;
    selectedImageEl.style.display = 'block';
  }

  const initiallySelected = document.querySelector('input[type="radio"][name="fabric"]:checked');
  if (initiallySelected) onFabricSelected(initiallySelected, { nudge: false });

  const initiallyCheckedColour = document.querySelector('input[type="radio"][name="Colour"]:checked');
  if (initiallyCheckedColour) updateColourSwatchBorders(initiallyCheckedColour);

  updateCartState();
  updatePrintWidthForType();
  syncCategoryFromType();

  const designAddCartBtn = designAddCart;
  if (designAddCartBtn) {
    designAddCartBtn.addEventListener('click', () => {
      sessionStorage.removeItem('selectedFabric');
      sessionStorage.removeItem('selectedFabricImage');
      toggleButtonsBasedOnSession();
    });
  }

  /* =========================================
     Quantity field guardrails (respect mins)
     ========================================= */
  function applyQtyMin() {
    if (!quantityInput) return;
    const type = typeSelect?.value;
    const minRequired = (type === 'Meterage') ? getMinRequiredForSelected() : 1;
    quantityInput.min = String(minRequired);
    const val = parseInt(quantityInput.value || '0', 10);
    if (!Number.isFinite(val) || val < minRequired) {
      quantityInput.value = String(minRequired);
    }
  }

  /* =========================================
     HARD STOP for your custom +/- images
     (.quantity-minus / .quantity-plus)
     - Does NOT increment/decrement (prevents double steps)
     - Blocks going below min
     - Clamps after existing handler runs
     ========================================= */
  function getCurrentMinRequired() {
    const type = typeSelect?.value;
    return (type === 'Meterage') ? getMinRequiredForSelected() : 1;
  }

  function fireQtyChanged() {
    if (!quantityInput) return;
    quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
    quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  document.addEventListener(
    'click',
    (e) => {
      if (!quantityInput) return;

      const minusBtn = e.target.closest('.quantity-minus');
      const plusBtn  = e.target.closest('.quantity-plus');
      if (!minusBtn && !plusBtn) return;

      const minRequired = getCurrentMinRequired();
      const current = parseInt(quantityInput.value || '0', 10) || 0;

      // If user tries to go below min, block the click entirely
      if (minusBtn && current <= minRequired) {
        e.preventDefault();
        e.stopPropagation();
        quantityInput.value = String(minRequired);

        if (typeSelect?.value === 'Meterage' && minRequired > 1) {
          setMinNotice(`Minimum ${minRequired}m required`, true);
        }

        const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
        if (selected) updatePriceDisplayFromRadio(selected);

        fireQtyChanged();
        updateCartState();
        return;
      }

      // Otherwise let existing handler change the value, then clamp + refresh after it runs.
      setTimeout(() => {
        applyQtyMin();

        if (plusBtn) {
          const noticeEl = document.getElementById('min-notice');
          if (noticeEl) noticeEl.dataset.forced = 'false';
        }

        const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
        if (selected) updatePriceDisplayFromRadio(selected);

        fireQtyChanged();
        updateCartState();
      }, 0);
    },
    true
  );

  // On load, set starting qty appropriately (no-min → 1; min → 5/10; Sample → 1)
  applyQtyMin();

  // On blur, re-apply min if user leaves it invalid
  quantityInput?.addEventListener('blur', () => {
    applyQtyMin();

    const minRequired = getMinRequiredForSelected();
    const q = parseInt(quantityInput.value || '0', 10) || 0;
    if (q >= minRequired) {
      const noticeEl = document.getElementById('min-notice');
      if (noticeEl) noticeEl.dataset.forced = 'false';
      setMinNotice('', false);
    }

    updateCartState();
  });
}); // end DOMContentLoaded (main)

/* =========================================================
   Make entire swatch tile click select its radio (colour)
   ========================================================= */
document.querySelectorAll('.colour-swatch').forEach(swatch => {
  swatch.style.cursor = 'pointer';
  swatch.addEventListener('click', function (e) {
    if (e.target.tagName.toLowerCase() === 'input') return;
    const radio = swatch.querySelector('input[type="radio"][name="Colour"]');
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
});

/* =========================================================
   Legacy Quantity guard (compatible; main min logic in applyQtyMin())
   ========================================================= */
window.addEventListener('DOMContentLoaded', function () {
  const quantityInput = document.getElementById('quantity');
  if (!quantityInput) return;

  // Keep ≥1 while typing; final enforcement happens in applyQtyMin() on blur / type change
  if (!quantityInput.value || parseInt(quantityInput.value) < 1) {
    quantityInput.value = 1;
  }

  quantityInput.addEventListener('input', function () {
    const value = parseInt(quantityInput.value);
    if (value < 1 || isNaN(value)) {
      quantityInput.value = '';
    }
  });
});
