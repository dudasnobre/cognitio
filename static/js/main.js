(function () {
  'use strict';
 
  /* ─── Utilitários ─── */
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
 
  /* ─── Referências ─── */
  const splash       = $('splash');
  const splashLogo   = $('splash-logo');
  const splashLine   = $('splash-line');
  const splashTagline= $('splash-tagline');
  const navbar       = $('navbar');
  const heroContent  = $('hero-content');
  const heroVisual   = $('hero-visual');
 
  /* ─── SPLASH: animação letra a letra ─── */
  const WORD = 'Cognitio';
  const ACCENT_INDICES = [0]; // C em laranja
 
  function buildLetters() {
    if (!splashLogo) return;
    splashLogo.innerHTML = '';
    [...WORD].forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      if (ACCENT_INDICES.includes(i)) span.classList.add('accent');
      splashLogo.appendChild(span);
    });
  }
 
  function revealLetters() {
    if (!splashLogo || !splashLine) return;
    const letters = splashLogo.querySelectorAll('span');
    // Expande a linha antes das letras
    splashLine.style.width = '120px';
 
    letters.forEach((letter, i) => {
      setTimeout(() => {
        letter.classList.add('revealed');
 
        // Ao revelar a última letra
        if (i === letters.length - 1) {
          setTimeout(() => {
            if (splashTagline) splashTagline.style.opacity = '1';
          }, 200);
 
          setTimeout(() => {
            startExitSplash();
          }, 900);
        }
      }, 120 + i * 90); // Velocidade por letra
    });
  }
 
  function startExitSplash() {
    if (!splash) return;
    splash.classList.add('fade-out');
    splash.addEventListener('animationend', () => {
      splash.style.display = 'none';
      // Acorda a navbar e hero
      if (navbar) navbar.classList.add('visible');
      setTimeout(() => {
        if (heroContent) heroContent.classList.add('visible');
        if (heroVisual) heroVisual.classList.add('visible');
      }, 150);
    }, { once: true });
  }
 
  /* ─── Inicia splash ─── */
  buildLetters();
  // Pequeno delay para garantir rendering
  setTimeout(revealLetters, 300);
 
  /* ─── SCROLL REVEAL ─── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
 
  $$('.reveal, .course-card').forEach(el => revealObserver.observe(el));
 
  /* ─── NAVBAR: menu mobile (hamburger) ─── */
  const navToggle = $('nav-toggle');
  const navLinksEl = $('nav-links');
  if (navToggle && navLinksEl) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });
    // Fecha o menu ao clicar em um link
    navLinksEl.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinksEl.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }

  /* ─── NAVBAR: scroll sombra suave ─── */
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        navbar.style.boxShadow = '0 4px 28px rgba(0,48,73,0.1)';
      } else {
        navbar.style.boxShadow = '0 2px 24px rgba(0,48,73,0.06)';
      }
    }, { passive: true });
  }
 
  /* ─── PARALLAX suave no hero dots ─── */
  const heroDots = document.querySelector('.hero-dots');
  if (heroDots) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      heroDots.style.transform = `translateY(${y * 0.25}px)`;
    }, { passive: true });
  }
 
  /* ─── CURSOR spotlight suave no hero ─── */
  const heroBg = document.querySelector('.hero-bg');
  const hero   = document.getElementById('hero');
  if (heroBg && hero) {
    hero.addEventListener('mousemove', e => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top)  / rect.height) * 100;
      heroBg.style.background = `
        radial-gradient(ellipse 50% 55% at ${x}% ${y}%, rgba(247,127,0,0.13) 0%, transparent 65%),
        radial-gradient(ellipse 40% 50% at 10% 80%, rgba(0,48,73,0.06) 0%, transparent 60%),
        #fafaf8
      `;
    });
    hero.addEventListener('mouseleave', () => {
      heroBg.style.background = '';
    });
  }
 
  /* ─── Contador animado nos stats do sobre ─── */
  function animateCounter(el, target, suffix = '') {
    const duration = 1400;
    const start = performance.now();
    const isInfinity = target === Infinity;
 
    if (isInfinity) { el.textContent = '∞'; return; }
 
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }
 
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const strong = entry.target.querySelector('strong');
      if (!strong) return;
 
      const raw = strong.dataset.target;
      if (raw === '∞') { strong.textContent = '∞'; }
      else {
        const suffix = strong.dataset.suffix || '';
        animateCounter(strong, parseInt(raw), suffix);
      }
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });
 
  // Atribui data-target a cada stat da seção SOBRE
  const statMap = [
    { selector: '.sobre-stat:nth-child(1) strong', target: '1', suffix: 'º' },
    { selector: '.sobre-stat:nth-child(2) strong', target: '100', suffix: '%' },
    { selector: '.sobre-stat:nth-child(3) strong', target: '∞', suffix: '' },
  ];
 
  statMap.forEach(({ selector, target, suffix }) => {
    const el = document.querySelector(selector);
    if (el) {
      el.dataset.target  = target;
      el.dataset.suffix  = suffix;
      counterObserver.observe(el.closest('.sobre-stat'));
    }
  });
 
  /* ─── Efeito tilt suave nos course cards ─── */
  $$('.course-card:not(.coming-soon)').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width  / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `translateY(-6px) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
 
})();