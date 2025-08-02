// Industry hovers
const allImages = document.querySelectorAll('[image]');

document.querySelectorAll('[industry]').forEach(link => {
  const industryValue = link.getAttribute('industry');

  link.addEventListener('mouseenter', () => {
    const activeImage = document.querySelector(`[image="${industryValue}"]`);

    allImages.forEach(imageEl => {
      if (imageEl === activeImage) {
        imageEl.style.zIndex = '10';
        imageEl.style.transform = 'scale(1)';
        imageEl.style.transition = 'transform 0.3s ease, z-index 0s';
      } else {
        imageEl.style.transform = 'scale(1.2)';
        imageEl.style.zIndex = '1';
      }
    });
  });

  link.addEventListener('mouseleave', () => {
    const activeImage = document.querySelector(`[image="${industryValue}"]`);

    if (activeImage) {
      setTimeout(() => {
        activeImage.style.transform = 'scale(1.2)';
        activeImage.style.transition = 'transform 0.3s ease, z-index 0s linear 0.3s';

        setTimeout(() => {
          activeImage.style.zIndex = '1';
        }, 300);
      }, 100);
    }
  });
});