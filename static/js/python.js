/* ══════════════════════════════════════════════════════════
   COGNITIO · python.js  —  Curso de Python do Zero
   Mesmo padrão do javascript.js / banco.js (topbar, sidebar,
   progresso e toast). Sem terminal executável — o Python não
   roda no navegador, então usamos blocos de saída simulada.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── CONFIG ─── */
  const COURSE_TITLE  = 'Python do Zero';
  const TOTAL_MODULES = 10;
  const STORAGE_KEY   = 'python_done';

  const MODULES = [
    { num: 1,  title: 'Introdução ao Python',                route: '/python'          },
    { num: 2,  title: 'Variáveis e Tipos de Dados',          route: '/python/modulo2'  },
    { num: 3,  title: 'Estruturas Condicionais',             route: '/python/modulo3'  },
    { num: 4,  title: 'Laços de Repetição',                  route: '/python/modulo4'  },
    { num: 5,  title: 'Listas, Tuplas e Dicionários',        route: '/python/modulo5'  },
    { num: 6,  title: 'Funções',                             route: '/python/modulo6'  },
    { num: 7,  title: 'Arquivos, Módulos e Próximos Passos', route: '/python/modulo7'  },
    { num: 8,  title: 'Tratamento de Erros e Depuração',     route: '/python/modulo8'  },
    { num: 9,  title: 'Orientação a Objetos',                route: '/python/modulo9'  },
    { num: 10, title: 'Projeto Final',                       route: '/python/modulo10' },
  ];

  /* ─── Utils ─── */
  const isDone   = n => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').includes(n);
  const markDone = n => {
    const done = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!done.includes(n)) { done.push(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(done)); }
  };
  const getDoneCount = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').length;

  const route   = window.location.pathname;
  const current = MODULES.find(m => m.route === route) || MODULES[0];
  const pct     = Math.round((getDoneCount() / TOTAL_MODULES) * 100);

  /* ══════════════════════════════
     1. TopBar
     ══════════════════════════════ */
  function buildTopBar() {
    const bar = document.createElement('nav');
    bar.className = 'mod-topbar';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <button id="sidebar-toggle" aria-label="Abrir menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <a href="/trilhas" class="mod-topbar-logo"><img src="/static/img/logosemfundo.png" alt="Cognitio"></a>
      </div>
      <div class="mod-topbar-center">
        <span class="course-name">${COURSE_TITLE}</span>
        <i class="fa-solid fa-chevron-right"></i>
        <span>Módulo ${current.num} — ${current.title}</span>
      </div>
      <div class="mod-topbar-right">
        <div class="progress-pill">
          <i class="fa-brands fa-python" style="font-size:.7rem"></i>
          <div class="progress-pill-bar">
            <div class="progress-pill-fill" id="pill-fill" style="width:${pct}%"></div>
          </div>
          <span id="pill-pct">${pct}%</span>
        </div>
        <a href="/trilhas" class="btn-home">
          <i class="fa-solid fa-house"></i> Início
        </a>
      </div>`;
    document.body.prepend(bar);
  }

  /* ══════════════════════════════
     2. Sidebar
     ══════════════════════════════ */
  function buildSidebar() {
    const aside = document.createElement('aside');
    aside.className = 'mod-sidebar';
    aside.id = 'mod-sidebar';

    const items = MODULES.map(m => {
      const done   = isDone(m.num);
      const active = m.num === current.num;
      const cls = ['sidebar-item', active ? 'active' : '', done && !active ? 'done' : ''].filter(Boolean).join(' ');
      const icon = done && !active
        ? `<i class="fa-solid fa-check" style="color:var(--success);font-size:.65rem;margin-left:auto"></i>` : '';
      return `<li class="${cls}"><a href="${m.route}"><span class="step-num">${m.num}</span>${m.title}${icon}</a></li>`;
    }).join('');

    aside.innerHTML = `
      <span class="sidebar-label"><i class="fa-brands fa-python" style="margin-right:5px"></i>Módulos do curso</span>
      <ul class="sidebar-list">${items}</ul>`;

    const ov = document.createElement('div');
    ov.id = 'sidebar-overlay';
    document.body.appendChild(ov);
    document.body.appendChild(aside);
  }

  /* ══════════════════════════════
     3. Layout wrapper
     ══════════════════════════════ */
  function wrapLayout() {
    const layout = document.createElement('div');
    layout.className = 'mod-layout';
    const main = document.createElement('main');
    main.className = 'mod-main';
    const card = document.querySelector('.main-card');
    if (!card) return;
    card.parentNode.insertBefore(layout, card);
    layout.appendChild(main);
    main.appendChild(card);
  }

  /* ══════════════════════════════
     4. Read-progress bar
     ══════════════════════════════ */
  function buildReadProgress() {
    const bar = document.createElement('div');
    bar.id = 'read-progress';
    bar.style.cssText = 'position:fixed;top:62px;left:0;right:0;height:3px;background:var(--primary);width:0;z-index:91;transition:width .2s';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
      const doc = document.documentElement;
      const pct = (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100;
      bar.style.width = Math.min(100, pct) + '%';
      if (pct >= 90) markDone(current.num);
    }, { passive: true });
  }

  /* ══════════════════════════════
     5. Toast
     ══════════════════════════════ */
  function buildToast() {
    const t = document.createElement('div');
    t.id = 'mod-toast';
    t.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i><span id="toast-msg"></span>`;
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);background:white;border:1px solid var(--border);border-radius:50px;padding:11px 22px;font-size:.86rem;font-weight:600;box-shadow:var(--shadow-lg);z-index:999;display:flex;align-items:center;gap:9px;transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .4s;opacity:0;pointer-events:none';
    document.body.appendChild(t);
  }

  function showToast(msg, duration = 3200) {
    const t = document.getElementById('mod-toast');
    const txt = document.getElementById('toast-msg');
    if (!t || !txt) return;
    txt.textContent = msg;
    t.classList.add('show');
    t.style.transform = 'translateX(-50%) translateY(0)';
    t.style.opacity = '1';
    setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; t.style.opacity = '0'; }, duration);
  }

  /* ══════════════════════════════
     6. Sidebar toggle
     ══════════════════════════════ */
  function initSidebarToggle() {
    const btn = document.getElementById('sidebar-toggle');
    const sb  = document.getElementById('mod-sidebar');
    const ov  = document.getElementById('sidebar-overlay');
    if (!btn || !sb) return;
    btn.addEventListener('click', () => { sb.classList.add('open'); ov.classList.add('active'); });
    ov.addEventListener('click',  () => { sb.classList.remove('open'); ov.classList.remove('active'); });
    document.addEventListener('keydown', e => e.key === 'Escape' && sb.classList.remove('open'));
  }

  /* ══════════════════════════════
     7. Boas-vindas toast
     ══════════════════════════════ */
  function greetUser() {
    setTimeout(() => {
      if (current.num === 1) showToast('Bem-vindo ao curso de Python! 🐍', 3500);
      else if (current.num === TOTAL_MODULES && isDone(TOTAL_MODULES - 1)) showToast('Último módulo! Quase lá 🎉', 3500);
      else if (isDone(current.num - 1)) showToast(`Módulo ${current.num - 1} concluído! ✔`, 3000);
    }, 900);
  }

  /* ══════════════════════════════
     8. Tag visual do módulo
     ══════════════════════════════ */
  function injectModTag() {
    const h2 = document.querySelector('h2');
    if (!h2) return;
    h2.textContent = h2.textContent.replace(/^\d+\.\s*/, '').trim();
    const tag = document.createElement('div');
    tag.className = 'mod-number-tag';
    tag.innerHTML = `<i class="fa-brands fa-python"></i> Módulo ${current.num} de ${TOTAL_MODULES}`;
    h2.parentNode.insertBefore(tag, h2);
  }

  /* ══════════════════════════════
     9. Botão concluir
     ══════════════════════════════ */
  function patchFinalButton() {
    if (current.num !== TOTAL_MODULES) return;
    document.querySelectorAll('a.btn-proximo').forEach(btn => {
      if (!btn.getAttribute('href') || btn.getAttribute('href') === '#') {
        btn.setAttribute('href', '/trilhas');
        btn.classList.add('btn-finalizar');
        btn.addEventListener('click', e => {
          e.preventDefault();
          markDone(TOTAL_MODULES);
          showToast('Curso de Python concluído! 🏆', 4000);
          setTimeout(() => window.location.href = '/trilhas', 2800);
        });
      }
    });
  }

  /* ══════════════════════════════
     10. Font Awesome
     ══════════════════════════════ */
  function ensureFontAwesome() {
    if (![...document.querySelectorAll('link')].some(l => l.href.includes('font-awesome'))) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }

  /* ─── INIT ─── */
  function init() {
    ensureFontAwesome();
    buildTopBar();
    buildSidebar();
    buildReadProgress();
    buildToast();
    wrapLayout();
    injectModTag();
    initSidebarToggle();
    greetUser();
    patchFinalButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
