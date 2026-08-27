/* ══════════════════════════════════════════════════════════
   COGNITIO · financas.js  —  Curso de Educação Financeira
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── CONFIG ─── */
  const COURSE_TITLE  = 'Educação Financeira';
  const TOTAL_MODULES = 10;

  const MODULES = [
    { num: 1,  title: 'Introdução à Educação Financeira',    route: '/financas' },
    { num: 2,  title: 'Planejamento e Orçamento',            route: '/financas_modulo2' },
    { num: 3,  title: 'Controle de Gastos',                  route: '/financas_modulo3' },
    { num: 4,  title: 'Reserva de Emergência',                route: '/financas_modulo4' },
    { num: 5,  title: 'Investimentos Básicos',                route: '/financas_modulo5' },
    { num: 6,  title: 'Planejamento de Futuro',               route: '/financas_modulo6' },
    { num: 7,  title: 'Planeamento Financeiro na Vida Real',  route: '/financas_modulo7' },
    { num: 8,  title: 'Impostos e Obrigações Básicas',        route: '/financas_modulo8' },
    { num: 9,  title: 'Empreendedorismo e Renda Extra',       route: '/financas_modulo9' },
    { num: 10, title: 'Projeto Final: Meu Plano Financeiro',  route: '/financas_modulo10' },
  ];

  /* ─── Utils ─── */
  const currentRoute = () => window.location.pathname;
  const isDone   = n => JSON.parse(localStorage.getItem('financas_done') || '[]').includes(n);
  const markDone = n => {
    const done = JSON.parse(localStorage.getItem('financas_done') || '[]');
    if (!done.includes(n)) { done.push(n); localStorage.setItem('financas_done', JSON.stringify(done)); }
  };
  const getDoneCount = () => JSON.parse(localStorage.getItem('financas_done') || '[]').length;

  /* ─── Detectar módulo atual ─── */
  const route   = currentRoute();
  const current = MODULES.find(m => m.route === route) || MODULES[0];
  const pct     = Math.round((getDoneCount() / TOTAL_MODULES) * 100);

  /* ══════════════════════════════
     1. INJETAR TopBar
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
          <i class="fa-solid fa-dollar-sign" style="font-size:.7rem"></i>
          <div class="progress-pill-bar">
            <div class="progress-pill-fill" id="pill-fill" style="width:${pct}%"></div>
          </div>
          <span id="pill-pct">${pct}%</span>
        </div>
        <a href="/trilhas" class="btn-home">
          <i class="fa-solid fa-house"></i> Início
        </a>
      </div>
    `;
    document.body.prepend(bar);
  }

  /* ══════════════════════════════
     2. INJETAR Sidebar
     ══════════════════════════════ */
  function buildSidebar() {
    const aside = document.createElement('aside');
    aside.className = 'mod-sidebar';
    aside.id = 'mod-sidebar';

    const items = MODULES.map(m => {
      const done   = isDone(m.num);
      const active = m.num === current.num;
      const classes = ['sidebar-item', active ? 'active' : '', done && !active ? 'done' : '']
                        .filter(Boolean).join(' ');
      const icon = done && !active
        ? `<i class="fa-solid fa-check" style="color:var(--success);font-size:.65rem;margin-left:auto"></i>`
        : '';
      return `
        <li class="${classes}">
          <a href="${m.route}">
            <span class="step-num">${m.num}</span>
            ${m.title}
            ${icon}
          </a>
        </li>`;
    }).join('');

    aside.innerHTML = `
      <span class="sidebar-label">Módulos do curso</span>
      <ul class="sidebar-list">${items}</ul>
    `;

    const ov = document.createElement('div');
    ov.id = 'sidebar-overlay';
    document.body.appendChild(ov);
    document.body.appendChild(aside);
  }

  /* ══════════════════════════════
     3. LAYOUT WRAPPER
     ══════════════════════════════ */
  function wrapLayout() {
    const hasCard = document.querySelector('.main-card');

    if (!hasCard) {
      const children = [...document.body.children].filter(el =>
        !['NAV','ASIDE','SCRIPT','STYLE','LINK','META'].includes(el.tagName) &&
        !el.id.startsWith('mod-') &&
        el.id !== 'sidebar-overlay' &&
        el.id !== 'read-progress' &&
        el.id !== 'mod-toast'
      );

      if (children.length) {
        const wrap = document.createElement('div');
        wrap.className = 'mod-content-wrap';
        children[0].parentNode.insertBefore(wrap, children[0]);
        children.forEach(c => wrap.appendChild(c));
      }
    }

    const layout = document.createElement('div');
    layout.className = 'mod-layout';
    const main = document.createElement('main');
    main.className = 'mod-main';

    const toMove = [...document.body.children].filter(el =>
      !['NAV'].includes(el.tagName) &&
      el.tagName !== 'ASIDE' &&
      !el.id.startsWith('sidebar') &&
      el.id !== 'read-progress' &&
      el.id !== 'mod-toast' &&
      !el.classList.contains('mod-topbar') &&
      !el.classList.contains('mod-sidebar')
    );

    toMove.forEach(el => main.appendChild(el));

    const sidebar = document.getElementById('mod-sidebar');
    layout.appendChild(sidebar);
    layout.appendChild(main);
    document.body.appendChild(layout);
  }

  /* ══════════════════════════════
     4. BARRA DE LEITURA
     ══════════════════════════════ */
  function buildReadProgress() {
    const bar = document.createElement('div');
    bar.id = 'read-progress';
    document.body.prepend(bar);

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct  = docH > 0 ? (scrollTop / docH) * 100 : 0;
      bar.style.width = Math.min(pct, 100) + '%';

      if (pct > 90) markDone(current.num);
    }, { passive: true });
  }

  /* ══════════════════════════════
     5. TOAST
     ══════════════════════════════ */
  function buildToast() {
    const t = document.createElement('div');
    t.id = 'mod-toast';
    t.innerHTML = `<i class="fa-solid fa-circle-check"></i><span id="toast-msg"></span>`;
    document.body.appendChild(t);
  }

  function showToast(msg, duration = 3200) {
    const t   = document.getElementById('mod-toast');
    const txt = document.getElementById('toast-msg');
    if (!t || !txt) return;
    txt.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  /* ══════════════════════════════
     6. SIDEBAR TOGGLE (mobile)
     ══════════════════════════════ */
  function initSidebarToggle() {
    const btn     = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('mod-sidebar');
    const ov      = document.getElementById('sidebar-overlay');

    if (!btn || !sidebar) return;

    const open  = () => { sidebar.classList.add('open');    ov.classList.add('active'); };
    const close = () => { sidebar.classList.remove('open'); ov.classList.remove('active'); };

    btn.addEventListener('click', open);
    ov.addEventListener('click', close);
    document.addEventListener('keydown', e => e.key === 'Escape' && close());
  }

  /* ══════════════════════════════
     7. TOAST DE BOAS-VINDAS
     ══════════════════════════════ */
  function greetUser() {
    setTimeout(() => {
      if (current.num === 1) {
        showToast('Bem-vindo ao curso de Educação Financeira! 💰', 3500);
      } else if (current.num === TOTAL_MODULES && isDone(TOTAL_MODULES - 1)) {
        showToast('Último módulo de Finanças! Vamos lá 📈', 3500);
      } else if (isDone(current.num - 1)) {
        showToast(`Módulo ${current.num - 1} de Finanças concluído! ✔`, 3000);
      }
    }, 900);
  }

  /* ══════════════════════════════
     8. BOTÃO CONCLUIR
     ══════════════════════════════ */
  function patchFinalButton() {
    if (current.num !== TOTAL_MODULES) return;
    const btns = document.querySelectorAll('a.btn-proximo');
    btns.forEach(btn => {
      if (!btn.getAttribute('href') || btn.getAttribute('href') === '#') {
        btn.setAttribute('href', '/trilhas');
        btn.classList.add('btn-finalizar');
        btn.addEventListener('click', e => {
          e.preventDefault();
          markDone(TOTAL_MODULES);
          showToast('Parabéns! Curso de Finanças concluído! 🏆', 4000);
          setTimeout(() => window.location.href = '/trilhas', 2800);
        });
      }
    });
  }

  /* ══════════════════════════════
     9. FONT AWESOME
     ══════════════════════════════ */
  function ensureFontAwesome() {
    const already = [...document.querySelectorAll('link')].some(l => l.href.includes('font-awesome'));
    if (!already) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }

  /* ══════════════════════════════
     10. TAG VISUAL DO MÓDULO
     ══════════════════════════════ */
  function injectModTag() {
    const h2 = document.querySelector('h2');
    if (!h2) return;

    h2.textContent = h2.textContent.replace(/^\d+\.\s*/, '').trim();

    const tag = document.createElement('div');
    tag.className = 'mod-number-tag';
    tag.innerHTML = `<i class="fa-solid fa-wallet"></i> Finanças: Módulo ${current.num} de ${TOTAL_MODULES}`;
    h2.parentNode.insertBefore(tag, h2);
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
    // O chat embutido no rodapé foi removido — a IA agora vive só no
    // ícone redondo (widget ia-fab / ia-panel), que já funciona via /api/ia.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();