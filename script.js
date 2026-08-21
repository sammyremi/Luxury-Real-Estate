const TOTAL_FRAMES = 192;
const FRAME_DIR = './Lux';
const canvas = document.getElementById('sequenceCanvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loaderText');
const progressBar = document.getElementById('progressBar');

const images = [];
let loadedCount = 0;

// Animation state
let targetFrame = 0;
let currentFrame = 0;

// Carousel Lerp state
const propertiesSection = document.getElementById('properties');
let currentTrackTranslate = 0;
let targetTrackTranslate = 0;
let lastScrollTime = Date.now();
let autoPlayOffset = 0;
const autoPlaySpeed = 1.2; // Faster drift speed in pixels per frame
const cardWidth = 220;
const cardGap = 20;
const originalCardsCount = 5;
const loopWidth = originalCardsCount * (cardWidth + cardGap); // 1200px

let isHovered = false;
let hoveredCardIndex = null;

// Format frame path: Lux/frame_0001.webp ... frame_0192.webp
function getFramePath(index) {
  const paddedNumber = String(index + 1).padStart(4, '0');
  return `${FRAME_DIR}/frame_${paddedNumber}.webp`;
}

// Draw frame onto canvas with cover aspect-ratio scaling
function renderFrame(index) {
  const img = images[index];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Calculate object-fit: cover
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;
  const imgRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth, drawHeight, offsetX, offsetY;

  if (canvasRatio > imgRatio) {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  } else {
    drawWidth = canvasHeight * imgRatio;
    drawHeight = canvasHeight;
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// Set canvas dimensions respecting Device Pixel Ratio for crisp render
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  renderFrame(Math.round(currentFrame));
}

// Calculate frame target based on total document scroll position
function updateScrollTarget() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  
  if (maxScroll <= 0) return;

  const scrollFraction = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
  targetFrame = scrollFraction * (TOTAL_FRAMES - 1);
}

// Smooth active link highlight on scroll
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

function updateActiveNavLink() {
  const scrollPosition = window.scrollY + window.innerHeight / 3;
  
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    
    if (scrollPosition >= top && scrollPosition < top + height) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });
    }
  });
}

// Liquid 3D Perspective Carousel animation (with centering & zoom on hover)
function update3DCarousel() {
  if (!propertiesSection) return;

  // On small mobile screens, reset track translation and use default mobile overflow scroll
  if (window.innerWidth <= 768) {
    const track = document.querySelector('.carousel-track');
    if (track) track.style.transform = '';
    return;
  }

  const track = document.querySelector('.carousel-track');
  const container = document.querySelector('.carousel-container-3d');
  
  if (track) {
    targetTrackTranslate = autoPlayOffset;
    
    // Lerp horizontal shift
    const lerpFactor = 0.08;
    currentTrackTranslate += (targetTrackTranslate - currentTrackTranslate) * lerpFactor;
    
    // Wrap the current track translation for rendering to create an infinite loop
    const displayTranslate = ((currentTrackTranslate % loopWidth) - loopWidth) % loopWidth;
    track.style.transform = `translateX(${displayTranslate}px) translateZ(0)`;
  }
}

// Continuous Animation Loop with Lerp Smoothing
function animate() {
  const lerpFactor = 0.08;
  const diff = targetFrame - currentFrame;

  if (Math.abs(diff) > 0.01) {
    currentFrame += diff * lerpFactor;
    renderFrame(Math.round(currentFrame));
  } else {
    currentFrame = targetFrame;
    renderFrame(Math.round(currentFrame));
  }

  // Update autoPlayOffset continuously to slide cards from right to left (unless hovered)
  if (!isHovered) {
    autoPlayOffset -= autoPlaySpeed;
  }

  // Update carousel movement in the same RAF loop for performance
  update3DCarousel();

  requestAnimationFrame(animate);
}

let hoverTimer = null;

// Setup Property Carousel Hover Centering & Next/Prev Controls
function setupCarouselInteractions() {
  const cards = document.querySelectorAll('.property-card-3d');
  const track = document.querySelector('.carousel-track');
  const prevBtn = document.getElementById('prevPropertyBtn');
  const nextBtn = document.getElementById('nextPropertyBtn');

  if (cards.length > 0) {
    cards.forEach((card, index) => {
      const imageWrapper = card.querySelector('.card-image-wrapper');
      const targetElement = imageWrapper || card;

      targetElement.addEventListener('mouseenter', () => {
        if (hoverTimer) clearTimeout(hoverTimer);

        // Require cursor to rest on property image for 0.5 seconds (500ms) before zooming
        hoverTimer = setTimeout(() => {
          isHovered = true;
          hoveredCardIndex = index;
          cards.forEach(c => c.classList.remove('focused-card'));
          card.classList.add('focused-card');
          if (track) track.classList.add('has-focused');
        }, 500);
      });

      targetElement.addEventListener('mouseleave', () => {
        // Cancel timer if cursor leaves before 1.5 seconds
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }

        // If card was focused, reset focus state & resume scroll
        if (hoveredCardIndex === index) {
          isHovered = false;
          hoveredCardIndex = null;
          card.classList.remove('focused-card');
          if (track) track.classList.remove('has-focused');
          autoPlayOffset = currentTrackTranslate; // Resume smooth scroll from current position
        }
      });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      if (isHovered && hoveredCardIndex !== null && cards.length > 0) {
        cards[hoveredCardIndex].classList.remove('focused-card');
        hoveredCardIndex = (hoveredCardIndex + 1) % cards.length;
        cards[hoveredCardIndex].classList.add('focused-card');
      } else {
        autoPlayOffset -= (cardWidth + cardGap);
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      if (isHovered && hoveredCardIndex !== null && cards.length > 0) {
        cards[hoveredCardIndex].classList.remove('focused-card');
        hoveredCardIndex = (hoveredCardIndex - 1 + cards.length) % cards.length;
        cards[hoveredCardIndex].classList.add('focused-card');
      } else {
        autoPlayOffset += (cardWidth + cardGap);
      }
    });
  }
}

// Preload images
function preloadFrames() {
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    img.onload = () => {
      loadedCount++;
      const progress = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
      if (loaderText) loaderText.textContent = `${progress}%`;
      if (progressBar) progressBar.style.width = `${progress}%`;

      // Render first frame as soon as it's ready
      if (i === 0) {
        renderFrame(0);
      }

      if (loadedCount === TOTAL_FRAMES) {
        onAllLoaded();
      }
    };
    img.onerror = () => {
      loadedCount++;
      if (loadedCount === TOTAL_FRAMES) {
        onAllLoaded();
      }
    };
    images.push(img);
  }
}

function onAllLoaded() {
  if (loader) {
    loader.classList.add('hidden');
  }
  updateScrollTarget();
  renderFrame(Math.round(currentFrame));
}

// Listeners
window.addEventListener('scroll', () => {
  lastScrollTime = Date.now();
  updateScrollTarget();
  updateActiveNavLink();
}, { passive: true });

window.addEventListener('resize', resizeCanvas);

// Setup Handpicked Properties Carousel Arrows
function setupHandpickedControls() {
  const wrapper = document.querySelector('.handpicked-grid-wrapper');
  const prevBtn = document.getElementById('handpickedPrevBtn');
  const nextBtn = document.getElementById('handpickedNextBtn');

  if (!wrapper || !prevBtn || !nextBtn) return;

  nextBtn.addEventListener('click', () => {
    wrapper.scrollBy({ left: 360, behavior: 'smooth' });
  });

  prevBtn.addEventListener('click', () => {
    wrapper.scrollBy({ left: -360, behavior: 'smooth' });
  });
}

// Setup Heart Button Toggle
function setupHeartButtons() {
  document.querySelectorAll('.heart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');
      const svg = btn.querySelector('svg');
      if (btn.classList.contains('active')) {
        btn.style.background = '#ffffff';
        btn.style.color = '#ef4444';
        if (svg) {
          svg.style.fill = '#ef4444';
          svg.style.stroke = '#ef4444';
        }
      } else {
        btn.style.background = 'rgba(255, 255, 255, 0.85)';
        btn.style.color = '#000000';
        if (svg) {
          svg.style.fill = 'none';
          svg.style.stroke = 'currentColor';
        }
      }
    });
  });
}

// Init
resizeCanvas();
preloadFrames();
setupCarouselInteractions();
setupHandpickedControls();
setupHeartButtons();
requestAnimationFrame(animate);
