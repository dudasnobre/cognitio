/* ══════════════════════════════════════════════════════════
   COGNITIO · banco.js  —  Curso de Banco de Dados
   Mesmo padrão do infor.js + lógica da VM SQL
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── CONFIG ─── */
  const COURSE_TITLE  = 'Banco de Dados';
  const TOTAL_MODULES = 10;

  const MODULES = [
    { num: 1,  title: 'Introdução a Bancos de Dados', route: '/banco-de-dados'          },
    { num: 2,  title: 'Modelo Relacional',            route: '/banco-de-dados/modulo2'  },
    { num: 3,  title: 'SELECT — Consultando Dados',   route: '/banco-de-dados/modulo3'  },
    { num: 4,  title: 'WHERE e ORDER BY',             route: '/banco-de-dados/modulo4'  },
    { num: 5,  title: 'JOIN — Relacionando Tabelas',  route: '/banco-de-dados/modulo5'  },
    { num: 6,  title: 'INSERT, UPDATE e DELETE',      route: '/banco-de-dados/modulo6'  },
    { num: 7,  title: 'GROUP BY e Agregações',        route: '/banco-de-dados/modulo7'  },
    { num: 8,  title: 'Subconsultas (Subqueries)',    route: '/banco-de-dados/modulo8'  },
    { num: 9,  title: 'Chaves e Índices',             route: '/banco-de-dados/modulo9'  },
    { num: 10, title: 'Projeto Final',                route: '/banco-de-dados/modulo10' },
  ];

  /* ─── Utils ─── */
  const isDone   = n => JSON.parse(localStorage.getItem('bd_done') || '[]').includes(n);
  const markDone = n => {
    const done = JSON.parse(localStorage.getItem('bd_done') || '[]');
    if (!done.includes(n)) { done.push(n); localStorage.setItem('bd_done', JSON.stringify(done)); }
  };
  const getDoneCount = () => JSON.parse(localStorage.getItem('bd_done') || '[]').length;

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
          <i class="fa-solid fa-database" style="font-size:.7rem"></i>
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
      <span class="sidebar-label"><i class="fa-solid fa-database" style="margin-right:5px"></i>Módulos do curso</span>
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

    const toMove = [...document.body.children].filter(el =>
      !['NAV'].includes(el.tagName) &&
      el.tagName !== 'ASIDE' &&
      !el.id.startsWith('sidebar') &&
      el.id !== 'read-progress' &&
      el.id !== 'mod-toast' &&
      !el.classList.contains('mod-topbar') &&
      !el.classList.contains('mod-sidebar') &&
      !el.id.startsWith('ia-')
    );

    toMove.forEach(el => main.appendChild(el));
    const sidebar = document.getElementById('mod-sidebar');
    layout.appendChild(sidebar);
    layout.appendChild(main);
    document.body.appendChild(layout);
  }

  /* ══════════════════════════════
     4. Barra de leitura
     ══════════════════════════════ */
  function buildReadProgress() {
    const bar = document.createElement('div');
    bar.id = 'read-progress';
    document.body.prepend(bar);
    window.addEventListener('scroll', () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const p = docH > 0 ? (window.scrollY / docH) * 100 : 0;
      bar.style.width = Math.min(p, 100) + '%';
      if (p > 90) markDone(current.num);
    }, { passive: true });
  }

  /* ══════════════════════════════
     5. Toast
     ══════════════════════════════ */
  function buildToast() {
    const t = document.createElement('div');
    t.id = 'mod-toast';
    t.innerHTML = `<i class="fa-solid fa-circle-check"></i><span id="toast-msg"></span>`;
    document.body.appendChild(t);
  }

  function showToast(msg, duration = 3200) {
    const t = document.getElementById('mod-toast');
    const txt = document.getElementById('toast-msg');
    if (!t || !txt) return;
    txt.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
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
      if (current.num === 1) showToast('Bem-vindo ao curso de Banco de Dados! 🗄️', 3500);
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
    tag.innerHTML = `<i class="fa-solid fa-database"></i> Módulo ${current.num} de ${TOTAL_MODULES}`;
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
          showToast('Curso de Banco de Dados concluído! 🏆', 4000);
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
     11. VM SQL
     ══════════════════════════════ */
  function initVMSQL() {
    const editor   = document.getElementById('sql-editor');
    const runBtn   = document.getElementById('sql-run');
    const resetBtn = document.getElementById('sql-reset');
    const hintBtn  = document.getElementById('sql-hint');
    const result   = document.getElementById('sql-result');
    if (!editor || !runBtn || !result) return;

    // Snippets
    document.querySelectorAll('.sql-snippet').forEach(btn => {
      btn.addEventListener('click', () => {
        editor.value = btn.dataset.sql || btn.textContent;
        editor.focus();
      });
    });

    // Tab inside editor
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = editor.selectionStart, end = editor.selectionEnd;
        editor.value = editor.value.substring(0, s) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = s + 2;
      }
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runSQL(); }
    });

    async function runSQL() {
      const sql = editor.value.trim();
      if (!sql) return;
      runBtn.disabled = true;
      result.innerHTML = `<div class="sql-loading"><i class="fa-solid fa-spinner fa-spin"></i> Executando...</div>`;
      try {
        const res  = await fetch('/api/sql/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await res.json();
        if (data.error) {
          result.innerHTML = `<div class="sql-result-error"><i class="fa-solid fa-circle-xmark"></i> ${data.error}</div>`;
        } else if (data.type === 'select') {
          const head = data.columns.map(c => `<th>${c}</th>`).join('');
          const rows = data.rows.map(r =>
            `<tr>${r.map(v => `<td>${v ?? '<em style="color:var(--muted)">NULL</em>'}</td>`).join('')}</tr>`
          ).join('');
          result.innerHTML = `
            <table class="sql-result-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
            <div class="sql-result-meta"><i class="fa-solid fa-circle-info"></i> ${data.rowcount} linha(s) retornada(s)</div>`;
        } else {
          result.innerHTML = `<div class="sql-result-success"><i class="fa-solid fa-circle-check"></i> ${data.message}</div>`;
        }
      } catch (e) {
        result.innerHTML = `<div class="sql-result-error">Erro de conexão com o servidor.</div>`;
      } finally {
        runBtn.disabled = false;
      }
    }

    runBtn.addEventListener('click', runSQL);

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (!confirm('Resetar o banco de dados demo para o estado original?')) return;
        const res  = await fetch('/api/sql/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await res.json();
        result.innerHTML = `<div class="sql-result-success">${data.message}</div>`;
        showToast('Banco resetado! ♻️');
      });
    }

    if (hintBtn) {
      hintBtn.addEventListener('click', async () => {
        const sql   = editor.value.trim();
        const errEl = result.querySelector('.sql-result-error');
        const erro  = errEl ? errEl.textContent.replace(/^[^\w]+/, '') : '';
        hintBtn.disabled = true;

        // Append IA response below current result
        const iaDiv = document.createElement('div');
        iaDiv.className = 'sql-ia-response';
        iaDiv.innerHTML = `<div class="sql-loading"><i class="fa-solid fa-robot"></i>&nbsp;<i class="fa-solid fa-spinner fa-spin"></i> Consultando Cognitio IA...</div>`;
        result.appendChild(iaDiv);

        try {
          const res  = await fetch('/api/ia/sql-hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, erro, contexto: current.title })
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
    initVMSQL();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
