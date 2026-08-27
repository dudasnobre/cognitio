/* ══════════════════════════════════════════════════════════════
   COGNITIO CORE · cognitio-core.js
   Estado do aluno (XP, níveis, sequência, conquistas, progresso),
   motor de recomendação, desafio do dia e dock de navegação rápida.
   100% client-side (localStorage) — não requer backend/autenticação.
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  const STORAGE_KEY_BASE = "cognitio_state_v1";

  /* Identidade da conta logada (injetada pelo Flask em cada página).
     Isolar o estado por conta corrige o bug de perfis/XP se misturando
     entre contas diferentes no mesmo navegador. */
  function idDaContaAtual() {
    const u = global.COGNITIO_USER;
    if (u && u.id) return u.id;
    return "guest";
  }

  function chaveDeArmazenamento() {
    return STORAGE_KEY_BASE + "::" + idDaContaAtual();
  }

  /* ── Mapa de cursos e módulos (espelha as rotas do app.py) ───── */
  const COURSES = {
    informatica: {
      nome: "Informática Básica", emoji: "💻", cor: "#F77F00",
      modulos: ["/infor", "/modulo2", "/modulo3", "/modulo4", "/modulo5", "/modulo6", "/modulo7", "/modulo8", "/modulo9", "/modulo10"]
    },
    financas: {
      nome: "Educação Financeira", emoji: "💰", cor: "#1a6b3c",
      modulos: ["/financas", "/financas_modulo2", "/financas_modulo3", "/financas_modulo4", "/financas_modulo5", "/financas_modulo6", "/financas_modulo7", "/financas_modulo8", "/financas_modulo9", "/financas_modulo10"]
    },
    htmlcss: {
      nome: "HTML & CSS para Iniciantes", emoji: "🌐", cor: "#0ea5b7",
      modulos: ["/html-css", "/html-css/modulo2", "/html-css/modulo3", "/html-css/modulo4", "/html-css/modulo5", "/html-css/modulo6", "/html-css/modulo7", "/html-css/modulo8", "/html-css/modulo9", "/html-css/modulo10", "/html-css/modulo11", "/html-css/modulo12", "/html-css/modulo13", "/html-css/modulo14", "/html-css/modulo15", "/html-css/modulo16"]
    },
    javascript: {
      nome: "JavaScript", emoji: "⚡", cor: "#b38600",
      modulos: ["/javascript", "/javascript/modulo2", "/javascript/modulo3", "/javascript/modulo4", "/javascript/modulo5", "/javascript/modulo6", "/javascript/modulo7", "/javascript/modulo8", "/javascript/modulo9", "/javascript/modulo10", "/javascript/modulo11", "/javascript/modulo12"]
    },
    python: {
      nome: "Python do Zero", emoji: "🐍", cor: "#306998",
      modulos: ["/python", "/python/modulo2", "/python/modulo3", "/python/modulo4", "/python/modulo5", "/python/modulo6", "/python/modulo7", "/python/modulo8", "/python/modulo9", "/python/modulo10"]
    },
    banco: {
      nome: "Banco de Dados SQL", emoji: "🗄️", cor: "#6c35c9",
      modulos: ["/banco-de-dados", "/banco-de-dados/modulo2", "/banco-de-dados/modulo3", "/banco-de-dados/modulo4", "/banco-de-dados/modulo5", "/banco-de-dados/modulo6", "/banco-de-dados/modulo7", "/banco-de-dados/modulo8", "/banco-de-dados/modulo9", "/banco-de-dados/modulo10"]
    }
  };

  /* ── Temas de cor da conta (personalização visual) ────────────
     Cada tema redefine as custom properties já usadas em todo o
     projeto (--primary, --primary-dim, --primary-glow), então a
     troca de tema se propaga automaticamente para qualquer
     componente que já usa essas variáveis (barras de XP, botões,
     badges, trilha, dock, etc.), sem precisar editar cada página. */
  const TEMAS = {
    laranja: { nome: "Laranja Cognitio", cor: "#F77F00", dim: "rgba(247,127,0,0.14)", glow: "rgba(247,127,0,0.55)" },
    teal:    { nome: "Teal Aurora",      cor: "#0ea5b7", dim: "rgba(14,165,183,0.14)", glow: "rgba(14,165,183,0.55)" },
    violeta: { nome: "Violeta Nova",     cor: "#7C5CFF", dim: "rgba(124,92,255,0.14)", glow: "rgba(124,92,255,0.55)" },
    menta:   { nome: "Menta Cresça",     cor: "#1FAF6B", dim: "rgba(31,175,107,0.14)", glow: "rgba(31,175,107,0.55)" }
  };

  function aplicarTema(temaKey) {
    const t = TEMAS[temaKey] || TEMAS.laranja;
    const root = document.documentElement.style;
    root.setProperty("--primary", t.cor);
    root.setProperty("--primary-light", t.dim);
    root.setProperty("--primary-dim", t.dim);
    root.setProperty("--primary-glow", t.glow);
  }

  /* Trilha recomendada (ordem sugerida de progressão) */
  const TRILHA = ["informatica", "htmlcss", "javascript", "python", "banco"];
  // Finanças é uma trilha paralela e independente (não bloqueia nem é bloqueada)

  const ACHIEVEMENTS = [
    { id: "primeiro_modulo",  emoji: "🥇", nome: "Primeiro módulo concluído", desc: "Concluiu seu primeiro módulo na Cognitio.",
      check: s => Object.values(s.progress).some(c => c.modulosConcluidos.length >= 1) },
    { id: "primeiro_codigo",  emoji: "💻", nome: "Primeiro código executado", desc: "Executou código por conta própria em um laboratório.",
      check: s => s.contadores.codigosExecutados >= 1 },
    { id: "dez_exercicios",   emoji: "🧠", nome: "10 exercícios concluídos", desc: "Resolveu 10 exercícios/quizzes na plataforma.",
      check: s => s.contadores.exerciciosConcluidos >= 10 },
    { id: "sequencia_7",      emoji: "🔥", nome: "7 dias de sequência", desc: "Estudou 7 dias seguidos.",
      check: s => s.streak.max >= 7 },
    { id: "primeiro_curso",   emoji: "🎓", nome: "Primeiro curso concluído", desc: "Concluiu um curso inteiro na Cognitio.",
      check: s => Object.keys(s.progress).some(c => s.progress[c].concluido) },
    { id: "mestre_css",       emoji: "🎨", nome: "Mestre do CSS", desc: "Concluiu o curso de HTML e CSS, incluindo os módulos avançados.",
      check: s => s.progress.htmlcss && s.progress.htmlcss.concluido },
    { id: "trilha_completa",  emoji: "🏆", nome: "Trilha Full Stack", desc: "Concluiu toda a trilha principal: Informática, HTML/CSS, JavaScript, Python e Banco de Dados.",
      check: s => TRILHA.every(id => s.progress[id] && s.progress[id].concluido) }
  ];

  const NIVEIS_BASE = 200;   // XP necessário para o nível 1 -> 2
  const NIVEIS_INC  = 120;   // incremento de XP por nível

  function xpParaProximoNivel(nivel) {
    return NIVEIS_BASE + (nivel - 1) * NIVEIS_INC;
  }

  function defaultState() {
    const u = global.COGNITIO_USER || {};
    return {
      perfil: {
        nome: u.nome || "", username: u.usuario || "", bio: "Estudando na Cognitio para evoluir todos os dias. 🚀",
        avatar: "🧑‍💻", avatarFoto: null, tema: "laranja", criadoEm: new Date().toISOString().slice(0, 10)
      },
      xp: 0,
      progress: {},           // { cursoId: { modulosConcluidos:[idx], concluido:bool, concluidoEm } }
      achievementsUnlocked: [],
      streak: { atual: 0, max: 0, ultimoDia: null, dias: {} }, // dias: {"2026-08-10": true, ...}
      contadores: { exerciciosConcluidos: 0, codigosExecutados: 0, quizzesAcertados: 0 },
      metaSemanal: { alvo: 5, semanaInicio: null, concluidosNaSemana: 0 },
      desafioDoDia: { data: null, respondido: false, acertou: false },
      xpLog: []  // {data, motivo, valor} — últimos eventos, para feed de atividade
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(chaveDeArmazenamento());
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // merge com default para tolerar versões antigas / campos ausentes
      const base = defaultState();
      return deepMerge(base, parsed);
    } catch (e) {
      console.warn("[Cognitio] Estado corrompido, reiniciando.", e);
      return defaultState();
    }
  }

  function deepMerge(base, override) {
    if (typeof base !== "object" || base === null) return override !== undefined ? override : base;
    const out = Array.isArray(base) ? [] : {};
    for (const k in base) out[k] = base[k];
    if (override && typeof override === "object") {
      for (const k in override) {
        if (typeof base[k] === "object" && base[k] !== null && !Array.isArray(base[k])) {
          out[k] = deepMerge(base[k], override[k]);
        } else {
          out[k] = override[k];
        }
      }
    }
    return out;
  }

  let state = loadState();

  function save() {
    try { localStorage.setItem(chaveDeArmazenamento(), JSON.stringify(state)); } catch (e) { /* quota / privado */ }
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function nivelAtual() {
    let nivel = 1, restante = state.xp;
    while (restante >= xpParaProximoNivel(nivel)) {
      restante -= xpParaProximoNivel(nivel);
      nivel++;
    }
    return { nivel, xpNoNivel: restante, xpParaProximo: xpParaProximoNivel(nivel) };
  }

  /* ── Toast simples de feedback (XP / conquista) ──────────────── */
  function ensureToastRoot() {
    let root = document.getElementById("cog-toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "cog-toast-root";
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }
    return root;
  }

  function toast(html, kind) {
    const root = ensureToastRoot();
    const el = document.createElement("div");
    el.className = "cog-toast cog-toast-" + (kind || "info");
    el.innerHTML = html;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 350);
    }, 3800);
  }

  /* ── XP e conquistas ──────────────────────────────────────────── */
  function ganharXP(valor, motivo) {
    state.xp += valor;
    state.xpLog.unshift({ data: new Date().toISOString(), motivo, valor });
    state.xpLog = state.xpLog.slice(0, 25);
    save();
    toast(`<i class="fa-solid fa-bolt"></i> <strong>+${valor} XP</strong> — ${motivo}`, "xp");
    verificarConquistas();
    atualizarDock();
  }

  function verificarConquistas() {
    ACHIEVEMENTS.forEach(a => {
      if (!state.achievementsUnlocked.includes(a.id) && a.check(state)) {
        state.achievementsUnlocked.push(a.id);
        save();
        setTimeout(() => {
          toast(`<i class="fa-solid fa-trophy"></i> <strong>Conquista desbloqueada!</strong><br>${a.emoji} ${a.nome}`, "achievement");
        }, 600);
      }
    });
  }

  /* ── Sequência de estudos (streak) ────────────────────────────── */
  function registrarVisitaHoje() {
    const hoje = todayStr();
    if (state.streak.dias[hoje]) return; // já contabilizado hoje
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak.dias[hoje] = true;
    if (state.streak.ultimoDia === ontem || state.streak.ultimoDia === null) {
      state.streak.atual = state.streak.ultimoDia === null ? 1 : state.streak.atual + 1;
    } else if (state.streak.ultimoDia !== hoje) {
      state.streak.atual = 1; // quebrou a sequência
    }
    state.streak.max = Math.max(state.streak.max, state.streak.atual);
    state.streak.ultimoDia = hoje;
    save();
    verificarConquistas();
  }

  function semanaAtualDias() {
    // Retorna array [{label, date, done}] de SEG a DOM da semana corrente
    const labels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
    const hoje = new Date();
    const diaSemana = (hoje.getDay() + 6) % 7; // 0 = segunda
    const segunda = new Date(hoje); segunda.setDate(hoje.getDate() - diaSemana);
    return labels.map((label, i) => {
      const d = new Date(segunda); d.setDate(segunda.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { label, date: key, done: !!state.streak.dias[key], isToday: key === todayStr() };
    });
  }

  /* ── Progresso de cursos ──────────────────────────────────────── */
  function cursoIdPorPath(path) {
    for (const id in COURSES) {
      if (COURSES[id].modulos.includes(path)) return id;
    }
    return null;
  }

  function indiceModuloPorPath(cursoId, path) {
    return COURSES[cursoId].modulos.indexOf(path);
  }

  function getProgress(cursoId) {
    if (!state.progress[cursoId]) {
      state.progress[cursoId] = { modulosConcluidos: [], concluido: false, concluidoEm: null };
    }
    return state.progress[cursoId];
  }

  function marcarModuloConcluido(cursoId, idx, silencioso) {
    const p = getProgress(cursoId);
    if (!p.modulosConcluidos.includes(idx)) {
      p.modulosConcluidos.push(idx);
      save();
      if (!silencioso) ganharXP(20, `Módulo concluído em ${COURSES[cursoId].nome}`);
    }
  }

  function marcarCursoConcluido(cursoId) {
    const p = getProgress(cursoId);
    const total = COURSES[cursoId].modulos.length;
    for (let i = 0; i < total; i++) if (!p.modulosConcluidos.includes(i)) p.modulosConcluidos.push(i);
    if (!p.concluido) {
      p.concluido = true;
      p.concluidoEm = todayStr();
      save();
      ganharXP(100, `Curso concluído: ${COURSES[cursoId].nome}`);
    } else {
      save();
    }
  }

  function progressoPercentual(cursoId) {
    const p = getProgress(cursoId);
    const total = COURSES[cursoId].modulos.length;
    return Math.round((p.modulosConcluidos.length / total) * 100);
  }

  /* Detecta automaticamente a página atual e registra progresso implícito:
     se o aluno chegou ao módulo N, os módulos 1..N-1 foram vistos. */
  function detectarProgressoAtual() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    const cursoId = cursoIdPorPath(path);
    if (!cursoId) return null;
    const idx = indiceModuloPorPath(cursoId, path);
    for (let i = 0; i < idx; i++) marcarModuloConcluido(cursoId, i, true); // sem toast, é retroativo
    save();
    return { cursoId, idx };
  }

  /* ── Meta semanal ─────────────────────────────────────────────── */
  function inicioDaSemana() {
    const hoje = new Date();
    const diaSemana = (hoje.getDay() + 6) % 7;
    const segunda = new Date(hoje); segunda.setDate(hoje.getDate() - diaSemana);
    return segunda.toISOString().slice(0, 10);
  }

  function sincronizarMetaSemanal() {
    const inicio = inicioDaSemana();
    if (state.metaSemanal.semanaInicio !== inicio) {
      state.metaSemanal.semanaInicio = inicio;
      state.metaSemanal.concluidosNaSemana = 0;
      save();
    }
  }

  function registrarModuloParaMeta() {
    sincronizarMetaSemanal();
    state.metaSemanal.concluidosNaSemana++;
    save();
  }

  /* ── Desafio do dia ───────────────────────────────────────────── */
  const BANCO_DESAFIOS = [
    { area: "Informática", pergunta: "Qual componente é conhecido como o 'cérebro' do computador?", opcoes: ["HD/SSD", "CPU", "Fonte de alimentação", "Placa de rede"], correta: 1, explicacao: "A CPU (Central Processing Unit) processa as instruções e é considerada o cérebro do computador." },
    { area: "Lógica", pergunta: "Em lógica de programação, o que uma estrutura de repetição (loop) permite fazer?", opcoes: ["Executar um bloco de código várias vezes", "Armazenar apenas um valor", "Impedir que o programa rode", "Criar variáveis globais"], correta: 0, explicacao: "Loops (como for/while) repetem um bloco de código enquanto uma condição for satisfeita." },
    { area: "SQL", pergunta: "Qual comando SQL é usado para buscar dados de uma tabela?", opcoes: ["INSERT", "UPDATE", "SELECT", "DELETE"], correta: 2, explicacao: "SELECT é o comando padrão para consultar/recuperar dados de uma ou mais tabelas." },
    { area: "Segurança", pergunta: "Qual é a prática mais recomendada para proteger uma conta online?", opcoes: ["Usar a mesma senha em todos os sites", "Ativar a autenticação em duas etapas (2FA)", "Compartilhar a senha com amigos", "Nunca trocar a senha"], correta: 1, explicacao: "A autenticação em duas etapas adiciona uma camada extra de segurança além da senha." },
    { area: "Redes", pergunta: "O que significa a sigla 'Wi-Fi' popularmente?", opcoes: ["Uma tecnologia de rede sem fio", "Um tipo de vírus", "Um cabo de rede", "Um sistema operacional"], correta: 0, explicacao: "Wi-Fi é a tecnologia que permite conexão à internet sem fios, via ondas de rádio." },
    { area: "Programação", pergunta: "Em JavaScript, qual palavra-chave declara uma variável que pode ser reatribuída?", opcoes: ["const", "let", "function", "class"], correta: 1, explicacao: "'let' declara variáveis que podem ter seu valor alterado; 'const' não pode ser reatribuída." },
    { area: "Finanças", pergunta: "O que é uma 'reserva de emergência'?", opcoes: ["Um empréstimo bancário", "Dinheiro guardado para imprevistos", "Um tipo de investimento de alto risco", "Uma dívida parcelada"], correta: 1, explicacao: "A reserva de emergência é um valor guardado para cobrir imprevistos sem recorrer a dívidas." },
    { area: "HTML", pergunta: "Qual tag HTML é usada para criar um link?", opcoes: ["<link>", "<a>", "<href>", "<url>"], correta: 1, explicacao: "A tag <a> (anchor) com o atributo href cria links em HTML." },
    { area: "CSS", pergunta: "Qual propriedade CSS controla o espaçamento interno de um elemento?", opcoes: ["margin", "padding", "border", "gap"], correta: 1, explicacao: "'padding' controla o espaço interno entre o conteúdo e a borda do elemento." },
    { area: "Python", pergunta: "Qual função é usada para exibir algo no console em Python?", opcoes: ["console.log()", "echo()", "print()", "display()"], correta: 2, explicacao: "print() exibe valores na saída padrão em Python." }
  ];

  function hashDia(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function desafioDeHoje() {
    const hoje = todayStr();
    if (state.desafioDoDia.data !== hoje) {
      state.desafioDoDia = { data: hoje, respondido: false, acertou: false };
      save();
    }
    const idx = hashDia(hoje) % BANCO_DESAFIOS.length;
    return { ...BANCO_DESAFIOS[idx], respondido: state.desafioDoDia.respondido, acertou: state.desafioDoDia.acertou };
  }

  function responderDesafioDeHoje(opcaoEscolhida) {
    const d = desafioDeHoje();
    if (state.desafioDoDia.respondido) return { jaRespondeu: true, acertou: d.acertou, explicacao: d.explicacao, correta: d.correta };
    const acertou = opcaoEscolhida === d.correta;
    state.desafioDoDia.respondido = true;
    state.desafioDoDia.acertou = acertou;
    state.contadores.exerciciosConcluidos++;
    save();
    if (acertou) ganharXP(15, "Desafio do dia acertado");
    else { save(); verificarConquistas(); }
    return { jaRespondeu: false, acertou, explicacao: d.explicacao, correta: d.correta };
  }

  /* ── Motor de recomendação ("O que estudar agora?") ──────────── */
  function proximoPassoRecomendado() {
    // 1) Curso em andamento com maior progresso parcial (não concluído)
    let melhorParcial = null;
    for (const id of Object.keys(state.progress)) {
      const p = state.progress[id];
      if (!p.concluido && p.modulosConcluidos.length > 0) {
        if (!melhorParcial || p.modulosConcluidos.length > state.progress[melhorParcial].modulosConcluidos.length) {
          melhorParcial = id;
        }
      }
    }
    if (melhorParcial) {
      const total = COURSES[melhorParcial].modulos.length;
      const feitos = getProgress(melhorParcial).modulosConcluidos.length;
      const proximoIdx = Math.min(feitos, total - 1);
      return {
        tipo: "continuar",
        titulo: `Continue de onde parou em ${COURSES[melhorParcial].nome}`,
        texto: `Você já concluiu ${feitos} de ${total} módulos. Continue para não perder o ritmo.`,
        link: COURSES[melhorParcial].modulos[proximoIdx],
        botao: "Continuar estudando →"
      };
    }
    // 2) Próximo curso da trilha recomendada ainda não iniciado
    for (const id of TRILHA) {
      if (!state.progress[id] || state.progress[id].modulosConcluidos.length === 0) {
        return {
          tipo: "iniciar",
          titulo: `Comece: ${COURSES[id].nome}`,
          texto: "Este é o próximo passo recomendado na sua trilha de estudos.",
          link: COURSES[id].modulos[0],
          botao: "Começar agora →"
        };
      }
    }
    // 3) Tudo em dia na trilha principal — sugerir Finanças ou revisão
    if (!state.progress.financas || state.progress.financas.modulosConcluidos.length === 0) {
      return {
        tipo: "iniciar",
        titulo: "Explore Educação Financeira",
        texto: "Você está em dia com a trilha de tecnologia. Que tal aprender a organizar sua vida financeira?",
        link: COURSES.financas.modulos[0],
        botao: "Começar agora →"
      };
    }
    return {
      tipo: "revisao",
      titulo: "Você está com tudo em dia! 🎉",
      texto: "Continue praticando nos laboratórios ou tente o Desafio do Dia para ganhar mais XP.",
      link: "/dashboard",
      botao: "Ver painel →"
    };
  }

  /* ── Trilha inteligente (status por curso) ───────────────────── */
  function statusTrilha() {
    return TRILHA.map((id, i) => {
      const p = getProgress(id);
      const anteriorId = TRILHA[i - 1];
      const anteriorConcluido = !anteriorId || getProgress(anteriorId).concluido;
      let status;
      if (p.concluido) status = "concluido";
      else if (p.modulosConcluidos.length > 0) status = "atual";
      else if (anteriorConcluido) status = "recomendado";
      else status = "bloqueado";
      return { id, curso: COURSES[id], status, progresso: progressoPercentual(id) };
    });
  }

  /* ── Dock de navegação flutuante (injetado em todas as páginas) ─ */
  function atualizarDock() {
    const { nivel } = nivelAtual();
    const xpEl = document.querySelector("#cog-dock-xp");
    const nivelEl = document.querySelector("#cog-dock-nivel");
    const streakEl = document.querySelector("#cog-dock-streak");
    if (xpEl) xpEl.textContent = state.xp;
    if (nivelEl) nivelEl.textContent = nivel;
    if (streakEl) streakEl.textContent = state.streak.atual;
  }

  function injetarDock() {
    if (document.getElementById("cog-dock")) return;
    const { nivel } = nivelAtual();
    const dock = document.createElement("div");
    dock.id = "cog-dock";
    dock.innerHTML = `
      <a href="/dashboard" class="cog-dock-item" title="Painel"><i class="fa-solid fa-gauge-high"></i><span>Painel</span></a>
      <a href="/perfil" class="cog-dock-item" title="Perfil"><i class="fa-solid fa-user"></i><span>Perfil</span></a>
      <a href="/trilhas" class="cog-dock-item" title="Cursos"><i class="fa-solid fa-book-open"></i><span>Cursos</span></a>
      <div class="cog-dock-stat" title="Nível atual"><i class="fa-solid fa-star"></i><span id="cog-dock-nivel">${nivel}</span></div>
      <div class="cog-dock-stat" title="XP total"><i class="fa-solid fa-bolt"></i><span id="cog-dock-xp">${state.xp}</span></div>
      <div class="cog-dock-stat" title="Sequência de estudos"><i class="fa-solid fa-fire"></i><span id="cog-dock-streak">${state.streak.atual}</span></div>
    `;
    document.body.appendChild(dock);

    const toggle = document.createElement("button");
    toggle.id = "cog-dock-toggle";
    toggle.setAttribute("aria-label", "Abrir menu rápido Cognitio");
    toggle.innerHTML = '<i class="fa-solid fa-layer-group"></i>';
    toggle.addEventListener("click", () => dock.classList.toggle("cog-dock-open"));
    document.body.appendChild(toggle);
  }

  /* ── Certificado / conclusão de curso (modal) ────────────────── */
  function mostrarCertificado(cursoId, hrefDestino) {
    const curso = COURSES[cursoId];
    const p = getProgress(cursoId);
    const nome = state.perfil.nome || "Aluno(a) Cognitio";
    const overlay = document.createElement("div");
    overlay.id = "cog-cert-overlay";
    overlay.innerHTML = `
      <div class="cog-cert-card">
        <button class="cog-cert-close" aria-label="Fechar">&times;</button>
        <div class="cog-cert-emoji">🎓</div>
        <h2>Curso concluído!</h2>
        <p class="cog-cert-curso">${curso.emoji} ${curso.nome}</p>
        <div class="cog-cert-linha"></div>
        <p class="cog-cert-aluno">Certificamos que <strong>${escapeHtml(nome)}</strong></p>
        <p>concluiu com sucesso todos os módulos deste curso em <strong>${formatarData(todayStr())}</strong>.</p>
        <div class="cog-cert-stats">
          <div><strong>${curso.modulos.length}</strong><span>Módulos</span></div>
          <div><strong>100%</strong><span>Progresso</span></div>
          <div><strong>+100</strong><span>XP ganho</span></div>
        </div>
        <button class="cog-cert-btn" id="cog-cert-continuar">Continuar explorando →</button>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    function fechar() {
      overlay.classList.remove("show");
      setTimeout(() => {
        overlay.remove();
        if (hrefDestino) window.location.href = hrefDestino;
      }, 300);
    }
    overlay.querySelector(".cog-cert-close").addEventListener("click", fechar);
    overlay.querySelector("#cog-cert-continuar").addEventListener("click", fechar);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function formatarData(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  /* ── Favicon: injetado em runtime para não exigir edição de cada
     template. As navbars de curso (.mod-topbar-logo) e as páginas com
     navbar própria (.logo, .auth-brand) já exibem a marca via <img>
     direto no HTML/JS de cada curso — nada a injetar aqui além do favicon. */
  function injetarFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "/static/img/favicon.svg";
    document.head.appendChild(link);
  }

  /* ── Hooks automáticos ao carregar a página ──────────────────── */
  const PAGINAS_SEM_DOCK = ["/", "/login"];

  function inicializar() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    const paginaDeLogin = PAGINAS_SEM_DOCK.includes(path);

    injetarFavicon();
    aplicarTema(state.perfil.tema);

    if (!paginaDeLogin) {
      registrarVisitaHoje();
      sincronizarMetaSemanal();
    }
    const atual = detectarProgressoAtual();
    verificarConquistas();
    if (!paginaDeLogin) injetarDock();

    // Botões "Concluir curso/trilha" existentes no projeto
    document.querySelectorAll("[data-cognitio-complete-course]").forEach(btn => {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        const cursoId = btn.getAttribute("data-cognitio-complete-course");
        const destino = btn.getAttribute("href") || "/trilhas";
        if (atual && atual.cursoId === cursoId) marcarModuloConcluido(cursoId, atual.idx, true);
        marcarCursoConcluido(cursoId);
        registrarModuloParaMeta();
        mostrarCertificado(cursoId, destino);
      });
    });

    // Link "Perguntar à Cognitio IA" contextual, se presente na página
    document.querySelectorAll("[data-cognitio-ask-ia]").forEach(btn => {
      btn.addEventListener("click", () => {
        const fab = document.getElementById("ia-fab");
        if (fab) fab.click();
      });
    });

    injetarCaixaPerguntarIA();

    // Registra "código executado" nos laboratórios (SQL, JS, HTML/CSS) para a conquista 💻
    ["sql-run", "js-run", "html-lab-run"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => global.Cognitio.marcarCodigoExecutado());
    });
  }

  /* Insere automaticamente "Não entendeu este módulo? Perguntar à Cognitio IA"
     em qualquer página de módulo que tenha .main-card + widget de IA, sem
     precisar editar cada template manualmente. */
  function injetarCaixaPerguntarIA() {
    const mainCard = document.querySelector(".main-card");
    const fab = document.getElementById("ia-fab");
    if (!mainCard || !fab || document.querySelector(".cog-ask-ia-box")) return;
    const box = document.createElement("div");
    box.className = "cog-ask-ia-box";
    box.innerHTML = `
      <p>🤔 Não entendeu este módulo?</p>
      <button type="button" data-cognitio-ask-ia><i class="fa-solid fa-robot"></i> Perguntar à Cognitio IA</button>
    `;
    const buttonContainer = mainCard.querySelector(".button-container");
    if (buttonContainer) buttonContainer.parentNode.insertBefore(box, buttonContainer);
    else mainCard.appendChild(box);
    box.querySelector("[data-cognitio-ask-ia]").addEventListener("click", () => fab.click());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
  } else {
    inicializar();
  }

  /* ── API pública ──────────────────────────────────────────────── */
  global.Cognitio = {
    COURSES, TRILHA, ACHIEVEMENTS, TEMAS,
    getState: () => state,
    aplicarTema,
    saveProfile: (data) => {
      state.perfil = { ...state.perfil, ...data };
      save();
      if (data.tema) aplicarTema(data.tema);
    },
    ganharXP, nivelAtual, xpParaProximoNivel,
    semanaAtualDias,
    getProgress, progressoPercentual, marcarModuloConcluido, marcarCursoConcluido,
    registrarModuloParaMeta,
    desafioDeHoje, responderDesafioDeHoje,
    proximoPassoRecomendado, statusTrilha,
    marcarExercicioConcluido: (acertou) => {
      state.contadores.exerciciosConcluidos++;
      if (acertou) state.contadores.quizzesAcertados++;
      save();
      ganharXP(10, acertou ? "Exercício acertado" : "Exercício concluído");
    },
    marcarCodigoExecutado: () => {
      state.contadores.codigosExecutados++;
      save();
      verificarConquistas();
    },
    toast,
    resetarProgresso: () => { state = defaultState(); save(); location.reload(); }
  };

})(window);
