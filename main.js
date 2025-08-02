$('[data-child]').each(function() {
var $this = $(this);
var uniqueId = $this.attr('data-child');
$('[data-parent="' + uniqueId + '"]').append($this);
});

//FAQ
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".faq-wrap .question").forEach(function (question) {
    question.addEventListener("click", function () {
      const currentAnswer = this.nextElementSibling;
      const isOpen = currentAnswer.classList.contains("open");

      // Close all answers and remove 'bold'
      document.querySelectorAll(".faq-wrap .answer").forEach(function (answer) {
        answer.classList.remove("open");
      });
      document.querySelectorAll(".faq-wrap .question").forEach(function (q) {
        q.classList.remove("bold");
      });

      // If not already open, open it
      if (!isOpen) {
        currentAnswer.classList.add("open");
        this.classList.add("bold");
      }
    });
  });
});

// Foxy cart
var FC = FC || {};
FC.onLoad = function () {
  FC.client
    .on('ready.done', () => {
      initQuickViewCart();

      if (!!document.querySelector(`[foxy-id="upsell-item"]`)) {
        initUpsell();
      }
    })
    .on('cart-submit.done', () => {
      $('[foxy-id="cart-trigger"]').trigger('click');
      initQuickViewCart();
    })
    .on('cart-update.done', initQuickViewCart)
    .on('cart-item-quantity-update.done', initQuickViewCart)
    .on('cart-item-remove.done', initQuickViewCart);
};

function initQuickViewCart() {
  const cartQtyElm = document.querySelector('[foxy-id="cart-quantity"]');
  if (!!cartQtyElm) {
    $(cartQtyElm).text(FC.json.item_count);
  }

  const cartSubtotalElm = document.querySelector('[foxy-id="cart-subtotal"]');
  if (!!cartSubtotalElm) {
    $(cartSubtotalElm).text(FC.json.total_item_price);
  }

  const cartEmptyElm = document.querySelector('[foxy-id="cart-empty"]');
  const cartHasItemsElm = document.querySelector('[foxy-id="cart-has-items"]');
  if (FC.json.item_count > 0) {
    $(cartEmptyElm)?.css('display', 'none');
    $(cartHasItemsElm)?.css('display', '');
  } else {
    $(cartEmptyElm)?.css('display', '');
    $(cartHasItemsElm)?.css('display', 'none');
  }

  const cartItemsElm = document.querySelector('[foxy-id="cart-items"]');
  const cartItemElm = document.querySelector('[foxy-id="cart-item"]');
  if (!!cartItemsElm && !!cartItemElm) {
    cartItemsElm.innerHTML = '';
    cartItemsElm.append(cartItemElm);
    cartItemElm.style.display = 'none';

    FC.json.items.forEach(
      ({
        name,
        price,
        price_each,
        quantity,
        weight_each,
        image,
        id,
        options,
      }) => {
        const newItem = cartItemElm.cloneNode(true);
        newItem.style.removeProperty('display');

        $(newItem).find('[foxy-id="cart-item-name"]')?.text(name);
        $(newItem).find('[foxy-id="cart-item-price"]')?.text(price_each);
        $(newItem).find('[foxy-id="cart-item-total"]')?.text(price);
        $(newItem).find('[foxy-id="cart-item-quantity"]')?.text(quantity);
        $(newItem).find('[foxy-id="cart-item-image"]')?.attr('src', image);

        if (weight_each !== 0) {
          $(newItem).find('[foxy-id="cart-item-weight"]')?.text(weight_each);
          $(newItem)
            .find('[foxy-id="cart-item-weight-unit"]')
            ?.text(FC.json.weight_uom);
        } else {
          $(newItem).find('[foxy-id="cart-item-weight"]')?.text('');
          $(newItem).find('[foxy-id="cart-item-weight-unit"]')?.text('');
        }

        const optionEl = newItem.querySelector('[foxy-id="cart-item-option"]');
        if (optionEl) {
          if (options.length > 0) {
            options.forEach((option) => {
              const newOptionEl = optionEl.cloneNode(true);

              $(newOptionEl).css('display', '');
              $(newOptionEl)
                .find('[foxy-id="cart-item-option-name"]')
                .text(option.name);
              $(newOptionEl)
                .find('[foxy-id="cart-item-option-value"]')
                .text(option.value);

              $(optionEl).after(newOptionEl);
            });
          }

          optionEl.remove();
        }

        const qtyInputElm = newItem.querySelector(
          '[foxy-id="cart-item-quantity-input"]'
        );
        if (!!qtyInputElm) {
          qtyInputElm.value = quantity;
          qtyInputElm.addEventListener('change', (event) =>
            updateQty(event.target.value)
          );
        }

        newItem
          .querySelector('[foxy-id="cart-item-remove"]')
          ?.addEventListener('click', () => updateQty(0));
        newItem
          .querySelector('[foxy-id="cart-item-plus"]')
          ?.addEventListener('click', () => updateQty(quantity + 1));
        newItem
          .querySelector('[foxy-id="cart-item-minus"]')
          ?.addEventListener('click', () => updateQty(quantity - 1));

        function updateQty(newQty) {
          FC.client
            .request(
              `https://${FC.settings.storedomain}/cart?cart=update&quantity=${newQty}&id=${id}`
            )
            .done(() => {
              initQuickViewCart();

              const upsellItem = document.querySelector(
                `[foxy-id="upsell-item-${id}"]`
              );
              if (newQty === 0 && !!upsellItem) {
                upsellItem.style.removeProperty('display');
                upsellItem.setAttribute('foxy-id', 'upsell-item');
              }
            });
        }

        cartItemsElm.appendChild(newItem);
      }
    );
  }
}

// Hide anything that needs it
document.addEventListener('DOMContentLoaded', () => {
  const invisibleElements = document.querySelectorAll('.w-condition-invisible');
  invisibleElements.forEach(el => el.remove());
});

// Convert url in cart to link
function convertUrlToLink(el) {
    const text = el.textContent.trim();
    if (text.startsWith('https://')) {
      const link = document.createElement('a');
      link.href = text;
      link.textContent = 'Artwork Link';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      el.textContent = ''; // Clear the existing text
      el.appendChild(link);
    }
  }

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) {
          if (node.classList.contains('cart-item-option-value')) {
            convertUrlToLink(node);
          }

          // Also check any children that might have the class
          const nested = node.querySelectorAll('.cart-item-option-value');
          nested.forEach(convertUrlToLink);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Optional: also convert any existing ones that were already on the page
  document.querySelectorAll('.cart-item-option-value').forEach(convertUrlToLink);


// Fabric scroller
document.addEventListener("DOMContentLoaded", () => {
  function getScrollAmount() {
    return window.innerWidth < 768 ? 300 : 600;
  }

 function updateButtonVisibility(container, leftBtn, rightBtn) {
  const maxScrollLeft = container.scrollWidth - container.clientWidth;

  if (!leftBtn || !rightBtn) return;

  const wrapper = container.closest(".w-tab-pane") || container.closest(".fabric-scroller");

  // Find gradients that are siblings of the container, not nested
  const gradientLeft = wrapper?.querySelector(".gradient-left");
  const gradientRight = wrapper?.querySelector(".gradient:not(.gradient-left)");

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    leftBtn.style.display = "none";
    rightBtn.style.display = "none";
    if (gradientLeft) gradientLeft.style.display = "none";
    if (gradientRight) gradientRight.style.display = "none";
    return;
  }

  // Show arrows
  leftBtn.style.display = "block";
  rightBtn.style.display = "block";

  // LEFT
  if (container.scrollLeft > 10) {
    leftBtn.style.opacity = "1";
    leftBtn.style.pointerEvents = "auto";
    if (gradientLeft) gradientLeft.style.display = "block";
  } else {
    leftBtn.style.opacity = "0";
    leftBtn.style.pointerEvents = "none";
    if (gradientLeft) gradientLeft.style.display = "none";
  }

  // RIGHT
  if (container.scrollLeft < maxScrollLeft - 10) {
    rightBtn.style.opacity = "1";
    rightBtn.style.pointerEvents = "auto";
    if (gradientRight) gradientRight.style.display = "block";
  } else {
    rightBtn.style.opacity = "0";
    rightBtn.style.pointerEvents = "none";
    if (gradientRight) gradientRight.style.display = "none";
  }
}


  function initScrollWrapper(wrapper) {
    const scrollContainer = wrapper.querySelector(".fabric-scroll-container");
    const scrollLeftBtn = wrapper.querySelector(".scroller-left");
    const scrollRightBtn = wrapper.querySelector(".scroller-right");

    if (!scrollContainer || !scrollLeftBtn || !scrollRightBtn) return;

    scrollContainer.addEventListener("scroll", () => {
      updateButtonVisibility(scrollContainer, scrollLeftBtn, scrollRightBtn);
    });

    window.addEventListener("resize", () => {
      updateButtonVisibility(scrollContainer, scrollLeftBtn, scrollRightBtn);
    });

    setTimeout(() => {
      updateButtonVisibility(scrollContainer, scrollLeftBtn, scrollRightBtn);
    }, 400);
  }

  function initAllScrollers() {
    const tabPanes = document.querySelectorAll(".w-tab-pane");
    tabPanes.forEach(pane => initScrollWrapper(pane));

    const standaloneScrollers = document.querySelectorAll(".fabric-scroller");
    standaloneScrollers.forEach(scroller => initScrollWrapper(scroller));
  }

  const observer = new MutationObserver(() => {
    initAllScrollers();
  });

  const tabContainer = document.querySelector(".tab-container");
  if (tabContainer) {
    observer.observe(tabContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  window.addEventListener("load", () => {
    initAllScrollers();
  });


  document.addEventListener("click", (e) => {
    const leftArrow = e.target.closest(".scroller-left");
    const rightArrow = e.target.closest(".scroller-right");

    if (leftArrow || rightArrow) {
      const wrapper = e.target.closest(".w-tab-pane") || e.target.closest(".fabric-scroller");
      const scrollContainer = wrapper?.querySelector(".fabric-scroll-container");
      const scrollLeftBtn = wrapper?.querySelector(".scroller-left");
      const scrollRightBtn = wrapper?.querySelector(".scroller-right");

      if (!scrollContainer || window.innerWidth < 768) return;

      scrollContainer.scrollBy({
        left: rightArrow ? getScrollAmount() : -getScrollAmount(),
        behavior: "smooth"
      });

      setTimeout(() => {
        updateButtonVisibility(scrollContainer, scrollLeftBtn, scrollRightBtn);
      }, 300);
    }
  });
});



  // Handle all quantity plus/minus buttons
document.querySelectorAll('.quantity-input-wrap').forEach(wrapper => {
  const input = wrapper.querySelector('input[type="number"]');
  const plus = wrapper.querySelector('.quantity-plus');
  const minus = wrapper.querySelector('.quantity-minus');

  if (!input || !plus || !minus) return;

  plus.addEventListener('click', () => {
    let current = parseInt(input.value || '1', 10);
    input.value = current + 1;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  minus.addEventListener('click', () => {
    let current = parseInt(input.value || '1', 10);
    if (current > 1) {
      input.value = current - 1;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
});


// Tween max letters in menu
const letterWrapClass = 'letter-wrap';
const letterWrapElements = document.getElementsByClassName(letterWrapClass);
[...letterWrapElements].forEach(el => {
  letterWrap(el, letterWrapClass);
  letterAnimation(el, letterWrapClass);
});
function letterWrap(el, cls) {
  const words = el.textContent.split(' ');
  const letters = []; 
  cls = cls || 'letter-wrap'  
  words.forEach(word => {
    let html = '';
    for (var letter in word) {
      html += `
        <span class="${cls}__char">
          <span class="${cls}__char-inner" data-letter="${word[letter]}">
            ${word[letter]}
          </span>
        </span>
      `;
    };   
    let wrappedWords = `<span class="${cls}__word">${html}</span>`;
    letters.push(wrappedWords);
  });
  return el.innerHTML = letters.join(' ');
}
function letterAnimation(el, cls) {
  const tl = new TimelineMax({ paused: true });
  const characters = el.querySelectorAll(`.${cls}__char-inner`);
  const duration = el.hasAttribute('data-duration') ? el.dataset.duration : 0.3;
  const stagger = el.hasAttribute('data-stagger') ? el.dataset.stagger : 0.025; 
  el.animation = tl.staggerTo(characters, duration, {
    y: '-100%',
    delay: 0,
    ease: Power2.easeOut
  }, stagger);      
  el.addEventListener('mouseenter', (event) => event.currentTarget.animation.play());
  el.addEventListener('mouseout', (event) => el.animation.pause(0)());
}