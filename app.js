// ==========================================================================
// 3D PERLIN NOISE GENERATOR FOR PROCEDURAL TEXTURES
// ==========================================================================
class PerlinNoise3D {
  constructor() {
    this.p = new Uint8Array(512);
    // Standard Perlin permutation vector
    const p = [151,160,137,91,90,15,
      131,13,201,95,96,53,194,233, 7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
      88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
      77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
      102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
      135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
      5,202,38,147,118,126,255,82,85,212,207,206, 59,227,47,16,58,17,182,189,28,42,
      223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
      129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
      251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
      49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
      138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    for (let i = 0; i < 256; i++) {
      this.p[i] = p[i];
      this.p[256 + i] = p[i];
    }
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;
    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
                                                   this.grad(this.p[BA], x - 1, y, z)),
                                   this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                                                   this.grad(this.p[BB], x - 1, y - 1, z))),
                   this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                                                   this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                                   this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                                                   this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
  }
  fbm(x, y, z, octaves = 5) {
    let value = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * (this.noise(x * frequency, y * frequency, z * frequency) * 0.5 + 0.5);
      maxVal += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value / maxVal;
  }
}

const noiseGen = new PerlinNoise3D();

// ==========================================================================
// TEXTURE GENERATION ON HEAP-CANVAS
// ==========================================================================
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  
  for (let y = 0; y < canvas.height; y++) {
    const phi = (y / canvas.height) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    
    for (let x = 0; x < canvas.width; x++) {
      const theta = (x / canvas.width) * 2 * Math.PI;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      
      const nx = cosTheta * sinPhi;
      const ny = sinTheta * sinPhi;
      const nz = cosPhi;
      
      // Evaluate noise at 3D coordinate (removes wrap seams)
      const h = noiseGen.fbm(nx * 3.5, ny * 3.5, nz * 3.5, 5);
      
      let r, g, b;
      
      if (h > 0.46) {
        // LAND (Mossy & Lush Green)
        if (h < 0.49) {
          // Coastlines / Sand
          const t = (h - 0.46) / 0.03;
          r = Math.floor(190 * (1 - t) + 16 * t);
          g = Math.floor(175 * (1 - t) + 185 * t);
          b = Math.floor(125 * (1 - t) + 129 * t);
        } else if (h < 0.65) {
          // Main Forests
          const t = (h - 0.49) / 0.16;
          r = Math.floor(16 * (1 - t) + 5 * t);
          g = Math.floor(185 * (1 - t) + 150 * t);
          b = Math.floor(129 * (1 - t) + 95 * t);
        } else {
          // Dark Highlands / Mountains
          const t = Math.min((h - 0.65) / 0.2, 1.0);
          r = Math.floor(5 * (1 - t) + 21 * t);
          g = Math.floor(150 * (1 - t) + 128 * t);
          b = Math.floor(95 * (1 - t) + 61 * t);
        }
      } else {
        // WATER (Vibrant turquoise to deep blue)
        if (h > 0.42) {
          const t = (h - 0.42) / 0.04;
          r = Math.floor(13 * (1 - t) + 59 * t);
          g = Math.floor(148 * (1 - t) + 130 * t);
          b = Math.floor(136 * (1 - t) + 246 * t);
        } else {
          const t = Math.min((0.42 - h) / 0.32, 1.0);
          r = Math.floor(13 * (1 - t) + 15 * t);
          g = Math.floor(148 * (1 - t) + 23 * t);
          b = Math.floor(136 * (1 - t) + 76 * t);
        }
      }
      
      const idx = (y * canvas.width + x) * 4;
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

function createCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  
  for (let y = 0; y < canvas.height; y++) {
    const phi = (y / canvas.height) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    
    for (let x = 0; x < canvas.width; x++) {
      const theta = (x / canvas.width) * 2 * Math.PI;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      
      const nx = cosTheta * sinPhi;
      const ny = sinTheta * sinPhi;
      const nz = cosPhi;
      
      // High-frequency noise for clouds
      const h = noiseGen.fbm(nx * 5.5, ny * 5.5, nz * 5.5, 4);
      
      let opacity = 0;
      if (h > 0.47) {
        opacity = Math.floor(((h - 0.47) / 0.3) * 255);
        if (opacity > 220) opacity = 220;
      }
      
      const idx = (y * canvas.width + x) * 4;
      imgData.data[idx] = 255;      // Red
      imgData.data[idx + 1] = 255;  // Green
      imgData.data[idx + 2] = 255;  // Blue
      imgData.data[idx + 3] = opacity; // Alpha
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

// ==========================================================================
// DOM ELEMENT REFERENCES
// ==========================================================================
const wrapper = document.querySelector('.globe-canvas-wrapper');
const canvasEl = document.getElementById('globe-canvas');
const container = document.querySelector('.hero-globe-container');
const badges = document.querySelectorAll('.orbit-badge');
const tooltip = document.getElementById('badge-tooltip');
const tooltipImg = document.getElementById('tooltip-img');
const tooltipTitle = document.getElementById('tooltip-title');
const tooltipDesc = document.getElementById('tooltip-desc');

// ==========================================================================
// THREE.JS SCENE CONFIGURATION
// ==========================================================================
let scene, camera, renderer, earth, clouds;

function resizeRenderer() {
  if (!renderer || !camera || !wrapper) return;
  const rect = wrapper.getBoundingClientRect();
  const width = rect.width || 330;
  const height = rect.height || 330;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function initThree() {
  // Scene Setup
  scene = new THREE.Scene();

  // Camera Setup
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 5;

  // Renderer Setup
  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  resizeRenderer(); // Initialize size dynamically based on wrapper client bounds

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.25);
  sunLight.position.set(5, 3, 5); // Front right light
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0xd1fae5, 0.65);
  rimLight.position.set(-5, -2, -5); // Back left green glow light
  scene.add(rimLight);

  // Create procedural spheres
  const earthGeometry = new THREE.SphereGeometry(1.6, 64, 64);
  const earthTexture = createEarthTexture();
  const earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.8,
    metalness: 0.1
  });
  earth = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earth);

  // Clouds sphere (slightly larger)
  const cloudGeometry = new THREE.SphereGeometry(1.62, 64, 64);
  const cloudTexture = createCloudTexture();
  const cloudMaterial = new THREE.MeshStandardMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.95
  });
  clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
  scene.add(clouds);

  // Initial rotations
  earth.rotation.x = 0.25;
  clouds.rotation.x = 0.25;
  
  // Start loop
  animate();
}

// Interactivity parameters
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let autoRotateSpeed = 0.002;
let targetRotationY = null;

function animate() {
  requestAnimationFrame(animate);

  // If the wrapper or its container is hidden via CSS (display: none), pause rendering to save mobile CPU/battery!
  if (wrapper && wrapper.offsetParent === null) {
    return;
  }

  if (isDragging) {
    // Rotation updated by drag handler
  } else {
    // Automatic rotation
    earth.rotation.y += autoRotateSpeed;
    clouds.rotation.y += autoRotateSpeed * 1.25; // Clouds rotate slightly faster for parallax depth

    // Smoothly interpolate to target rotation if a badge is hovered
    if (targetRotationY !== null) {
      const diff = targetRotationY - earth.rotation.y;
      earth.rotation.y += diff * 0.05;
      clouds.rotation.y += diff * 0.05;
      
      if (Math.abs(diff) < 0.01) {
        targetRotationY = null;
      }
    }
  }

  renderer.render(scene, camera);
}

// ==========================================================================
// DRAG HANDLERS (DRAG TO ROTATE GLOBE)
// ==========================================================================
// Drag handlers wrapper listener references (declared globally at top)

wrapper.addEventListener('mousedown', e => {
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };
  targetRotationY = null; // Cancel any active hover centering
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;

  const deltaX = e.clientX - previousMousePosition.x;
  const deltaY = e.clientY - previousMousePosition.y;

  earth.rotation.y += deltaX * 0.006;
  earth.rotation.x += deltaY * 0.006;

  clouds.rotation.y += deltaX * 0.006;
  clouds.rotation.x += deltaY * 0.006;

  earth.rotation.x = Math.max(-0.6, Math.min(0.6, earth.rotation.x));
  clouds.rotation.x = Math.max(-0.6, Math.min(0.6, clouds.rotation.x));

  previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Mobile Touch Support
wrapper.addEventListener('touchstart', e => {
  isDragging = true;
  previousMousePosition = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  };
  targetRotationY = null;
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (!isDragging) return;

  const deltaX = e.touches[0].clientX - previousMousePosition.x;
  const deltaY = e.touches[0].clientY - previousMousePosition.y;

  earth.rotation.y += deltaX * 0.008;
  earth.rotation.x += deltaY * 0.008;

  clouds.rotation.y += deltaX * 0.008;
  clouds.rotation.x += deltaY * 0.008;

  earth.rotation.x = Math.max(-0.6, Math.min(0.6, earth.rotation.x));
  clouds.rotation.x = Math.max(-0.6, Math.min(0.6, clouds.rotation.x));

  previousMousePosition = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  };
}, { passive: true });

window.addEventListener('touchend', () => {
  isDragging = false;
});

// BADGE POSITIONS (TRIGONOMETRY BASED RESPONSIVE PLACEMENT)
// ==========================================================================
// Variables container, badges, tooltip, etc. are defined at the top of the file

function positionBadges() {
  if (!container || !wrapper) return;
  const containerRect = container.getBoundingClientRect();
  const globeRect = wrapper.getBoundingClientRect();
  
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;
  
  const isSmallMobile = window.innerWidth <= 480;
  
  // Mathematically calculate radius relative to the ACTUAL globe wrapper bounds so badges stay outside!
  const radius = (globeRect.width / 2) + (isSmallMobile ? 22 : 30);
  const offset = isSmallMobile ? 18 : 24; // offset for 36px vs 48px badge icons

  badges.forEach(badge => {
    const angleDeg = parseFloat(badge.dataset.angle);
    const angleRad = ((angleDeg - 15) * Math.PI) / 180;
    
    const x = centerX + radius * Math.cos(angleRad) - offset; 
    const y = centerY + radius * Math.sin(angleRad) - offset;
    
    badge.style.left = `${x}px`;
    badge.style.top = `${y}px`;
  });
}

window.addEventListener('resize', () => {
  resizeRenderer();
  positionBadges();
});
document.addEventListener('DOMContentLoaded', () => {
  resizeRenderer();
  positionBadges();
});

// ==========================================================================
// BADGE HOVER EFFECTS & DETAILS TOOLTIP
// ==========================================================================
badges.forEach(badge => {
  badge.addEventListener('mouseenter', () => {
    badges.forEach(b => b.classList.remove('active'));
    badge.classList.add('active');

    // Update tooltip text and image dynamically
    if (tooltipImg) tooltipImg.src = badge.dataset.image;
    if (tooltipTitle) tooltipTitle.textContent = badge.dataset.title;
    if (tooltipDesc) tooltipDesc.textContent = badge.dataset.info;
    tooltip.classList.add('highlighted');
    
    const badgeColor = window.getComputedStyle(badge.querySelector('.badge-icon')).color;
    tooltip.style.setProperty('--active-color', badgeColor);

    const angleDeg = parseFloat(badge.dataset.angle);
    targetRotationY = -(angleDeg * Math.PI) / 180;
  });

  badge.addEventListener('mouseleave', () => {
    badge.classList.remove('active');
    tooltip.classList.remove('highlighted');
    
    // Revert to default showcase state
    if (tooltipImg) tooltipImg.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80";
    if (tooltipTitle) tooltipTitle.textContent = "Interactive Showcase";
    if (tooltipDesc) tooltipDesc.textContent = "Hover over any of the 6 sustainability badges around the globe to explore our key focus areas.";
    
    tooltip.style.setProperty('--active-color', 'var(--primary)');
    targetRotationY = null;
  });
});

// ==========================================================================
// MOBILE MENU TOGGLE
// ==========================================================================
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navLinks.classList.toggle('mobile-active');
  });

  // Close mobile menu when links are clicked
  const links = navLinks.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('open');
      navLinks.classList.remove('mobile-active');
    });
  });
}

// ==========================================================================
// BACKGROUND FLOATING LEAVES SYSTEM
// ==========================================================================
const leavesContainer = document.getElementById('leaves-container');

const leafHues = [
  '#059669', // Emerald
  '#10b981', // Medium emerald
  '#34d399', // Light emerald
  '#84cc16', // Lime green
  '#0d9488'  // Teal
];

function createFloatingLeaf() {
  if (!leavesContainer) return;
  const leaf = document.createElement('div');
  leaf.className = 'floating-leaf';
  
  const size = Math.random() * 24 + 16; 
  const startLeft = Math.random() * 100; 
  const duration = Math.random() * 12 + 8; 
  const delay = Math.random() * 5; 
  const randomColor = leafHues[Math.floor(Math.random() * leafHues.length)];
  
  leaf.style.width = `${size}px`;
  leaf.style.height = `${size}px`;
  leaf.style.left = `${startLeft}%`;
  leaf.style.animationDuration = `${duration}s`;
  leaf.style.animationDelay = `${delay}s`;
  
  leaf.innerHTML = `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
      <path d="M10 90 C 20 50, 50 20, 90 10 C 50 20, 20 50, 10 90 Z" fill="${randomColor}" />
      <path d="M10 90 Q 50 50 90 10" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>
    </svg>
  `;
  
  leavesContainer.appendChild(leaf);
  
  setTimeout(() => {
    leaf.remove();
  }, (duration + delay) * 1000);
}

if (leavesContainer) {
  for (let i = 0; i < 8; i++) {
    createFloatingLeaf();
  }
  setInterval(createFloatingLeaf, 2200);
}

// Initialize WebGL Scene
document.addEventListener('DOMContentLoaded', () => {
  initThree();
  positionBadges();
});
