/* ══════════════════════════════════════════════════════════
   COGNITIO · javascript.js  —  Curso de JavaScript
   Mesmo padrão do banco.js + Terminal JS interativo (sandbox)
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── CONFIG ─── */
  const COURSE_TITLE  = 'JavaScript';
  const TOTAL_MODULES = 12;
  const STORAGE_KEY   = 'js_done';

  const MODULES = [
    { num: 1,  title: 'Introdução ao JavaScript',            route: '/javascript'          },
    { num: 2,  title: 'Variáveis e Tipos de Dados',          route: '/javascript/modulo2'  },
    { num: 3,  title: 'Operadores e Condicionais',           route: '/javascript/modulo3'  },
    { num: 4,  title: 'Funções',                             route: '/javascript/modulo4'  },
    { num: 5,  title: 'Arrays e Objetos',                    route: '/javascript/modulo5'  },
    { num: 6,  title: 'DOM — Manipulando a Página',          route: '/javascript/modulo6'  },
    { num: 7,  title: 'Eventos e Fetch (APIs)',               route: '/javascript/modulo7'  },
    { num: 8,  title: 'DOM Avançado e Formulários',          route: '/javascript/modulo8'  },
    { num: 9,  title: 'Armazenamento no Navegador',          route: '/javascript/modulo9'  },
    { num: 10, title: 'JavaScript Moderno (ES6+)',           route: '/javascript/modulo10' },
    { num: 11, title: 'Boas Práticas e Debugging',           route: '/javascript/modulo11' },
    { num: 12, title: 'Projeto Final',                       route: '/javascript/modulo12' },
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
          <i class="fa-brands fa-js" style="font-size:.7rem"></i>
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
      <span class="sidebar-label"><i class="fa-brands fa-js" style="margin-right:5px"></i>Módulos do curso</span>
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
      if (current.num === 1) showToast('Bem-vindo ao curso de JavaScript! ⚡', 3500);
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
    tag.innerHTML = `<i class="fa-brands fa-js"></i> Módulo ${current.num} de ${TOTAL_MODULES}`;
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
          showToast('Curso de JavaScript concluído! 🏆', 4000);
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

  /* ══════════════════════════════
     11. Terminal JS (sandbox seguro)
     ══════════════════════════════ */
  function initTerminalJS() {
    const editor   = document.getElementById('js-editor');
    const runBtn   = document.getElementById('js-run');
    const resetBtn = document.getElementById('js-reset');
    const hintBtn  = document.getElementById('js-hint');
    const result   = document.getElementById('js-result');
    if (!editor || !runBtn || !result) return;

    // Snippets
    document.querySelectorAll('.js-snippet').forEach(btn => {
      btn.addEventListener('click', () => {
        editor.value = btn.dataset.js || btn.textContent;
        editor.focus();
      });
    });

    // Tab dentro do editor
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = editor.selectionStart, end = editor.selectionEnd;
        editor.value = editor.value.substring(0, s) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = s + 2;
      }
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runJS(); }
    });

    function runJS() {
      const code = editor.value.trim();
      if (!code) return;
      runBtn.disabled = true;

      const logs = [];
      const originalConsoleLog = console.log;

      // Intercepta console.log
      const sandboxConsole = {
        log:   (...args) => logs.push({ type: 'log',   text: args.map(formatVal).join(' ') }),
        warn:  (...args) => logs.push({ type: 'warn',  text: args.map(formatVal).join(' ') }),
        error: (...args) => logs.push({ type: 'error', text: args.map(formatVal).join(' ') }),
        info:  (...args) => logs.push({ type: 'info',  text: args.map(formatVal).join(' ') }),
      };

      function formatVal(v) {
        if (v === null) return 'null';
        if (v === undefined) return 'undefined';
        if (typeof v === 'string') return v;
        if (typeof v === 'function') return v.toString().split('{')[0].trim() + '{ ... }';
        try { return JSON.stringify(v, null, 2); } catch { return String(v); }
      }

      try {
        // Sandbox: injeta console fake e bloqueia window/document em módulos iniciais
        const fn = new Function(
          'console', 'alert', 'confirm', 'prompt',
          '"use strict";\n' + code
        );
        const returnVal = fn(sandboxConsole, (m) => logs.push({ type: 'log', text: `alert: ${m}` }), () => false, () => null);
        if (returnVal !== undefined) logs.push({ type: 'return', text: String(formatVal(returnVal)) });
      } catch (err) {
        logs.push({ type: 'error', text: err.message });
      }

      if (logs.length === 0) {
        result.innerHTML = `<div class="js-result-muted"><i class="fa-solid fa-circle-info"></i> Código executado sem saída. Use <code>console.log()</code> para ver resultados.</div>`;
      } else {
        const lines = logs.map(l => {
          const icon = l.type === 'error' ? '✖' : l.type === 'warn' ? '⚠' : l.type === 'return' ? '→' : '›';
          const cls  = `js-line js-line-${l.type}`;
          const pre = l.text.includes('\n') ? `<pre>${escHtml(l.text)}</pre>` : escHtml(l.text);
          return `<div class="${cls}"><span class="js-line-icon">${icon}</span><span>${pre}</span></div>`;
        }).join('');
        result.innerHTML = `<div class="js-output">${lines}</div>`;
      }

      runBtn.disabled = false;
    }

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    runBtn.addEventListener('click', runJS);

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        editor.value = editor.getAttribute('data-default') || '';
        result.innerHTML = `<p style="color:var(--muted);font-size:.84rem"><i class="fa-solid fa-arrow-up"></i> Execute o código para ver o resultado.</p>`;
        showToast('Editor resetado! ♻️');
      });
    }

    if (hintBtn) {
      hintBtn.addEventListener('click', async () => {
        const code  = editor.value.trim();
        const errEl = result.querySelector('.js-line-error');
        const erro  = errEl ? errEl.textContent.replace(/^[^\w]+/, '') : '';
        hintBtn.disabled = true;

        const iaDiv = document.createElement('div');
        iaDiv.className = 'js-ia-response';
        iaDiv.innerHTML = `<div class="js-loading"><i class="fa-solid fa-robot"></i>&nbsp;<i class="fa-solid fa-spinner fa-spin"></i> Consultando Cognitio IA...</div>`;
        result.appendChild(iaDiv);

        try {
          const res  = await fetch('/api/ia/js-hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, erro, contexto: current.title })
          });
          const data = await res.json();
          iaDiv.innerHTML = `<strong><i class="fa-solid fa-robot"></i> Cognitio IA:</strong><div style="margin-top:8px;line-height:1.65">${data.reply || data.error}</div>`;
        } catch (e) {
          iaDiv.innerHTML = 'Erro ao consultar a IA.';
        } finally {
          hintBtn.disabled = false;
        }
      });
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
    initTerminalJS();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
