(function () {
  "use strict";
  const AVATARES = ["🧑‍💻", "👩‍💻", "🧑‍🎓", "👩‍🎓", "🦉", "🚀", "🐍", "⚡", "🧠", "🔥", "🎯", "🌱"];
  let temaSelecionado = null; // rascunho do tema enquanto o form de edição está aberto

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.Cognitio) return;
    const C = window.Cognitio;

    function renderAvatar(p) {
      const foto = document.getElementById("cog-perfil-avatar-foto");
      const emoji = document.getElementById("cog-perfil-avatar-emoji");
      const removeBtn = document.getElementById("cog-avatar-remove-btn");
      if (p.avatarFoto) {
        foto.src = p.avatarFoto;
        foto.style.display = "block";
        emoji.style.display = "none";
        removeBtn.style.display = "flex";
      } else {
        foto.style.display = "none";
        emoji.style.display = "block";
        emoji.textContent = p.avatar || "🧑‍💻";
        removeBtn.style.display = "none";
      }
    }

    function render() {
      const state = C.getState();
      const p = state.perfil;
      renderAvatar(p);
      document.getElementById("cog-perfil-nome").textContent = p.nome && p.nome.trim() ? p.nome.trim() : "Aluno(a) Cognitio";
      document.getElementById("cog-perfil-username").textContent = "@" + (p.username && p.username.trim() ? p.username.trim() : "aluno");
      document.getElementById("cog-perfil-bio").textContent = p.bio || "—";
      const email = (window.COGNITIO_USER && window.COGNITIO_USER.email) || "";
      document.getElementById("cog-perfil-email").textContent = email ? ("✉️ " + email) : "";

      const { nivel } = C.nivelAtual();
      document.getElementById("cog-p-nivel").textContent = nivel;
      document.getElementById("cog-p-xp").textContent = state.xp;

      const ids = Object.keys(C.COURSES);
      const emAndamento = ids.filter(id => C.getProgress(id).modulosConcluidos.length > 0 && !C.getProgress(id).concluido);
      const concluidos = ids.filter(id => C.getProgress(id).concluido);
      document.getElementById("cog-p-cursos-andamento").textContent = emAndamento.length;
      document.getElementById("cog-p-cursos-concluidos").textContent = concluidos.length;
      document.getElementById("cog-p-exercicios").textContent = state.contadores.exerciciosConcluidos;

      const taxa = state.contadores.exerciciosConcluidos > 0
        ? Math.round((state.contadores.quizzesAcertados / state.contadores.exerciciosConcluidos) * 100) + "%"
        : "—";
      document.getElementById("cog-p-acerto").textContent = taxa;
      document.getElementById("cog-p-streak").textContent = state.streak.atual;
      document.getElementById("cog-perfil-streak-num").textContent = state.streak.atual;

      const streakRow = document.getElementById("cog-perfil-streak-row");
      streakRow.innerHTML = "";
      C.semanaAtualDias().forEach(d => {
        const el = document.createElement("div");
        el.className = "cog-streak-day" + (d.done ? " done" : "") + (d.isToday ? " today" : "");
        el.innerHTML = `<div class="dot">${d.done ? "✓" : "○"}</div><span class="lbl">${d.label}</span>`;
        streakRow.appendChild(el);
      });

      const cursosBox = document.getElementById("cog-perfil-cursos");
      cursosBox.innerHTML = "";
      ids.forEach(id => {
        const curso = C.COURSES[id];
        const pct = C.progressoPercentual(id);
        const prog = C.getProgress(id);
        const el = document.createElement("div");
        el.className = "cog-card";
        el.style.borderLeft = `4px solid ${curso.cor}`;
        el.innerHTML = `
          <h3>${curso.emoji} ${curso.nome}</h3>
          <div class="cog-xp-bar-track"><div class="cog-xp-bar-fill" style="width:${pct}%; background:linear-gradient(90deg, ${curso.cor}, ${curso.cor})"></div></div>
          <div class="cog-xp-label"><span>${pct}% concluído</span><span>${prog.concluido ? "🎓 Concluído" : (pct > 0 ? "Em andamento" : "Não iniciado")}</span></div>`;
        cursosBox.appendChild(el);
      });

      const conqBox = document.getElementById("cog-perfil-conquistas");
      conqBox.innerHTML = "";
      C.ACHIEVEMENTS.forEach(a => {
        const unlocked = state.achievementsUnlocked.includes(a.id);
        const el = document.createElement("div");
        el.className = "cog-badge" + (unlocked ? " unlocked" : "");
        el.innerHTML = `<span class="emoji">${a.emoji}</span><div class="txt"><strong>${a.nome}</strong><small>${a.desc}</small></div>`;
        conqBox.appendChild(el);
      });
    }

    function abrirEdicao() {
      const p = C.getState().perfil;
      document.getElementById("cog-input-nome").value = p.nome || "";
      document.getElementById("cog-input-username").value = p.username || "";
      document.getElementById("cog-input-bio").value = p.bio || "";

      const picker = document.getElementById("cog-avatar-picker");
      picker.innerHTML = "";
      AVATARES.forEach(av => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = av;
        if (av === p.avatar) btn.classList.add("selected");
        btn.addEventListener("click", () => {
          picker.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
        });
        picker.appendChild(btn);
      });

      temaSelecionado = p.tema || "laranja";
      const themePicker = document.getElementById("cog-theme-picker");
      themePicker.innerHTML = "";
      Object.entries(C.TEMAS).forEach(([key, tema]) => {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "cog-theme-swatch" + (key === temaSelecionado ? " selected" : "");
        sw.style.background = tema.cor;
        sw.title = tema.nome;
        sw.setAttribute("aria-label", tema.nome);
        sw.addEventListener("click", () => {
          temaSelecionado = key;
          themePicker.querySelectorAll(".cog-theme-swatch").forEach(b => b.classList.remove("selected"));
          sw.classList.add("selected");
          C.aplicarTema(key); // preview ao vivo
        });
        themePicker.appendChild(sw);
      });

      document.getElementById("cog-perfil-view").style.display = "none";
      document.getElementById("cog-perfil-edit-form").style.display = "block";
    }

    function salvarEdicao() {
      const avatarBtn = document.querySelector("#cog-avatar-picker button.selected");
      C.saveProfile({
        nome: document.getElementById("cog-input-nome").value.trim(),
        username: document.getElementById("cog-input-username").value.trim().replace(/\s+/g, "_"),
        bio: document.getElementById("cog-input-bio").value.trim(),
        avatar: avatarBtn ? avatarBtn.textContent : C.getState().perfil.avatar,
        tema: temaSelecionado || C.getState().perfil.tema
      });
      document.getElementById("cog-perfil-edit-form").style.display = "none";
      document.getElementById("cog-perfil-view").style.display = "block";
      render();
      C.toast('<i class="fa-solid fa-circle-check"></i> Perfil atualizado com sucesso!', "achievement");
    }

    document.getElementById("cog-perfil-editar").addEventListener("click", abrirEdicao);
    document.getElementById("cog-perfil-cancelar").addEventListener("click", () => {
      C.aplicarTema(C.getState().perfil.tema); // desfaz qualquer preview de tema não salvo
      document.getElementById("cog-perfil-edit-form").style.display = "none";
      document.getElementById("cog-perfil-view").style.display = "block";
    });
    document.getElementById("cog-perfil-salvar").addEventListener("click", salvarEdicao);

    /* ── Upload de foto de perfil (fora do formulário — feedback imediato) ── */
    const fileInput = document.getElementById("cog-avatar-file-input");
    document.getElementById("cog-avatar-upload-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        C.toast('<i class="fa-solid fa-triangle-exclamation"></i> Escolha um arquivo de imagem válido.', "xp");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        C.saveProfile({ avatarFoto: reader.result });
        render();
        C.toast('<i class="fa-solid fa-circle-check"></i> Foto de perfil atualizada!', "achievement");
      };
      reader.readAsDataURL(file);
    });
    document.getElementById("cog-avatar-remove-btn").addEventListener("click", () => {
      C.saveProfile({ avatarFoto: null });
      fileInput.value = "";
      render();
    });

    render();

    // Se o aluno nunca configurou o nome, abre a edição automaticamente na 1ª visita
    if (!C.getState().perfil.nome) abrirEdicao();
  });
})();
