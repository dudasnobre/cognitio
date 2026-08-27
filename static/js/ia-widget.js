/* ══════════════════════════════════════════════════
   COGNITIO · ia-widget.js  v2.0
   Chat IA flutuante — Groq / LLaMA 3.1
   ══════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Estado ──────────────────────────────────────
  let chatHistory = [];
  let isLoading   = false;
  let panelOpen   = false;

  // ── Detecta contexto da página ──────────────────
  function getModuloInfo() {
    const h1 = document.querySelector("h1, h2");
    const titulo = h1 ? h1.innerText.trim() : "";
    const path = window.location.pathname;
    let curso = "geral";
    if (path.includes("financ") || path.includes("modulo") && titulo.toLowerCase().includes("financ")) {
      curso = "financas";
    } else if (path.includes("infor") || path.includes("modulo")) {
      curso = "informatica";
    }
    return { titulo, curso };
  }

  // ── Converte Markdown básico → HTML ─────────────
  function mdToHtml(text) {
    if (!text) return "";
    let t = text
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    // Cabeçalhos
    t = t.replace(/^### (.+)$/gm, "<strong>$1</strong>");
    t = t.replace(/^## (.+)$/gm,  "<strong>$1</strong>");
    // Negrito / itálico
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*(.+?)\*/g,     "<em>$1</em>");
    // Listas com bullet
    t = t.replace(/^[\*\-] (.+)$/gm, "• $1");
    // Parágrafos
    t = t.split(/\n{2,}/).map(p => {
      p = p.trim().replace(/\n/g, "<br>");
      return p ? `<p style="margin:0 0 8px">${p}</p>` : "";
    }).join("");
    return t;
  }

  // ── Insere mensagem na janela ────────────────────
  function appendMsg(role, content, isHtml = false) {
    const area = document.getElementById("ia-messages");
    if (!area) return;

    const wrap = document.createElement("div");
    wrap.classList.add("ia-msg", role);

    const avatar = document.createElement("div");
    avatar.classList.add("ia-msg-avatar");
    avatar.innerHTML = role === "user" ? '<i class="fa-solid fa-user"></i>'
                                       : '<i class="fa-solid fa-robot"></i>';

    const bubble = document.createElement("div");
    bubble.classList.add("ia-msg-bubble");
    if (isHtml) bubble.innerHTML = content;
    else        bubble.textContent = content;

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    area.appendChild(wrap);
    area.scrollTop = area.scrollHeight;
    return bubble;
  }

  // ── Indicador de digitação ───────────────────────
  function showTyping() {
    const area = document.getElementById("ia-messages");
    const wrap = document.createElement("div");
    wrap.classList.add("ia-msg", "assistant", "ia-typing");
    wrap.id = "ia-typing-indicator";
    wrap.innerHTML = `
      <div class="ia-msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="ia-msg-bubble">
        <div class="ia-dots"><span></span><span></span><span></span></div>
      </div>`;
    area.appendChild(wrap);
    area.scrollTop = area.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("ia-typing-indicator");
    if (el) el.remove();
  }

  // ── Envia mensagem ao backend ─────────────────────
  async function sendMessage(text) {
    if (!text || isLoading) return;
    isLoading = true;

    const sendBtn = document.getElementById("ia-send");
    const input   = document.getElementById("ia-input");
    if (sendBtn) sendBtn.disabled = true;
    if (input)   input.disabled   = true;

    appendMsg("user", text);
    chatHistory.push({ role: "user", content: text });

    showTyping();

    try {
      const { titulo } = getModuloInfo();
      const res  = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, modulo: titulo, history: chatHistory }),
      });
      const data = await res.json();
      hideTyping();

      const reply = data.reply || data.error || "Não obtive resposta.";
      appendMsg("assistant", mdToHtml(reply), true);
      chatHistory.push({ role: "assistant", content: reply });

    } catch (err) {
      hideTyping();
      appendMsg("assistant", "❌ Erro de conexão com o servidor. Verifique se o Flask está rodando.", false);
      console.error("[Cognitio IA]", err);
    } finally {
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input)   { input.disabled = false; input.focus(); }
    }
  }

  // ── Ação dos botões rápidos (Resumo / Simulado) ──
  async function quickAction(tipo) {
    const area   = document.getElementById("ia-messages");
    const { titulo, curso } = getModuloInfo();

    if (!panelOpen) togglePanel();

    const label = tipo === "resumo" ? "📄 Gerando resumo do módulo..." : "📝 Gerando mini-simulado...";
    appendMsg("user", label);

    showTyping();

    try {
      const res  = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, modulo: titulo, curso }),
      });
      const data = await res.json();
      hideTyping();

      if (data.error) {
        appendMsg("assistant", "❌ " + data.error);
        return;
      }

      if (data.tipo === "quiz" && data.questoes) {
        renderQuiz(data.questoes);
      } else if (data.conteudo) {
        appendMsg("assistant", data.conteudo, true);
      }
    } catch (err) {
      hideTyping();
      appendMsg("assistant", "❌ Erro ao conectar com a IA.");
      console.error(err);
    }
  }

  // ── Renderiza Quiz interativo ────────────────────
  function renderQuiz(questoes) {
    const area = document.getElementById("ia-messages");
    const wrap = document.createElement("div");
    wrap.classList.add("ia-msg", "assistant");
    wrap.innerHTML = `<div class="ia-msg-avatar"><i class="fa-solid fa-robot"></i></div>`;

    const container = document.createElement("div");
    container.style.cssText = "max-width:82%; display:flex; flex-direction:column; gap:14px;";

    const header = document.createElement("p");
    header.innerHTML = "<strong>🎯 Mini-Simulado gerado pela IA:</strong>";
    header.style.cssText = "margin:0 0 4px; font-size:0.88rem;";
    container.appendChild(header);

    questoes.forEach((q, i) => {
      const card = document.createElement("div");
      card.classList.add("ia-quiz-card");

      const pergunta = document.createElement("div");
      pergunta.classList.add("quiz-q");
      pergunta.textContent = `${i + 1}. ${q.pergunta}`;
      card.appendChild(pergunta);

      const exp = document.createElement("div");
      exp.classList.add("ia-quiz-exp");
      exp.innerHTML = `💡 ${q.explicacao}`;

      q.opcoes.forEach((opcao, idx) => {
        const btn = document.createElement("button");
        btn.classList.add("ia-quiz-opt");
        btn.textContent = opcao;
        btn.onclick = () => {
          card.querySelectorAll(".ia-quiz-opt").forEach(b => b.disabled = true);
          if (idx === q.resposta_correta) {
            btn.classList.add("correct");
          } else {
            btn.classList.add("wrong");
            card.querySelectorAll(".ia-quiz-opt")[q.resposta_correta].classList.add("correct");
          }
          exp.classList.add("show");
        };
        card.appendChild(btn);
      });

      card.appendChild(exp);
      container.appendChild(card);
    });

    wrap.appendChild(container);
    area.appendChild(wrap);
    area.scrollTop = area.scrollHeight;
  }

  // ── Dispatcher do "Tutor de Estudos": novos atalhos ──
  function handleQuickAction(tipo) {
    if (tipo === "resumo" || tipo === "questionario") {
      return quickAction(tipo);
    }
    if (!panelOpen) togglePanel();

    if (tipo === "explicar") {
      const { titulo } = getModuloInfo();
      const msg = titulo
        ? `Explique de um jeito simples e didático o assunto do módulo "${titulo}", como se eu fosse um completo iniciante.`
        : "Explique de um jeito simples e didático o assunto que estou estudando agora.";
      appendMsg("user", "💡 Explique este assunto");
      enviarComoContexto(msg);
      return;
    }
    if (tipo === "exercicio") {
      const { titulo } = getModuloInfo();
      const msg = `Crie um exercício prático (dissertativo, não de múltipla escolha) sobre o módulo "${titulo || "atual"}". Não dê a resposta ainda — deixe eu tentar resolver primeiro.`;
      appendMsg("user", "📝 Crie um exercício");
      enviarComoContexto(msg);
      return;
    }
    if (tipo === "erro") {
      const detalhe = window.prompt("Cole aqui o código ou a mensagem de erro que você não entendeu:");
      if (!detalhe) return;
      appendMsg("user", "🔍 Explique meu erro");
      enviarComoContexto(`Não entendi este erro/trecho de código, pode me explicar de forma simples?\n\n${detalhe}`);
      return;
    }
    if (tipo === "proximo") {
      appendMsg("user", "📚 O que devo estudar agora?");
      if (window.Cognitio) {
        const rec = window.Cognitio.proximoPassoRecomendado();
        const html = `<p><strong>${rec.titulo}</strong></p><p>${rec.texto}</p><p><a href="${rec.link}" style="color:var(--primary,#F77F00);font-weight:700;">${rec.botao}</a></p>`;
        appendMsg("assistant", html, true);
      } else {
        enviarComoContexto("Com base no que estou estudando, o que você recomenda que eu estude agora?");
      }
      return;
    }
  }

  // Envia uma mensagem "de sistema" formulada pelos atalhos, reaproveitando o fluxo normal de chat
  async function enviarComoContexto(mensagem) {
    chatHistory.push({ role: "user", content: mensagem });
    showTyping();
    try {
      const { titulo } = getModuloInfo();
      const res = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: mensagem, modulo: titulo, history: chatHistory }),
      });
      const data = await res.json();
      hideTyping();
      const reply = data.reply || data.error || "Não obtive resposta.";
      appendMsg("assistant", mdToHtml(reply), true);
      chatHistory.push({ role: "assistant", content: reply });
    } catch (err) {
      hideTyping();
      appendMsg("assistant", "❌ Erro ao conectar com a IA.");
      console.error(err);
    }
  }

  // ── Abre/fecha painel ───────────────────────────
  function togglePanel() {
    const fab     = document.getElementById("ia-fab");
    const panel   = document.getElementById("ia-panel");
    const overlay = document.getElementById("ia-overlay");
    if (!fab || !panel) return;

    panelOpen = !panelOpen;
    fab.classList.toggle("open", panelOpen);
    panel.classList.toggle("open", panelOpen);
    if (overlay) overlay.classList.toggle("active", panelOpen);

    if (panelOpen) {
      const badge = document.getElementById("ia-fab-badge");
      if (badge) badge.style.display = "none";
      const input = document.getElementById("ia-input");
      if (input) setTimeout(() => input.focus(), 400);
    }
  }

  // ── Limpa conversa ──────────────────────────────
  function clearChat() {
    chatHistory = [];
    const area = document.getElementById("ia-messages");
    if (area) {
      area.innerHTML = "";
      const { titulo } = getModuloInfo();
      const greeting = titulo
        ? `Olá! Sou a **Cognitio IA** 🤖\n\nEstou aqui para te ajudar com o módulo **"${titulo}"**.\n\nUse os botões acima para gerar um **resumo** ou um **simulado**, ou me faça qualquer pergunta!`
        : `Olá! Sou a **Cognitio IA** 🤖\n\nComo posso te ajudar hoje?`;
      appendMsg("assistant", mdToHtml(greeting), true);
    }
  }

  // ── Auto-resize do textarea ─────────────────────
  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // ── Inicialização ───────────────────────────────
  function init() {
    const fab        = document.getElementById("ia-fab");
    const overlay    = document.getElementById("ia-overlay");
    const sendBtn    = document.getElementById("ia-send");
    const input      = document.getElementById("ia-input");
    const clearBtn   = document.getElementById("ia-clear-btn");
    const closeBtn   = document.getElementById("ia-close-btn");
    const quickBtns  = document.querySelectorAll("[data-ia-action]");

    if (fab)      fab.addEventListener("click", togglePanel);
    if (overlay)  overlay.addEventListener("click", togglePanel);
    if (closeBtn) closeBtn.addEventListener("click", togglePanel);
    if (clearBtn) clearBtn.addEventListener("click", clearChat);

    if (sendBtn) {
      sendBtn.addEventListener("click", () => {
        const txt = input ? input.value.trim() : "";
        if (txt) { sendMessage(txt); if (input) input.value = ""; }
      });
    }

    if (input) {
      input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const txt = input.value.trim();
          if (txt) { sendMessage(txt); input.value = ""; autoResize(input); }
        }
      });
      input.addEventListener("input", () => autoResize(input));
    }

    quickBtns.forEach(btn => {
      btn.addEventListener("click", () => handleQuickAction(btn.dataset.iaAction));
    });

    // Mensagem inicial
    clearChat();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expõe funções globais para os botões inline dos módulos
  window.cognitioIA = { quickAction, sendMessage, togglePanel };

})();
