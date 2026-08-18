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

// Liquid 3D Perspective Carousel animation
function update3DCarousel() {
  if (!propertiesSection) return;

  // On small mobile screens, disable 3D calculations for performance
  if (window.innerWidth <= 768) {
    const track = document.querySelector('.carousel-track');
    if (track) track.style.transform = '';
    const cards = document.querySelectorAll('.property-card-3d');
    cards.forEach(card => {
      card.style.transform = '';
      const img = card.querySelector('.card-image-wrapper img');
      if (img) img.style.transform = '';
      const overlay = card.querySelector('.card-overlay');
      if (overlay) overlay.style.opacity = '';
    });
    return;
  }

  const rect = propertiesSection.getBoundingClientRect();
  const scrollHeight = rect.height - window.innerHeight;
  const progress = Math.min(Math.max(-rect.top / scrollHeight, 0), 1);
  
  const track = document.querySelector('.carousel-track');
  const cards = document.querySelectorAll('.property-card-3d');
  
  if (track) {
    const trackWidth = track.scrollWidth;
    const viewportWidth = window.innerWidth;
    const maxTranslate = trackWidth - viewportWidth + 100;
    
    // Target translate position
    targetTrackTranslate = -progress * maxTranslate;
    
    // Lerp horizontal shift
    const lerpFactor = 0.08;
    currentTrackTranslate += (targetTrackTranslate - currentTrackTranslate) * lerpFactor;
    track.style.transform = `translateX(${currentTrackTranslate}px) translateZ(0)`;
    
    // Apply 3D perspective curves
    cards.forEach(card => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const screenCenter = viewportWidth / 2;
      const distanceFromCenter = cardCenter - screenCenter;
      
      const maxDistance = viewportWidth / 1.5;
      const maxRotation = 35; // degrees
      
      let rotateY = (distanceFromCenter / maxDistance) * maxRotation;
      rotateY = Math.min(Math.max(rotateY, -maxRotation), maxRotation);
      
      let translateZ = -Math.abs(distanceFromCenter / maxDistance) * 150;
      translateZ = Math.min(Math.max(translateZ, -180), 0);
      
      let scale = 1 - Math.abs(distanceFromCenter / maxDistance) * 0.12;
      scale = Math.min(Math.max(scale, 0.88), 1);
      
      // Light overlay shading for depth
      const overlay = card.querySelector('.card-overlay');
      if (overlay) {
        const distanceFraction = Math.min(Math.abs(distanceFromCenter) / (cardRect.width * 1.5), 1);
        overlay.style.opacity = distanceFraction * 0.65;
      }
      
      card.style.transform = `rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
      
      // Image scroll parallax
      const img = card.querySelector('.card-image-wrapper img');
      if (img) {
        img.style.transform = `translateX(${-distanceFromCenter * 0.08}px) scale(1.1)`;
      }
    });
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

  // Update carousel movement in the same RAF loop for performance
  update3DCarousel();

  requestAnimationFrame(animate);
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
  updateScrollTarget();
  updateActiveNavLink();
}, { passive: true });

window.addEventListener('resize', resizeCanvas);

// Init
resizeCanvas();
preloadFrames();
requestAnimationFrame(animate);
