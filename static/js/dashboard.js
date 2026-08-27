(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.Cognitio) return;
    const C = window.Cognitio;
    const state = C.getState();

    /* Saudação */
    const nome = state.perfil.nome && state.perfil.nome.trim() ? state.perfil.nome.trim() : "";
    document.getElementById("cog-greeting").textContent = nome ? `Olá, ${nome}! 👋` : "Olá! 👋";

    /* XP / Nível */
    const { nivel, xpNoNivel, xpParaProximo } = C.nivelAtual();
    document.getElementById("cog-xp-nivel-label").textContent = `Nível ${nivel}`;
    document.getElementById("cog-xp-fill").style.width = Math.min(100, Math.round((xpNoNivel / xpParaProximo) * 100)) + "%";
    document.getElementById("cog-xp-atual").textContent = `${xpNoNivel} / ${xpParaProximo} XP`;
    document.getElementById("cog-xp-faltam").textContent = `${xpParaProximo - xpNoNivel} XP para o próximo nível`;

    /* Streak */
    document.getElementById("cog-streak-num").textContent = state.streak.atual;
    const streakRow = document.getElementById("cog-streak-row");
    C.semanaAtualDias().forEach(d => {
      const el = document.createElement("div");
      el.className = "cog-streak-day" + (d.done ? " done" : "") + (d.isToday ? " today" : "");
      el.innerHTML = `<div class="dot">${d.done ? "✓" : "○"}</div><span class="lbl">${d.label}</span>`;
      streakRow.appendChild(el);
    });

    /* Meta semanal */
    C.registrarModuloParaMeta && null; // (não chamado aqui; apenas leitura)
    const meta = state.metaSemanal;
    const pct = Math.min(100, Math.round((meta.concluidosNaSemana / meta.alvo) * 100));
    document.getElementById("cog-goal-label").textContent = `${meta.concluidosNaSemana} / ${meta.alvo} módulos`;
    document.getElementById("cog-goal-fill").style.width = pct + "%";
    const faltam = Math.max(0, meta.alvo - meta.concluidosNaSemana);
    document.getElementById("cog-goal-text").textContent = faltam === 0
      ? "Meta semanal concluída! 🎉"
      : `Faltam ${faltam} módulo(s) para sua meta desta semana!`;

    /* Recomendação */
    const rec = C.proximoPassoRecomendado();
    const recBox = document.getElementById("cog-recomendacao");
    recBox.innerHTML = `
      <p style="font-weight:800; margin-bottom:6px;">${rec.titulo}</p>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom:14px;">${rec.texto}</p>
      <a href="${rec.link}" class="cog-btn">${rec.botao}</a>
    `;
    document.getElementById("cog-continue-btn").href = rec.link;

    /* Cursos em andamento */
    const cursosBox = document.getElementById("cog-cursos-andamento");
    const idsComProgresso = Object.keys(C.COURSES).filter(id => {
      const p = C.getProgress(id);
      return p.modulosConcluidos.length > 0 && !p.concluido;
    });
    if (idsComProgresso.length === 0) {
      cursosBox.innerHTML = `<div class="cog-card"><p style="opacity:0.7;">Você ainda não iniciou nenhum curso. <a href="/trilhas#cursos" style="color:var(--primary);font-weight:700;">Explore os cursos disponíveis →</a></p></div>`;
    } else {
      idsComProgresso.forEach(id => {
        const curso = C.COURSES[id];
        const pct = C.progressoPercentual(id);
        const p = C.getProgress(id);
        const proximoIdx = Math.min(p.modulosConcluidos.length, curso.modulos.length - 1);
        const card = document.createElement("a");
        card.className = "cog-course-mini";
        card.href = curso.modulos[proximoIdx];
        card.style.borderLeft = `4px solid ${curso.cor}`;
        card.innerHTML = `
          <div class="icon">${curso.emoji}</div>
          <div class="info">
            <strong>${curso.nome}</strong>
            <div class="mini-track"><div class="mini-fill" style="width:${pct}%; background:${curso.cor}"></div></div>
          </div>
          <div class="pct" style="color:${curso.cor}">${pct}%</div>`;
        cursosBox.appendChild(card);
      });
    }

    /* Trilha inteligente */
    const trilhaBox = document.getElementById("cog-trilha");
    const statusLabel = { concluido: "Concluído", atual: "Você está aqui", recomendado: "Recomendado", bloqueado: "Bloqueado" };
    C.statusTrilha().forEach(step => {
      const el = document.createElement("div");
      el.className = "cog-trilha-step " + step.status;
      const icon = step.status === "concluido" ? "✓" : (step.status === "bloqueado" ? "🔒" : step.curso.emoji);
      el.innerHTML = `
        <div class="cog-trilha-icon">${icon}</div>
        <div class="cog-trilha-info">
          <strong>${step.curso.nome}</strong>
          <span>${step.progresso}% concluído</span>
        </div>
        <span class="cog-trilha-tag">${statusLabel[step.status]}</span>`;
      trilhaBox.appendChild(el);
    });

    /* Desafio do dia */
    renderDesafio();
    function renderDesafio() {
      const box = document.getElementById("cog-desafio");
      const d = C.desafioDeHoje();
      box.innerHTML = `
        <span class="cog-challenge-tag">${d.area}</span>
        <p style="font-weight:700; margin:8px 0 14px; font-size:0.95rem;">${d.pergunta}</p>
        <div id="cog-desafio-opcoes"></div>
        <div id="cog-desafio-feedback" style="display:none;" class="cog-challenge-feedback"></div>
      `;
      const opcoesBox = box.querySelector("#cog-desafio-opcoes");
      d.opcoes.forEach((opcao, idx) => {
        const btn = document.createElement("button");
        btn.className = "cog-challenge-opt";
        btn.textContent = opcao;
        btn.disabled = d.respondido;
        if (d.respondido && idx === d.correta) btn.classList.add("correct");
        btn.addEventListener("click", () => {
          const res = C.responderDesafioDeHoje(idx);
          opcoesBox.querySelectorAll(".cog-challenge-opt").forEach(b => b.disabled = true);
          if (res.acertou) btn.classList.add("correct");
          else {
            btn.classList.add("wrong");
            opcoesBox.children[res.correta].classList.add("correct");
          }
          const fb = box.querySelector("#cog-desafio-feedback");
          fb.style.display = "block";
          fb.innerHTML = (res.acertou ? "✅ Você acertou! " : "❌ Não foi essa. ") + res.explicacao;
        });
        opcoesBox.appendChild(btn);
      });
      if (d.respondido) {
        const fb = box.querySelector("#cog-desafio-feedback");
        fb.style.display = "block";
        fb.innerHTML = (d.acertou ? "✅ Você já acertou o desafio de hoje! " : "❌ Você já tentou hoje. ") + d.explicacao;
      }
    }

    /* Conquistas recentes */
    const conqBox = document.getElementById("cog-conquistas-recentes");
    C.ACHIEVEMENTS.forEach(a => {
      const unlocked = state.achievementsUnlocked.includes(a.id);
      const el = document.createElement("div");
      el.className = "cog-badge" + (unlocked ? " unlocked" : "");
      el.innerHTML = `<span class="emoji">${a.emoji}</span><div class="txt"><strong>${a.nome}</strong><small>${a.desc}</small></div>`;
      conqBox.appendChild(el);
    });
  });
})();
