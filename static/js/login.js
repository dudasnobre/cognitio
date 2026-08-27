/* ══════════════════════════════════════════════════════════
   COGNITIO · login.js — Validação client-side de cadastro/login
   ══════════════════════════════════════════════════════════
   O cadastro e o login de verdade agora são feitos pelo Flask
   (servidor), com senha protegida por hash e sessão própria por
   conta — por isso cada usuário vê seu próprio perfil/progresso.
   Este script só faz validações rápidas no navegador (campos
   vazios, senhas diferentes, e-mail com formato inválido) antes
   de deixar o formulário ser enviado normalmente ao servidor.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const form = document.querySelector('.auth-card form');
  if (!form) return;

  const isCadastro = window.location.pathname === '/';
  const campoEmail = document.getElementById('email');
  const campoSenha = document.getElementById('senha');
  const campoConfirmar = document.getElementById('confirmar_senha');
  const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function mostrarMensagem(texto, tipo) {
    let box = document.getElementById('auth-msg');
    if (!box) {
      box = document.createElement('div');
      box.id = 'auth-msg';
      box.style.cssText = 'margin-bottom:16px;padding:10px 14px;border-radius:8px;font-size:0.88rem;font-weight:500;';
      form.parentNode.insertBefore(box, form);
    }
    const cores = {
      erro:    { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
      sucesso: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    };
    const c = cores[tipo] || cores.erro;
    box.style.background = c.bg;
    box.style.color = c.color;
    box.style.border = `1px solid ${c.border}`;
    box.textContent = texto;
  }

  function limparMensagem() {
    const box = document.getElementById('auth-msg');
    if (box) box.remove();
  }

  form.addEventListener('submit', function (e) {
    limparMensagem();

    if (campoEmail && !EMAIL_REGEX.test(campoEmail.value.trim())) {
      e.preventDefault();
      mostrarMensagem('Digite um e-mail válido.', 'erro');
      campoEmail.focus();
      return;
    }

    if (isCadastro && campoSenha && campoConfirmar && campoSenha.value !== campoConfirmar.value) {
      e.preventDefault();
      mostrarMensagem('As senhas não coincidem.', 'erro');
      campoConfirmar.focus();
      return;
    }

    if (isCadastro && campoSenha && campoSenha.value.length < 6) {
      e.preventDefault();
      mostrarMensagem('A senha precisa ter pelo menos 6 caracteres.', 'erro');
      campoSenha.focus();
      return;
    }

    // Tudo certo no navegador: deixa o formulário seguir normalmente para o Flask,
    // que valida de novo no servidor e cria a sessão da conta.
    const botao = form.querySelector('.btn-auth-submit');
    if (botao) {
      botao.disabled = true;
      botao.textContent = isCadastro ? 'Criando conta...' : 'Entrando...';
    }
  });

})();
