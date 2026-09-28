/* ==========================================================================
   MARKETPLACE DE PLANTILLAS - main.js
   JavaScript vanilla. Sin frameworks.

   Módulos:
   1. CONFIGURACIÓN        (IDs de Lemon Squeezy, endpoints, etc.)
   2. UTILIDADES
   3. NAVEGACIÓN
   4. LENIS (scroll suave)
   5. GSAP + SCROLLTRIGGER (animaciones de entrada)
   6. THREE.JS (elemento 3D del hero)
   7. LEMON SQUEEZY (overlay de checkout)
   8. RENDER DE PLANTILLAS (catálogo / destacadas / producto)
   9. FILTROS DEL CATÁLOGO
   10. FAQ ACORDEÓN
   11. FORMULARIO DE CONTACTO (Google Sheets)
   ========================================================================== */

'use strict';

/* ==========================================================================
   1. CONFIGURACIÓN — Personaliza aquí
   ========================================================================== */

const CONFIG = {
  // >>> REEMPLAZA con tus datos de Lemon Squeezy <<<
  // Slug de tu tienda: si tu checkout es "mitienda.lemonsqueezy.com/checkout/buy/123",
  // el slug es "mitienda". También puedes poner una URL base completa.
  lemonStoreId: 'TU_TIENDA',
  // >>> IDs de producto (Lemon Squeezy > Products > [Producto] > Product ID) <<<
  products: {
    default: 'TU_PRODUCT_ID',            // ID genérico (fallback)
    'taller-automotriz': 'TU_PRODUCT_ID_TALLER',
    'restaurante-gourmet': 'TU_PRODUCT_ID_RESTAURANTE',
    'agencia-creative': 'TU_PRODUCT_ID_AGENCIA',
    'ecommerce-tech': 'TU_PRODUCT_ID_ECOMMERCE',
    'clinica-dental': 'TU_PRODUCT_ID_DENTAL',
    'taller-moto-custom': 'TU_PRODUCT_ID_MOTOS',
    'pizzeria-napoli': 'TU_PRODUCT_ID_PIZZERIA',
    'studio-fotografia': 'TU_PRODUCT_ID_FOTO'
  },

  // Endpoint de Google Apps Script para el formulario de contacto.
  // Déjalo vacío ('') para usar el modo demo (solo consola).
  googleSheetsEndpoint: '',

  // Datos
  dataUrl: 'plantillas.json',
};

/* ==========================================================================
   2. UTILIDADES
   ========================================================================== */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/** Devuelve el ID de producto de Lemon Squeezy para una plantilla */
function lemonProductId(slug) {
  return CONFIG.products[slug] || CONFIG.products.default;
}

/** Detecta si el usuario prefiere movimiento reducido */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Carga plantillas.json (una sola vez, cacheada) */
let _plantillasCache = null;
async function loadPlantillas() {
  if (_plantillasCache) return _plantillasCache;
  try {
    const res = await fetch(CONFIG.dataUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _plantillasCache = await res.json();
  } catch (err) {
    console.warn('[plantillas] No se pudo cargar el JSON:', err);
    _plantillasCache = { categorias: [], plantillas: [] };
  }
  return _plantillasCache;
}

/** Escapa HTML para render seguro */
function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ==========================================================================
   3. NAVEGACIÓN
   ========================================================================== */

function initNav() {
  const nav = $('#nav');
  const toggle = $('#navToggle');
  const menu = $('#mobileMenu');

  // Sombra al hacer scroll
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 30);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menú hamburguesa
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Cerrar al pulsar un enlace
    $$('a', menu).forEach((a) =>
      a.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      })
    );
  }

  // Marcar enlace activo
  const page = document.body.dataset.page;
  if (page) {
    $$(`[data-nav="${page}"]`).forEach((el) => el.classList.add('active'));
  }
}

/* ==========================================================================
   4. LENIS — Scroll suave
   ========================================================================== */

let lenisInstance = null;

function initLenis() {
  if (prefersReducedMotion || typeof Lenis === 'undefined') return null;

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
    smoothWheel: true,
    touchMultiplier: 1.6,
  });
  lenisInstance = lenis;

  // Sincronizar con ScrollTrigger de GSAP
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Anclas internas con scroll suave
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    });
  });

  return lenis;
}

/* ==========================================================================
   5. GSAP + SCROLLTRIGGER — Animaciones de entrada
   ========================================================================== */

function initAnimations() {
  if (typeof gsap === 'undefined') {
    // Fallback: mostrar todo el contenido si GSAP no carga
    document.documentElement.classList.add('js-fallback');
    return;
  }

  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  // Animación de entrada del hero (sin scroll, al cargar)
  const heroEls = $$('[data-animate-hero]');
  if (heroEls.length && !prefersReducedMotion) {
    // Estado inicial ANTES del tween (evita parpadeo)
    gsap.set(heroEls, { opacity: 0, y: 34 });
    gsap.to(heroEls, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.12,
      delay: 0.15,
      clearProps: 'transform',
    });
  } else {
    gsap.set(heroEls, { opacity: 1, y: 0 });
  }

  // Elementos con data-animate → se revelan al entrar en viewport
  const animated = $$('[data-animate]');
  if (!animated.length) return;

  if (prefersReducedMotion || typeof ScrollTrigger === 'undefined') {
    gsap.set(animated, { opacity: 1, y: 0 });
    return;
  }

  animated.forEach((el) => {
    const delay = parseFloat(el.dataset.delay || 0);
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      delay,
      ease: 'power3.out',
      clearProps: 'transform',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Parallax suave en elementos con data-parallax
  $$('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 60;
    gsap.to(el, {
      y: -amount,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    });
  });

  // Re-render al terminar las imágenes (evita desajustes)
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* ==========================================================================
   6. THREE.JS — Elemento 3D del hero (esfera + anillos)
   Reacciona al scroll: rotación y escala.
   ========================================================================== */

function initHero3D() {
  const canvas = $('#hero-canvas');
  if (!canvas || typeof THREE === 'undefined' || prefersReducedMotion) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 6;

  // --- Geometría: esfera de alambre dorada ---
  const geo = new THREE.IcosahedronGeometry(1.6, 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc9a96e,
    emissive: 0xc9a96e,
    emissiveIntensity: 0.18,
    metalness: 0.85,
    roughness: 0.32,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const sphere = new THREE.Mesh(geo, mat);

  // Núcleo sólido sutil (acabado mate para que no deslumbre tras el texto)
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 1),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.55,
      roughness: 0.78,
      transparent: true,
      opacity: 0.85,
    })
  );

  // --- Anillos orbitales (azul eléctrico) ---
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.3 + i * 0.32, 0.008, 8, 128),
      ringMat.clone()
    );
    ring.rotation.x = Math.PI / 2.4 + i * 0.4;
    ring.rotation.y = i * 0.6;
    ring.material.opacity = 0.4 - i * 0.1;
    rings.push(ring);
  }

  // "Átomo": agrupa esfera + núcleo + anillos.
  // Este grupo es el que baja con el scroll (traslación) mientras gira sobre su eje.
  const atom = new THREE.Group();
  atom.add(sphere, core, ...rings);
  scene.add(atom);
  canvas.__atom = atom; // referencia para depuración en consola

  // --- Partículas de fondo ---
  const pCount = 420;
  const positions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const r = 5 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })
  );
  scene.add(particles);

  // --- Luces ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xc9a96e, 1.6);
  key.position.set(4, 5, 5);
  scene.add(key);
  // Luz de relleno suave: ilumina el átomo sin crear un foco que complique
  // la lectura del texto que pasa por detrás
  const fill = new THREE.PointLight(0x3b82f6, 6, 30);
  fill.position.set(-5, -3, 3);
  scene.add(fill);

  // --- Responsive ---
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // --- Pointer (parallax con el ratón / dedo) ---
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // --- Scroll: el átomo baja por la página y gira sobre su eje ---
  let scrollProgress = 0;
  const updateScroll = () => {
    const doc = document.documentElement;
    const max = Math.max(1, (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight);
    scrollProgress = Math.min(1, Math.max(0, window.scrollY / max));
  };
  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });

  // Suavizado para que el desvanecimiento no sea brusco
  const smoothstep = (edge0, edge1, x) => {
    const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return k * k * (3 - 2 * k);
  };

  // Opacidad base según dispositivo (coincide con la regla CSS de < 700px)
  const readBaseOpacity = () =>
    window.matchMedia('(max-width: 700px)').matches ? 0.42 : 0.9;
  let baseOpacity = readBaseOpacity();
  window.addEventListener('resize', () => { baseOpacity = readBaseOpacity(); }, { passive: true });

  // --- Bucle de render ---
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;

    const t = clock.getElapsedTime();
    const p = scrollProgress;

    // 1) DESCENSO — baja del top del viewport hacia abajo con el scroll
    const travelY = 1.05 - p * 3.1; // 1.05 → -2.05 unidades de mundo

    // 2) GIRO SOBRE SU PROPIO EJE — tiempo + scroll (2 vueltas extra al final)
    sphere.rotation.y = t * 0.12 + p * Math.PI * 4;
    sphere.rotation.x = t * 0.05 + p * 1.3;
    core.rotation.y = -t * 0.08 - p * Math.PI * 3;
    core.rotation.x = -p * 0.8;

    rings.forEach((ring, i) => {
      ring.rotation.z = t * (0.12 + i * 0.05) + p * Math.PI * 3;
      ring.rotation.y = i * 0.6 + p * (1.2 + i * 0.3);
    });

    // Partículas de fondo: rotación suave + acompaña el descenso
    particles.rotation.y = t * 0.025 + p * 0.6;
    particles.position.y = -p * 1.1;

    // Parallax suave con el puntero
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Traslación del conjunto (bajada + parallax)
    atom.position.set(pointer.x * 0.4, travelY - pointer.y * 0.28, 0);

    // 3) Escala y desvanecimiento: pasa por detrás de los bloques sin molestar
    const fade = (1 - 0.5 * p) * (1 - smoothstep(0.86, 1, p));
    atom.scale.setScalar(1 - p * 0.22);

    mat.opacity = 0.65 * fade;
    core.material.opacity = 0.85 * fade;
    rings.forEach((ring, i) => { ring.material.opacity = (0.4 - i * 0.1) * fade; });
    particles.material.opacity = 0.5 * fade;
    canvas.style.opacity = String(baseOpacity * fade);

    // Al final del recorrido el canvas ya es invisible: nos ahorramos el render
    if (fade <= 0.01) return;

    renderer.render(scene, camera);
  }
  animate();
}

/* ==========================================================================
   7. LEMON SQUEEZY — Overlay de checkout (sin salir de la página)

   La librería oficial (assets.lemonsqueezy.com/lemon.js) expone:
     LemonSqueezy.Setup({ eventHandler })
     LemonSqueezy.Url.Open(url)   → abre el checkout en un iframe superpuesto
     LemonSqueezy.Url.Close()
     LemonSqueezy.Refresh()

   IMPORTANTE: window.LemonSqueezy se crea en el evento `load` de la página,
   por eso aquí se espera con polling antes de usarla.
   ========================================================================== */

function lemonReady() {
  return !!(window.LemonSqueezy && typeof window.LemonSqueezy.Url !== 'undefined');
}

/** ¿Estamos usando los marcadores de posición todavía? */
function lemonIsPlaceholder(id) {
  const store = CONFIG.lemonStoreId || '';
  return !id || /^TU_/i.test(id) || /^TU_/i.test(store) || !store;
}

/** Construye la URL de checkout de Lemon Squeezy */
function buildCheckoutUrl(productId) {
  const store = (CONFIG.lemonStoreId || '').replace(/\/+$/, '');
  const base = /^https?:\/\//.test(store) ? store : `https://${store}.lemonsqueezy.com`;
  return `${base}/checkout/buy/${productId}`;
}

/** Registra el manejador de eventos del checkout (una sola vez) */
function bindLemonEvents() {
  if (window.__lemonBound || !lemonReady()) return;
  window.__lemonBound = true;

  window.LemonSqueezy.Setup({
    eventHandler: (data) => {
      // El payload puede ser un string ("mounted", "close") u objeto con .event
      const name = typeof data === 'string' ? data : data && (data.event || data.name);
      switch (name) {
        case 'checkout:opened':
        case 'mounted':
          showLemonStatus('Checkout abierto ✓');
          break;
        case 'checkout:completed':
        case 'GA.Purchase':
          showLemonStatus('¡Compra completada! Revisa tu correo 📩');
          break;
        case 'checkout:closed':
        case 'close':
          hideLemonStatus();
          break;
        default:
          break;
      }
    },
  });
}

function initLemonSqueezy() {
  // El script se crea en `load`, así que esperamos a ese momento
  if (document.readyState === 'complete') bindLemonEvents();
  else window.addEventListener('load', bindLemonEvents, { once: true });

  // Reintento por si el script tarda (máx. ~5 s)
  let tries = 0;
  const iv = setInterval(() => {
    bindLemonEvents();
    if (window.__lemonBound || ++tries > 25) clearInterval(iv);
  }, 200);
}

/** Abre el overlay de Lemon Squeezy para un producto */
function openCheckout(productId) {
  if (lemonIsPlaceholder(productId)) {
    showLemonStatus('Configura tu tienda e IDs en main.js (CONFIG)');
    console.warn('[LemonSqueezy] Marcador de posición — CONFIG.lemonStoreId / CONFIG.products:', {
      store: CONFIG.lemonStoreId,
      product: productId,
    });
    return;
  }

  const url = buildCheckoutUrl(productId);

  const open = () => {
    try {
      // Overlay: el checkout se superpone sin salir de la página
      window.LemonSqueezy.Url.Open(url);
    } catch (err) {
      console.error('[LemonSqueezy] Error al abrir el overlay, abriendo en pestaña:', err);
      window.open(url, '_blank', 'noopener');
    }
  };

  if (lemonReady()) {
    open();
    return;
  }

  // Esperar a que la librería esté lista (se inicializa en window.load)
  showLemonStatus('Preparando checkout…');
  let tries = 0;
  const iv = setInterval(() => {
    if (lemonReady()) {
      clearInterval(iv);
      open();
    } else if (++tries > 25) {
      // Fallback: abrimos en pestaña nueva
      clearInterval(iv);
      window.open(url, '_blank', 'noopener');
    }
  }, 200);
}

/** Muestra un aviso temporal */
let _lemonTimer = null;
function showLemonStatus(msg) {
  let el = $('#lemonStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lemonStatus';
    el.className = 'lemon-status';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(_lemonTimer);
  _lemonTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

function hideLemonStatus() {
  const el = $('#lemonStatus');
  if (el) el.classList.remove('show');
}

/** Delegación global: cualquier [data-buy] abre el checkout */
function initBuyButtons() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    e.preventDefault();
    const slug = btn.dataset.buy;
    openCheckout(lemonProductId(slug));
  });
}

/* ==========================================================================
   8. RENDER DE PLANTILLAS
   ========================================================================== */

/** Plantilla HTML de tarjeta */
function cardHTML(p) {
  return `
    <article class="card" data-animate data-categoria="${escapeHTML(p.categoria)}">
      <a class="card-media" href="producto.html?id=${encodeURIComponent(p.id)}" aria-label="Ver ${escapeHTML(p.nombre)}">
        <img src="${escapeHTML(p.imagen)}" alt="${escapeHTML(p.nombre)}" loading="lazy" decoding="async">
        <span class="card-tag">${escapeHTML(p.categoria)}</span>
      </a>
      <div class="card-body">
        <h3 class="card-title">
          <a href="producto.html?id=${encodeURIComponent(p.id)}">${escapeHTML(p.nombre)}</a>
        </h3>
        <p class="card-desc">${escapeHTML(p.descripcion)}</p>
        <div class="card-footer">
          <div class="price">$${escapeHTML(p.precio)}<small>solo plantilla</small></div>
          <div class="card-actions">
            <a class="btn btn-ghost" href="${escapeHTML(p.demo)}" target="_blank" rel="noopener">Ver Demo</a>
            <button class="btn btn-primary" type="button" data-buy="${escapeHTML(p.id)}">Comprar</button>
          </div>
        </div>
      </div>
    </article>`;
}

/** Renderiza las destacadas en el Home */
async function renderDestacadas() {
  const grid = $('#destacadasGrid');
  if (!grid) return;

  const data = await loadPlantillas();
  const destacadas = data.plantillas.filter((p) => p.destacada).slice(0, 3);
  const list = destacadas.length ? destacadas : data.plantillas.slice(0, 3);

  grid.innerHTML = list.map(cardHTML).join('');

  // Animar las tarjetas recién creadas
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion) {
    gsap.set(grid.querySelectorAll('[data-animate]'), { opacity: 0, y: 34 });
    gsap.to(grid.querySelectorAll('[data-animate]'), {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: 'power3.out',
      stagger: 0.12,
      clearProps: 'transform',
      scrollTrigger: { trigger: grid, start: 'top 85%' },
    });
    ScrollTrigger.refresh();
  } else {
    grid.querySelectorAll('[data-animate]').forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }
}

/** Renderiza el catálogo completo + filtros */
async function renderCatalogo() {
  const grid = $('#catalogoGrid');
  if (!grid) return;

  const data = await loadPlantillas();
  const cont = $('#catalogoCount');

  // Pintar filtros desde el JSON
  const filtersEl = $('#filters');
  if (filtersEl && data.categorias.length) {
    filtersEl.innerHTML = data.categorias
      .map(
        (c, i) =>
          `<button class="filter-btn${i === 0 ? ' active' : ''}" type="button" data-filter="${escapeHTML(c.id)}">${escapeHTML(c.nombre)}</button>`
      )
      .join('');
  }

  const draw = (cat = 'todos') => {
    const list =
      cat === 'todos' ? data.plantillas : data.plantillas.filter((p) => p.categoria === cat);

    grid.innerHTML = list.map(cardHTML).join('');

    if (cont) {
      cont.textContent = `${list.length} plantilla${list.length === 1 ? '' : 's'} disponible${list.length === 1 ? '' : 's'}`;
    }

    const cards = grid.querySelectorAll('[data-animate]');
    if (typeof gsap !== 'undefined' && !prefersReducedMotion) {
      gsap.set(cards, { opacity: 0, y: 26 });
      gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.07,
        clearProps: 'transform',
      });
    } else {
      cards.forEach((el) => {
        el.style.opacity = 1;
        el.style.transform = 'none';
      });
    }
  };

  draw('todos');

  // Delegación de filtros (los botones se generan dinámicamente)
  if (filtersEl) {
    filtersEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      $$('.filter-btn', filtersEl).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      draw(btn.dataset.filter);
    });
  }

  // Hover con GSAP en tarjetas (solo desktop)
  if (typeof gsap !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
    grid.addEventListener('pointerover', (e) => {
      const card = e.target.closest('.card');
      if (card && !card.dataset.hovering) {
        card.dataset.hovering = '1';
        gsap.to(card, { y: -6, duration: 0.35, ease: 'power2.out' });
      }
    });
    grid.addEventListener('pointerout', (e) => {
      const card = e.target.closest('.card');
      if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
        delete card.dataset.hovering;
        gsap.to(card, { y: 0, duration: 0.4, ease: 'power2.out' });
      }
    });
  }
}

/* ==========================================================================
   PÁGINA DE PRODUCTO — Lee ?id= de la URL
   ========================================================================== */

async function renderProducto() {
  const root = $('#productoRoot');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 'taller-automotriz';

  const data = await loadPlantillas();
  const p = data.plantillas.find((x) => x.id === id) || data.plantillas[0];

  if (!p) {
    root.innerHTML = '<p class="lead">Plantilla no encontrada.</p>';
    return;
  }

  document.title = `${p.nombre} — Plantillas Web 3D`;

  // Iconos simples por característica
  const iconFor = (txt) => {
    const t = txt.toLowerCase();
    if (t.includes('3d')) return '🧊';
    if (t.includes('mobile')) return '📱';
    if (t.includes('gsap') || t.includes('anim')) return '✨';
    if (t.includes('lenis') || t.includes('scroll')) return '📜';
    if (t.includes('chatbot')) return '🤖';
    if (t.includes('seo')) return '🔍';
    if (t.includes('carga') || t.includes('rendimiento') || t.includes('lighthouse')) return '⚡';
    if (t.includes('form') || t.includes('reserva') || t.includes('agenda') || t.includes('pedido')) return '📝';
    if (t.includes('carrito') || t.includes('checkout')) return '🛒';
    if (t.includes('galer') || t.includes('lightbox')) return '🖼️';
    if (t.includes('mapa') || t.includes('maps')) return '📍';
    if (t.includes('whatsapp')) return '💬';
    if (t.includes('blog')) return '📰';
    if (t.includes('accesib')) return '♿';
    if (t.includes('imagen') || t.includes('webp')) return '📸';
    if (t.includes('config')) return '🛠️';
    if (t.includes('tour')) return '🚪';
    if (t.includes('menú') || t.includes('menu')) return '🍽️';
    return '✔️';
  };

  root.innerHTML = `
    <div class="container">
      <nav class="breadcrumb" aria-label="Ruta de navegación">
        <a href="index.html">Inicio</a> /
        <a href="catalogo.html">Catálogo</a> /
        <span>${escapeHTML(p.nombre)}</span>
      </nav>

      <div class="product-layout">
        <!-- Columna izquierda: preview + descripción -->
        <div>
          <div class="product-preview" data-animate>
            <div class="browser-bar">
              <span class="browser-dot"></span>
              <span class="browser-dot"></span>
              <span class="browser-dot"></span>
              <span class="browser-url">${escapeHTML(p.demo)}</span>
            </div>
            <img src="${escapeHTML(p.imagen)}" alt="Vista previa de ${escapeHTML(p.nombre)}">
            <div class="preview-actions">
              <a class="btn btn-ghost" href="${escapeHTML(p.demo)}" target="_blank" rel="noopener">Abrir demo en nueva pestaña ↗</a>
              <a class="btn btn-ghost" href="catalogo.html">Ver catálogo</a>
            </div>
          </div>

          <div style="margin-top:2rem" data-animate>
            <span class="eyebrow">Descripción</span>
            <h2 class="h3" style="margin-bottom:0.9rem">${escapeHTML(p.nombre)}</h2>
            <p class="lead">${escapeHTML(p.descripcion_larga || p.descripcion)}</p>
          </div>

          <div style="margin-top:2.4rem" data-animate>
            <span class="eyebrow">Características clave</span>
            <div class="features">
              ${p.caracteristicas
                .map(
                  (c) =>
                    `<div class="feature"><span class="icon">${iconFor(c)}</span><span>${escapeHTML(c)}</span></div>`
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Columna derecha: panel de compra -->
        <aside class="buy-panel" data-animate>
          <div>
            <span class="pill">Plantilla HTML/CSS/JS</span>
            <h1 class="h3" style="margin-top:0.8rem">${escapeHTML(p.nombre)}</h1>
          </div>

          <div class="price-row">
            <span class="price-big">$${escapeHTML(p.precio)}</span>
            <span class="price-note">pago único · licencia comercial</span>
          </div>

          <button class="btn btn-primary btn-lg btn-block" type="button" data-buy="${escapeHTML(p.id)}">
            Comprar ahora
          </button>

          <a class="btn btn-ghost btn-block" href="${escapeHTML(p.demo)}" target="_blank" rel="noopener">
            Ver demo en vivo ↗
          </a>

          <div class="divider"></div>

          <!-- Upsell: servicio completo -->
          <div class="upsell">
            <div class="upsell-head">
              <span class="upsell-title">
                <span class="upsell-badge">Upsell</span>
                Servicio completo
              </span>
              <span class="upsell-price">$${escapeHTML(p.precio_servicio || 250)}</span>
            </div>
            <ul>
              <li>Personalización total de la plantilla</li>
              <li>Dominio + hosting en Cloudflare</li>
              <li>Chatbot IA entrenado para tu negocio</li>
              <li>Implementación y soporte 30 días</li>
            </ul>
            <button class="btn btn-blue btn-block" type="button" data-buy="${escapeHTML(p.id)}">
              Contratar servicio completo
            </button>
          </div>

          <p class="trust-row">🔒 Pago seguro con Lemon Squeezy · Descarga inmediata</p>
        </aside>
      </div>
    </div>

    <!-- FAQ -->
    <section class="section">
      <div class="container">
        <div class="section-head" data-animate>
          <div>
            <span class="eyebrow">Dudas frecuentes</span>
            <h2 class="h2">Preguntas frecuentes</h2>
          </div>
        </div>
        <div class="faq-list">
          ${(p.faq || [])
            .map(
              (f, i) => `
            <div class="faq-item${i === 0 ? ' open' : ''}" data-animate>
              <button class="faq-q" type="button" aria-expanded="${i === 0}">
                ${escapeHTML(f.pregunta)}
                <span class="faq-icon">+</span>
              </button>
              <div class="faq-a"${i === 0 ? ' style="max-height:400px"' : ''}>
                <p>${escapeHTML(f.respuesta)}</p>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>
    </section>

    <!-- CTA final -->
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="cta-final" data-animate>
          <span class="eyebrow" style="justify-content:center">¿Otro tipo de negocio?</span>
          <h2 class="h2">¿Tienes otro tipo de negocio?<br>Cuéntame y te diseño algo a medida.</h2>
          <p class="lead">Adaptamos cualquier plantilla a tu sector o creamos un diseño desde cero. Dominio, hosting y chatbot incluidos.</p>
          <div class="cta-actions">
            <a class="btn btn-primary btn-lg" href="contacto.html">Solicitar personalización</a>
            <a class="btn btn-ghost btn-lg" href="catalogo.html">Ver todas las plantillas</a>
          </div>
        </div>
      </div>
    </section>
  `;

  initFAQ();

  // Re-ejecutar animaciones sobre el contenido inyectado
  if (typeof gsap !== 'undefined' && !prefersReducedMotion) {
    const els = $$('[data-animate]', root);
    gsap.set(els, { opacity: 0, y: 30 });
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.08,
      clearProps: 'transform',
      scrollTrigger: { trigger: root, start: 'top 85%' },
    });
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  } else {
    $$('[data-animate]', root).forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }
}

/* ==========================================================================
   10. FAQ ACORDEÓN
   ========================================================================== */

function initFAQ() {
  $$('.faq-item').forEach((item) => {
    const btn = $('.faq-q', item);
    const ans = $('.faq-a', item);
    if (!btn || !ans || item.dataset.bound) return;
    item.dataset.bound = '1';

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Cerrar los demás
      $$('.faq-item.open').forEach((other) => {
        if (other === item) return;
        other.classList.remove('open');
        const ob = $('.faq-q', other);
        const oa = $('.faq-a', other);
        if (ob) ob.setAttribute('aria-expanded', 'false');
        if (oa) oa.style.maxHeight = null;
      });

      item.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
      ans.style.maxHeight = isOpen ? null : ans.scrollHeight + 'px';
    });
  });
}

/* ==========================================================================
   11. FORMULARIO DE CONTACTO → Google Sheets
   Usa un Google Apps Script (Web App) como endpoint.
   ========================================================================== */

function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;

  const status = $('#formStatus');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    // Validación básica
    if (!data.nombre || !data.email || !data.mensaje) {
      setStatus('error', 'Por favor completa los campos obligatorios.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setStatus('error', 'Introduce un email válido.');
      return;
    }

    const submitBtn = $('[type="submit"]', form);
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      if (CONFIG.googleSheetsEndpoint) {
        // Envío real al Google Apps Script
        const res = await fetch(CONFIG.googleSheetsEndpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ ...data, fecha: new Date().toISOString(), pagina: location.pathname }),
        });
        void res;
        setStatus('ok', '¡Gracias! Tu mensaje se ha enviado correctamente. Te responderé en menos de 24h.');
      } else {
        // Modo demo: no hay endpoint configurado
        console.log('[Contacto] Datos a enviar a Google Sheets:', data);
        setStatus('ok', '¡Gracias! (Modo demo: configura CONFIG.googleSheetsEndpoint en main.js para guardar en Google Sheets).');
      }
      form.reset();
    } catch (err) {
      console.error(err);
      setStatus('error', 'No se pudo enviar. Inténtalo de nuevo o escríbeme por email.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  function setStatus(type, msg) {
    if (!status) return;
    status.className = `form-status ${type}`;
    status.textContent = msg;
    status.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initLenis();
  initAnimations();
  initHero3D();
  initLemonSqueezy();
  initBuyButtons();
  initFAQ();
  initContactForm();

  // Render dependiente de la página
  renderDestacadas();
  renderCatalogo();
  renderProducto();

  // Footer: año dinámico
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
});
