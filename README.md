# 🎓 Cognitio — Plataforma de Aprendizado com IA

> Startup educacional que une cursos práticos a um tutor de IA para transformar o aprendizado de tecnologia e finanças.

---

## 📌 Sobre o Projeto

**Cognitio** é uma plataforma web de cursos online com assistente de IA integrado. O projeto foi desenvolvido como startup educacional com foco em democratizar o acesso ao conhecimento tecnológico e financeiro.

### Cursos disponíveis
- 💻 **Informática Básica** — hardware, software, internet e segurança digital
- 💰 **Educação Financeira** — orçamento, reservas, investimentos e metas
- ⚡ **JavaScript** — terminal interativo em cada módulo
- 🗄️ **Banco de Dados SQL** — máquina virtual SQL interativa (SQLite em memória)

### Funcionalidades de IA
- 💬 Chat conversacional com contexto por curso (Groq API + LLaMA 3.1)
- 📝 Geração de resumos automáticos por módulo
- 🧩 Simulados/questionários com correção automática
- 💡 Dicas motivacionais ao concluir módulos
- 🤖 Assistente SQL para erros e sugestões de queries
- 🤖 Assistente JavaScript para revisão de código

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.11 + Flask 3.x |
| IA / LLM | Groq API (modelo `llama-3.1-8b-instant`) |
| Banco de dados (SQL interativo) | SQLite em memória |
| Frontend | HTML5, CSS3, JavaScript (vanilla) |
| Ícones | Font Awesome 6 |

---

## 🚀 Como executar o projeto

### Pré-requisitos
- Python 3.10 ou superior
- Conta gratuita na [Groq](https://console.groq.com) para obter uma API Key

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/cognitio.git
cd cognitio

# 2. Crie e ative o ambiente virtual
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

# 3. Instale as dependências
pip install -r requirments.text

# 4. Configure a chave da API
cp .env.example .env
# Edite o .env e substitua com sua chave Groq real

# 5. Execute a aplicação
python app.py
```

Acesse em: **http://localhost:5001**

---

## 📁 Estrutura do Projeto

```
cognitio/
├── app.py                  # Backend Flask + rotas + endpoints de IA
├── requirments.text        # Dependências Python
├── .env.example            # Modelo de configuração de ambiente
├── .gitignore
├── logo.png
├── static/
│   ├── css/                # Estilos por curso
│   └── js/                 # Scripts por curso + widget de IA
└── templates/
    ├── base.html           # Página principal (trilhas/cursos)
    ├── login.html          # Tela de login/cadastro
    ├── ia_widget_snippet.html
    ├── informatica/        # Módulos do curso de Informática
    ├── financas/           # Módulos do curso de Finanças
    ├── javascript/         # Módulos do curso de JavaScript
    └── banco_de_dados/     # Módulos do curso de SQL
```

---

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example`):

```env
GROQ_API_KEY=gsk_sua_chave_aqui
```

> ⚠️ **Nunca** suba o arquivo `.env` com sua chave real para o GitHub. Ele já está no `.gitignore`.

---

## 👥 Equipe

| Nome | Responsabilidade |
|------|-----------------|
| _(adicione os nomes do grupo aqui)_ | _(função)_ |

---

## 📄 Licença

Projeto acadêmico — desenvolvido para a disciplina de IA.
# cognitio
