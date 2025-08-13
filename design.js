document.getElementById('scaleSlider').addEventListener('input', function () {
  let scaleValue = this.value;

  // Convert: 100 → 50%, 200 → 100%
  let backgroundScale = (scaleValue - 100) / 2 + 50;

  // Update scale output text with %
  const output = document.getElementById('scaleOutput');
  output.textContent = `${scaleValue}%`;

  // Move output to match thumb
  const slider = this;
  const sliderWidth = slider.offsetWidth;
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const percent = (scaleValue - min) / (max - min);

  // Calculate exact thumb center offset
  const thumbWidth = 24; // Adjust this to match your styled thumb width
  const offset = percent * (sliderWidth - thumbWidth) + thumbWidth / 2;

  output.style.left = `${offset}px`;

  // Apply background size
  document.querySelectorAll('.mask, .small-slide').forEach(function (el) {
    el.style.backgroundSize = `${backgroundScale}%`;
    el.style.backgroundRepeat = 'repeat';
    el.style.backgroundPosition = 'center';
  });
});

// Handle thumbnail click event to change viewer
document.querySelectorAll('.change-viewer-thumb').forEach(function(thumb) {
  thumb.addEventListener('click', function() {
    let newimg = this.getAttribute('src');

    document.querySelectorAll('.product-viewer-mini').forEach(function(mini) {
      mini.style.backgroundImage = `url('${newimg}')`;
    });

    document.querySelectorAll('.product-viewer-window').forEach(function(window) {
      window.style.backgroundImage = `url('${newimg}')`;
    });
  });
});

// Display colour names
document.querySelectorAll('.product-viewer-thumb').forEach(function(thumb) {
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

// Thumbnails for slider
Webflow.push(function() {
  $('[data-thumbs-for]').on('click', '.w-slide', function() {
    var target = $($(this).parents('.w-slider').attr('data-thumbs-for'));
    if (target.length == 0) return;

    target.find('.w-slider-nav').children().eq($(this).index()).trigger('tap');
  });
});


// Fabric Selection Script with Display Output + UI Toggle + Session Clear

window.addEventListener('DOMContentLoaded', function () {
  const allFabricCards = document.querySelectorAll('.design-fabric');
  const radios = document.querySelectorAll('input[type="radio"][name="fabric"]');
  const quantityInput = document.getElementById('quantity');
  const typeRadios = document.querySelectorAll('input[name="Type"]');
  const designAddCart = document.getElementById('designAddCart');
  const largeButtonArrow = document.querySelector('.large-button-arrow');
  const largeButtonChange = document.querySelector('.large-button-change');

  function updateSelectedFabricDisplay(name) {
    const displayTarget = document.getElementById('selectedFabric');
    const fabricName = name || 'No fabric selected';
    if (displayTarget) displayTarget.textContent = fabricName;
  }

  function toggleButtonsBasedOnSession() {
    const hasSelected = !!sessionStorage.getItem('selectedFabric');
    if (largeButtonChange) largeButtonChange.style.display = hasSelected ? 'block' : 'none';
  }

  function formatPrice(value) {
    if (!value || isNaN(value)) return value;
    return `$${parseFloat(value).toFixed(2)}`;
  }

  function isEmpty(value) {
    return !value || value.trim() === '' || value === 'NaN';
  }

  function updatePriceDisplayFromRadio(radio) {
    const type = document.querySelector('input[name="Type"]:checked')?.value;
    const quantity = parseInt(quantityInput?.value || '1', 10);
    const priceElement = document.getElementById('price');
    const uomElement = document.getElementById('price-uom');
    const hiddenPriceField = document.querySelector('input[name="price"]');
    if (!type || !priceElement || !uomElement) return;

    let price = '';
    let showUom = true;

    if (type === 'Swatch') {
      price = radio.getAttribute('data-sample');
      uomElement.textContent = 'per swatch';
    } else if (type === 'Meterage') {
      const tier1 = radio.getAttribute('data-tier1');
      const tier2 = radio.getAttribute('data-tier2');
      const tier3 = radio.getAttribute('data-tier3');

      if (isEmpty(tier1) && quantity < 5) {
        price = 'Minimum 5m required';
        showUom = false;
      } else {
        if (quantity >= 6 && quantity <= 50 && !isEmpty(tier2)) {
          price = tier2;
        } else if (quantity > 50 && !isEmpty(tier3)) {
          price = tier3;
        } else {
          price = tier1;
        }
        uomElement.textContent = 'per meter';
      }
    }

    priceElement.textContent = price.includes('Minimum') ? price : formatPrice(price);
    uomElement.style.display = showUom ? 'inline' : 'none';
    if (hiddenPriceField) {
      hiddenPriceField.value = price.includes('Minimum') ? '' : parseFloat(price).toFixed(2);
    }
  }

  function updateHiddenInputsFromRadio(radio) {
    if (!radio) return;
    const fabricName = radio.getAttribute('data-fabric-name') || '';
    const fabricWidth = radio.getAttribute('data-fabric-width') || '';
    const fabricGSM = radio.getAttribute('data-gsm') || '';

    sessionStorage.setItem('selectedFabric', fabricName);

    const nameField = document.querySelector('input[name="Fabric"]');
    const priceField = document.querySelector('input[name="price"]');
    const widthField = document.querySelector('input[name="fabric-width"]');
    const weightField = document.getElementById('packageWeight');
    if (nameField) nameField.value = fabricName;
    if (priceField) priceField.value = '';
    if (widthField) widthField.value = fabricWidth;
    if (weightField) {
      weightField.setAttribute('data-width', fabricWidth);
      weightField.setAttribute('data-gsm', fabricGSM);
    }

    const selectedColourRadio = document.querySelector('input[type="radio"][name="Colour"]:checked');
    const colourField = document.querySelector('input[type="hidden"][name="Colour"]');
    const imageField = document.querySelector('input[name="image"]');
    const primaryImage = document.getElementById('primary-image');

    if (selectedColourRadio) {
      if (colourField) colourField.value = selectedColourRadio.value;
      const imageUrl = selectedColourRadio.getAttribute('data-image');
      if (imageUrl) {
        if (imageField) imageField.value = imageUrl;
        if (primaryImage) primaryImage.src = imageUrl;
      }
    }

    updatePriceDisplayFromRadio(radio);
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

  allFabricCards.forEach(wrapper => {
  wrapper.style.cursor = 'pointer';
  wrapper.addEventListener('click', function (e) {
    if (e.target.closest('.design-fabric-view-button')) return;
    const radio = wrapper.querySelector('input[type="radio"]');
    if (radio) {
      radios.forEach(r => r.checked = false);
      radio.checked = true;
      updateHiddenInputsFromRadio(radio);
      updateSelectedFabricDisplay(radio.getAttribute('data-fabric-name') || radio.value);
      toggleButtonsBasedOnSession();

      // Hide border + selection for all cards
      allFabricCards.forEach(card => {
        card.style.border = 'none';
        card.classList.remove('fabric-selected');
        const selectionEl = card.querySelector('.selection');
        if (selectionEl) selectionEl.style.display = 'none';
      });

      // Show border + selection for the clicked card
      wrapper.style.border = '1px solid black';
      wrapper.classList.add('fabric-selected');
      const selectionEl = wrapper.querySelector('.selection');
      if (selectionEl) selectionEl.style.display = 'block';
    }
  });
});


  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateHiddenInputsFromRadio(radio);
      updateSelectedFabricDisplay(radio.getAttribute('data-fabric-name') || radio.value);
      toggleButtonsBasedOnSession();
    });
  });

  if (quantityInput) {
    quantityInput.addEventListener('input', () => {
      calculatePackageWeight();
      const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
      if (selected) updatePriceDisplayFromRadio(selected);
    });
  }

  typeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const selected = document.querySelector('input[type="radio"][name="fabric"]:checked');
      if (selected) updatePriceDisplayFromRadio(selected);
    });
  });

  const colourRadios = document.querySelectorAll('input[type="radio"][name="Colour"]');
  const imageField = document.querySelector('input[name="image"]');
  const primaryImage = document.getElementById('primary-image');

  colourRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const imageUrl = radio.getAttribute('data-image');
      const colourField = document.querySelector('input[type="hidden"][name="Colour"]');
      if (colourField) colourField.value = radio.value;
      if (imageUrl) {
        if (imageField) imageField.value = imageUrl;
        if (primaryImage) primaryImage.src = imageUrl;
      }
      document.querySelectorAll('.colour-swatch').forEach(swatch => {
        swatch.style.border = 'none';
      });
      const selectedSwatch = radio.closest('.colour-swatch');
      if (selectedSwatch) selectedSwatch.style.border = '1px solid black';
    });
  });

  const selectedFabric = sessionStorage.getItem('selectedFabric');
  let hasRestored = false;

  if (selectedFabric) {
    radios.forEach(function (radio) {
      const radioName = radio.getAttribute('data-fabric-name')?.trim().toLowerCase();
      const storedName = selectedFabric.trim().toLowerCase();
      if (radioName === storedName) {
        radio.checked = true;
        updateHiddenInputsFromRadio(radio);
        updateSelectedFabricDisplay(selectedFabric);
        toggleButtonsBasedOnSession();
        allFabricCards.forEach(fabric => {
          fabric.style.border = 'none';
          fabric.classList.remove('fabric-selected');
        });
        const selectedWrapper = radio.closest('.design-fabric');
        if (selectedWrapper) {
          selectedWrapper.style.border = '1px solid black';
          selectedWrapper.classList.add('fabric-selected');
        }
        const tabPane = radio.closest('.w-tab-pane');
        if (tabPane) {
          const tabName = tabPane.getAttribute('data-w-tab');
          const tabComponent = tabPane.closest('.w-tabs');
          if (tabName && tabComponent) {
            const allTabLinks = tabComponent.querySelectorAll('.w-tab-link');
            const allTabPanes = tabComponent.querySelectorAll('.w-tab-pane');
            allTabLinks.forEach(link => link.classList.remove('w--current'));
            allTabPanes.forEach(pane => pane.classList.remove('w--tab-active'));
            const matchingLink = tabComponent.querySelector(`.w-tab-link[data-w-tab="${tabName}"]`);
            const matchingPane = tabComponent.querySelector(`.w-tab-pane[data-w-tab="${tabName}"]`);
            if (matchingLink) matchingLink.classList.add('w--current');
            if (matchingPane) matchingPane.classList.add('w--tab-active');
          }
        }
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

  const initiallySelected = document.querySelector('input[type="radio"][name="fabric"]:checked');
  if (initiallySelected) updateHiddenInputsFromRadio(initiallySelected);

  if (designAddCart) {
    designAddCart.addEventListener('click', () => {
      sessionStorage.removeItem('selectedFabric');
      toggleButtonsBasedOnSession();
    });
  }
});

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

// Quantity field 
  window.addEventListener('DOMContentLoaded', function () {
    const quantityInput = document.getElementById('quantity');

    // Set initial value to 1 if empty or invalid
    if (!quantityInput.value || parseInt(quantityInput.value) < 1) {
      quantityInput.value = 1;
    }

    // On blur, reset to 1 if empty or invalid
    quantityInput.addEventListener('blur', function () {
      if (!quantityInput.value || parseInt(quantityInput.value) < 1) {
        quantityInput.value = 1;
      }
    });

    // Optional: Prevent typing zero or negative values
    quantityInput.addEventListener('input', function () {
      const value = parseInt(quantityInput.value);
      if (value < 1 || isNaN(value)) {
        quantityInput.value = '';
      }
    });
  });