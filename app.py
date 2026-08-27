import os
import json
import re
import uuid
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from groq import Groq

# Esse comando descobre o caminho exato da pasta do app.py e junta com 'templates'
diretorio_atual = os.path.dirname(os.path.abspath(__file__))
pasta_templates = os.path.join(diretorio_atual, 'templates')

app = Flask(__name__, template_folder=pasta_templates)
app.secret_key = os.environ.get("SECRET_KEY", "cognitio-dev-secret-troque-em-producao")

# ── Groq Client ──────────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)
MODEL = "openai/gpt-oss-20b"

# ═══════════════════════════════════════════════════════════════
# CONTAS DE USUÁRIO (armazenamento simples em arquivo JSON)
# ═══════════════════════════════════════════════════════════════
# Sem instalar banco de dados: para o tamanho deste projeto, um
# arquivo JSON local é suficiente. Senhas nunca são salvas em
# texto puro — usamos hash (werkzeug, já incluso no Flask).
PASTA_DATA = os.path.join(diretorio_atual, "data")
ARQUIVO_USUARIOS = os.path.join(PASTA_DATA, "usuarios.json")
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _garantir_arquivo_usuarios():
    os.makedirs(PASTA_DATA, exist_ok=True)
    if not os.path.exists(ARQUIVO_USUARIOS):
        with open(ARQUIVO_USUARIOS, "w", encoding="utf-8") as f:
            json.dump([], f)


def carregar_usuarios():
    _garantir_arquivo_usuarios()
    try:
        with open(ARQUIVO_USUARIOS, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def salvar_usuarios(usuarios):
    _garantir_arquivo_usuarios()
    with open(ARQUIVO_USUARIOS, "w", encoding="utf-8") as f:
        json.dump(usuarios, f, ensure_ascii=False, indent=2)


def encontrar_usuario_por_email(email):
    email = (email or "").strip().lower()
    return next((u for u in carregar_usuarios() if u["email"] == email), None)


def encontrar_usuario_por_usuario(usuario):
    usuario = (usuario or "").strip().lower()
    return next((u for u in carregar_usuarios() if u["usuario"].lower() == usuario), None)


def iniciar_sessao(usuario):
    """Grava na sessão do Flask quem está logado (cada conta fica isolada)."""
    session["user_id"] = usuario["id"]
    session["user_email"] = usuario["email"]
    session["user_nome"] = usuario["nome"]
    session["user_usuario"] = usuario["usuario"]


# ── Contextos por curso ───────────────────────────────────────────────────────
CONTEXTOS = {
    "informatica": (
        "Você é a Cognitio IA, tutora especialista em Informática Básica. "
        "O curso abrange: hardware vs software, sistema operacional e organização de arquivos, "
        "internet e navegadores, segurança digital, Word/Excel básico, e boas práticas digitais. "
        "Seja didática, paciente e use exemplos do cotidiano. Estruture suas respostas com "
        "tópicos claros e emojis quando ajudar. Responda sempre em português do Brasil."
    ),
    "financas": (
        "Você é a Cognitio IA, tutora especialista em Educação Financeira. "
        "O curso abrange: mentalidade financeira, orçamento pessoal, controle de gastos, "
        "reserva de emergência, tipos de dívidas, investimentos iniciais, e planejamento de metas. "
        "Seja encorajadora, prática e use exemplos de situações reais do brasileiro. "
        "Estruture respostas com tópicos claros. Responda sempre em português do Brasil."
    ),
    "geral": (
        "Você é a Cognitio IA, assistente educacional da plataforma Cognitio. "
        "Ajude estudantes com dúvidas sobre Informática Básica e Educação Financeira. "
        "Seja didática e amigável. Responda sempre em português do Brasil."
    ),
}

def detectar_curso(modulo_nome: str) -> str:
    nome = (modulo_nome or "").lower()
    if any(k in nome for k in ["informática", "computador", "hardware", "software", "internet", "digital", "windows", "sistema"]):
        return "informatica"
    if any(k in nome for k in ["financ", "dinheiro", "orçamento", "invest", "poupanç", "dívida", "economiz"]):
        return "financas"
    return "geral"

# ═══════════════════════════════════════════════════════════════
# ROTAS DE AUTENTICAÇÃO
# ═══════════════════════════════════════════════════════════════

@app.route("/", methods=["GET", "POST"])
def cadastro():
    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        usuario = request.form.get("usuario", "").strip()
        email = request.form.get("email", "").strip().lower()
        senha = request.form.get("senha", "")
        confirmar_senha = request.form.get("confirmar_senha", "")

        # Dados que serão mantidos no formulário caso exista algum erro
        campos_preenchidos = {
            "nome": nome,
            "usuario": usuario,
            "email": email
        }

        # Verificar campos obrigatórios
        if not nome or not usuario or not email or not senha or not confirmar_senha:
            flash("Preencha todos os campos para criar sua conta.", "erro")
            return render_template("index.html", **campos_preenchidos)

        # Verificar e-mail
        if not EMAIL_REGEX.match(email):
            flash("Digite um e-mail válido.", "erro")
            return render_template("index.html", **campos_preenchidos)

        # Verificar se as senhas são iguais
        if senha != confirmar_senha:
            flash("As senhas não coincidem.", "erro")
            return render_template("index.html", **campos_preenchidos)

        # Verificar tamanho da senha
        if len(senha) < 6:
            flash("A senha precisa ter pelo menos 6 caracteres.", "erro")
            return render_template("index.html", **campos_preenchidos)

        # Verificar se o e-mail já está cadastrado
        if encontrar_usuario_por_email(email):
            flash("Já existe uma conta com esse e-mail. Faça login.", "erro")
            return render_template("index.html", **campos_preenchidos)

        # Verificar se o usuário já existe
        if encontrar_usuario_por_usuario(usuario):
            flash("Esse nome de usuário já está em uso. Escolha outro.", "erro")
            return render_template("index.html", **campos_preenchidos)

        # Criar novo usuário
        novo_usuario = {
            "id": uuid.uuid4().hex,
            "nome": nome,
            "usuario": usuario,
            "email": email,
            "senha_hash": generate_password_hash(senha),
            "criado_em": datetime.utcnow().isoformat(timespec="seconds"),
        }

        # Carregar usuários existentes
        usuarios = carregar_usuarios()

        # Adicionar novo usuário
        usuarios.append(novo_usuario)

        # Salvar no arquivo usuarios.json
        salvar_usuarios(usuarios)

        # Cadastro concluído
        # NÃO inicia sessão aqui.
        # O usuário deverá fazer login primeiro.
        flash("Cadastro realizado com sucesso! Agora faça login.", "sucesso")

        # Enviar para a tela de login
        return redirect(url_for("login"))

    # Acesso normal à página de cadastro
    return render_template("index.html")



@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        senha = request.form.get("senha", "")

        if not email or not senha:
            flash("Preencha e-mail e senha.", "erro")
            return render_template("login.html", email=email)

        usuario = encontrar_usuario_por_email(email)
        if not usuario or not check_password_hash(usuario["senha_hash"], senha):
            flash("E-mail ou senha incorretos.", "erro")
            return render_template("login.html", email=email)

        iniciar_sessao(usuario)
        return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Você saiu da sua conta.", "sucesso")
    return redirect(url_for("login"))


# Qualquer rota que não esteja na lista abaixo exige login. Isso garante que
# cada conta só veja o próprio progresso/perfil (antes, sem login real, o
# navegador misturava os dados de contas diferentes no mesmo dispositivo).
ENDPOINTS_PUBLICOS = {"cadastro", "login", "logout", "static"}


@app.before_request
def exigir_login():
    if request.endpoint is None or request.endpoint in ENDPOINTS_PUBLICOS:
        return
    if not session.get("user_id"):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Sessão expirada. Faça login novamente."}), 401
        return redirect(url_for("login"))

@app.context_processor
def injetar_usuario_logado():
    return {
        "usuario_logado": {
            "id": session.get("user_id", ""),
            "nome": session.get("user_nome", ""),
            "usuario": session.get("user_usuario", ""),
            "email": session.get("user_email", ""),
        }
    }


@app.route("/trilhas")
def trilhas():
    return render_template("base.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/perfil")
def perfil():
    return render_template("perfil.html")

# ═══════════════════════════════════════════════════════════════
# ROTAS – INFORMÁTICA
# ═══════════════════════════════════════════════════════════════

@app.route("/infor")
def informatica():
    return render_template("informatica/informatica.html")

@app.route("/modulo2")
def modulo2():
    return render_template("informatica/modulo2.html")

@app.route("/modulo3")
def modulo3():
    return render_template("informatica/modulo3.html")

@app.route("/modulo4")
def modulo4():
    return render_template("informatica/modulo4.html")

@app.route("/modulo5")
def modulo5():
    return render_template("informatica/modulo5.html")

@app.route("/modulo6")
def modulo6():
    return render_template("informatica/modulo6.html")

@app.route("/modulo7")
def modulo7():
    return render_template("informatica/modulo7.html")

@app.route("/modulo8")
def modulo8():
    return render_template("informatica/modulo8.html")

@app.route("/modulo9")
def modulo9():
    return render_template("informatica/modulo9.html")

@app.route("/modulo10")
def modulo10():
    return render_template("informatica/modulo10.html")

# ═══════════════════════════════════════════════════════════════
# ROTAS – FINANÇAS
# ═══════════════════════════════════════════════════════════════

@app.route("/financas")
def financas():
    return render_template("financas/financas.html")

@app.route("/financas_modulo2")
def financas_modulo2():
    return render_template("financas/modulo2.html")

@app.route("/financas_modulo3")
def financas_modulo3():
    return render_template("financas/modulo3.html")

@app.route("/financas_modulo4")
def financas_modulo4():
    return render_template("financas/modulo4.html")

@app.route("/financas_modulo5")
def financas_modulo5():
    return render_template("financas/modulo5.html")

@app.route("/financas_modulo6")
def financas_modulo6():
    return render_template("financas/modulo6.html")

@app.route("/financas_modulo7")
def financas_modulo7():
    return render_template("financas/modulo7.html")

@app.route("/financas_modulo8")
def financas_modulo8():
    return render_template("financas/modulo8.html")

@app.route("/financas_modulo9")
def financas_modulo9():
    return render_template("financas/modulo9.html")

@app.route("/financas_modulo10")
def financas_modulo10():
    return render_template("financas/modulo10.html")

# ═══════════════════════════════════════════════════════════════
# ENDPOINT IA – CHAT CONVERSACIONAL
# Rota: POST /api/ia
# Body: { "message": str, "modulo": str, "history": [...] }
# ═══════════════════════════════════════════════════════════════

@app.route("/api/ia", methods=["POST"])
def api_ia_chat():
    try:
        data = request.get_json()
        user_message = (data.get("message") or "").strip()
        modulo_nome   = data.get("modulo", "")
        history       = data.get("history", [])

        if not user_message:
            return jsonify({"error": "Mensagem vazia."}), 400

        curso = detectar_curso(modulo_nome)
        system_prompt = CONTEXTOS[curso]
        if modulo_nome:
            system_prompt += f"\n\nO aluno está estudando o módulo: **{modulo_nome}**. Priorize respostas relacionadas a este tópico."

        # Monta histórico (máx. últimas 8 trocas para não explodir o contexto)
        messages = [{"role": "system", "content": system_prompt}]
        for h in history[-16:]:  # 8 pares user/assistant
            if h.get("role") in ("user", "assistant") and h.get("content"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})

        completion = client.chat.completions.create(
            messages=messages,
            model=MODEL,
            temperature=0.7,
            max_tokens=800,
        )
        reply = completion.choices[0].message.content
        return jsonify({"reply": reply})

    except Exception as e:
        print(f"[ERRO /api/ia] {e}")
        return jsonify({"error": "Erro interno ao processar resposta da IA."}), 500


# ═══════════════════════════════════════════════════════════════
# ENDPOINT IA – GERAÇÃO DE RESUMO / SIMULADO
# Rota: POST /api/ia/gerar
# Body: { "tipo": "resumo"|"questionario", "modulo": str }
# ═══════════════════════════════════════════════════════════════

@app.route("/api/ia/gerar", methods=["POST"])
def api_ia_gerar():
    try:
        data = request.get_json()
        tipo        = data.get("tipo", "resumo")
        modulo_nome = data.get("modulo", "conteúdo do módulo")

        curso = detectar_curso(modulo_nome)
        system_prompt = CONTEXTOS[curso]

        if tipo == "resumo":
            prompt = (
                f"Gere um resumo didático e bem organizado sobre: **{modulo_nome}**.\n"
                "Use cabeçalhos com emojis, tópicos com bullet points e destaque os pontos mais importantes com **negrito**. "
                "O resumo deve ser claro para um aluno iniciante e ter no máximo 400 palavras. "
                "Responda apenas com o conteúdo do resumo, sem introduções do tipo 'Claro!' ou 'Aqui está'."
            )
            completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": prompt},
                ],
                model=MODEL,
                temperature=0.5,
                max_tokens=700,
            )
            conteudo_html = md_to_html(completion.choices[0].message.content)
            return jsonify({"conteudo": conteudo_html})

        elif tipo == "questionario":
            prompt = (
                f"Crie um mini-simulado com exatamente 3 perguntas de múltipla escolha sobre: **{modulo_nome}**.\n\n"
                "FORMATO OBRIGATÓRIO — retorne APENAS JSON válido, sem texto antes ou depois:\n"
                '{"questoes": [\n'
                '  {"pergunta": "...", "opcoes": ["A) ...", "B) ...", "C) ...", "D) ..."], "resposta_correta": 0, "explicacao": "..."}\n'
                "]}\n\n"
                "Regras: resposta_correta é o ÍNDICE (0-3) da opção certa. "
                "A explicação deve ser curta (1-2 frases). "
                "As perguntas devem ser baseadas no conteúdo do módulo informado."
            )
            completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "Você é um gerador de quizzes educacionais. Retorne APENAS JSON válido, sem markdown, sem texto extra."},
                    {"role": "user",   "content": prompt},
                ],
                model=MODEL,
                temperature=0.6,
                max_tokens=900,
            )
            raw = completion.choices[0].message.content.strip()
            # Remove possíveis cercas de markdown
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            quiz_data = json.loads(raw)
            return jsonify({"tipo": "quiz", "questoes": quiz_data["questoes"]})

        return jsonify({"error": "Tipo inválido."}), 400

    except json.JSONDecodeError as e:
        print(f"[ERRO JSON] {e} — raw: {raw if 'raw' in dir() else 'N/A'}")
        return jsonify({"error": "Erro ao gerar o simulado. Tente novamente."}), 500
    except Exception as e:
        print(f"[ERRO /api/ia/gerar] {e}")
        return jsonify({"error": "Erro interno ao gerar conteúdo da IA."}), 500


# ═══════════════════════════════════════════════════════════════
# ENDPOINT IA – SUGESTÃO DE PRÓXIMO PASSO
# Rota: POST /api/ia/dica
# Body: { "modulo": str, "curso": "informatica"|"financas" }
# ═══════════════════════════════════════════════════════════════

@app.route("/api/ia/dica", methods=["POST"])
def api_ia_dica():
    try:
        data   = request.get_json()
        modulo = data.get("modulo", "")
        curso  = data.get("curso", "geral")

        system_prompt = CONTEXTOS.get(curso, CONTEXTOS["geral"])
        prompt = (
            f"O aluno acabou de concluir o módulo: **{modulo}**.\n"
            "Dê uma mensagem motivacional curta (2-3 frases) e sugira 1 dica prática para aplicar "
            "o que aprendeu no dia a dia. Seja animado e encorajador!"
        )
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": prompt},
            ],
            model=MODEL,
            temperature=0.8,
            max_tokens=200,
        )
        return jsonify({"dica": completion.choices[0].message.content})
    except Exception as e:
        print(f"[ERRO /api/ia/dica] {e}")
        return jsonify({"error": "Não foi possível gerar a dica."}), 500


# ─────────────────────────────────────────────────────────────
#  ROTAS – BANCO DE DADOS (novo curso)
# ─────────────────────────────────────────────────────────────
@app.route("/banco-de-dados")
def banco():   return render_template("banco_de_dados/banco.html")
@app.route("/banco-de-dados/modulo2")
def bd_mod2(): return render_template("banco_de_dados/modulo2.html")
@app.route("/banco-de-dados/modulo3")
def bd_mod3(): return render_template("banco_de_dados/modulo3.html")
@app.route("/banco-de-dados/modulo4")
def bd_mod4(): return render_template("banco_de_dados/modulo4.html")
@app.route("/banco-de-dados/modulo5")
def bd_mod5(): return render_template("banco_de_dados/modulo5.html")
@app.route("/banco-de-dados/modulo6")
def bd_mod6(): return render_template("banco_de_dados/modulo6.html")
@app.route("/banco-de-dados/modulo7")
def bd_mod7(): return render_template("banco_de_dados/modulo7.html")
@app.route("/banco-de-dados/modulo8")
def bd_mod8(): return render_template("banco_de_dados/modulo8.html")
@app.route("/banco-de-dados/modulo9")
def bd_mod9(): return render_template("banco_de_dados/modulo9.html")
@app.route("/banco-de-dados/modulo10")
def bd_mod10(): return render_template("banco_de_dados/modulo10.html")


# ─────────────────────────────────────────────────────────────
#  CURSO DE JAVASCRIPT
# ─────────────────────────────────────────────────────────────
@app.route("/javascript")
def javascript(): return render_template("javascript/javascript.html")
@app.route("/javascript/modulo2")
def js_mod2(): return render_template("javascript/modulo2.html")
@app.route("/javascript/modulo3")
def js_mod3(): return render_template("javascript/modulo3.html")
@app.route("/javascript/modulo4")
def js_mod4(): return render_template("javascript/modulo4.html")
@app.route("/javascript/modulo5")
def js_mod5(): return render_template("javascript/modulo5.html")
@app.route("/javascript/modulo6")
def js_mod6(): return render_template("javascript/modulo6.html")
@app.route("/javascript/modulo7")
def js_mod7(): return render_template("javascript/modulo7.html")
@app.route("/javascript/modulo8")
def js_mod8(): return render_template("javascript/modulo8.html")
@app.route("/javascript/modulo9")
def js_mod9(): return render_template("javascript/modulo9.html")
@app.route("/javascript/modulo10")
def js_mod10(): return render_template("javascript/modulo10.html")
@app.route("/javascript/modulo11")
def js_mod11(): return render_template("javascript/modulo11.html")
@app.route("/javascript/modulo12")
def js_mod12(): return render_template("javascript/modulo12.html")


# ─────────────────────────────────────────────────────────────
#  CURSO DE PYTHON DO ZERO
# ─────────────────────────────────────────────────────────────
@app.route("/python")
def python_curso(): return render_template("python/python.html")
@app.route("/python/modulo2")
def py_mod2(): return render_template("python/modulo2.html")
@app.route("/python/modulo3")
def py_mod3(): return render_template("python/modulo3.html")
@app.route("/python/modulo4")
def py_mod4(): return render_template("python/modulo4.html")
@app.route("/python/modulo5")
def py_mod5(): return render_template("python/modulo5.html")
@app.route("/python/modulo6")
def py_mod6(): return render_template("python/modulo6.html")
@app.route("/python/modulo7")
def py_mod7(): return render_template("python/modulo7.html")
@app.route("/python/modulo8")
def py_mod8(): return render_template("python/modulo8.html")
@app.route("/python/modulo9")
def py_mod9(): return render_template("python/modulo9.html")
@app.route("/python/modulo10")
def py_mod10(): return render_template("python/modulo10.html")


# ─────────────────────────────────────────────────────────────
#  CURSO DE HTML & CSS PARA INICIANTES
# ─────────────────────────────────────────────────────────────
@app.route("/html-css")
def htmlcss_curso(): return render_template("html_css/htmlcss.html")
@app.route("/html-css/modulo2")
def hc_mod2(): return render_template("html_css/modulo2.html")
@app.route("/html-css/modulo3")
def hc_mod3(): return render_template("html_css/modulo3.html")
@app.route("/html-css/modulo4")
def hc_mod4(): return render_template("html_css/modulo4.html")
@app.route("/html-css/modulo5")
def hc_mod5(): return render_template("html_css/modulo5.html")
@app.route("/html-css/modulo6")
def hc_mod6(): return render_template("html_css/modulo6.html")
@app.route("/html-css/modulo7")
def hc_mod7(): return render_template("html_css/modulo7.html")
@app.route("/html-css/modulo8")
def hc_mod8(): return render_template("html_css/modulo8.html")
@app.route("/html-css/modulo9")
def hc_mod9(): return render_template("html_css/modulo9.html")
@app.route("/html-css/modulo10")
def hc_mod10(): return render_template("html_css/modulo10.html")
@app.route("/html-css/modulo11")
def hc_mod11(): return render_template("html_css/modulo11.html")
@app.route("/html-css/modulo12")
def hc_mod12(): return render_template("html_css/modulo12.html")
@app.route("/html-css/modulo13")
def hc_mod13(): return render_template("html_css/modulo13.html")
@app.route("/html-css/modulo14")
def hc_mod14(): return render_template("html_css/modulo14.html")
@app.route("/html-css/modulo15")
def hc_mod15(): return render_template("html_css/modulo15.html")
@app.route("/html-css/modulo16")
def hc_mod16(): return render_template("html_css/modulo16.html")


# ─────────────────────────────────────────────────────────────
#  MÁQUINA VIRTUAL SQL  (SQLite em memória por sessão)
# ─────────────────────────────────────────────────────────────
_DEMO_SQL = """
CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT UNIQUE, cidade TEXT, saldo REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, preco REAL NOT NULL, estoque INTEGER DEFAULT 0, categoria TEXT);
CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER REFERENCES clientes(id), produto_id INTEGER REFERENCES produtos(id), quantidade INTEGER NOT NULL, data_pedido TEXT DEFAULT (date('now')));
INSERT OR IGNORE INTO clientes (nome,email,cidade,saldo) VALUES ('Ana Silva','ana@email.com','São Paulo',1500.00),('Bruno Costa','bruno@email.com','Rio de Janeiro',3200.50),('Carla Mendes','carla@email.com','Belo Horizonte',800.00),('Diego Rocha','diego@email.com','Curitiba',4700.00),('Eva Lima','eva@email.com','Salvador',250.75);
INSERT OR IGNORE INTO produtos (nome,preco,estoque,categoria) VALUES ('Notebook Dell',3499.99,15,'Eletrônicos'),('Mouse sem fio',89.90,120,'Periféricos'),('Teclado Mecânico',249.00,45,'Periféricos'),('Monitor 24"',799.00,30,'Eletrônicos'),('Headset Gamer',199.90,60,'Periféricos'),('Cadeira Ergonômica',1299.00,8,'Mobiliário');
INSERT OR IGNORE INTO pedidos (cliente_id,produto_id,quantidade) VALUES (1,2,2),(1,3,1),(2,1,1),(2,4,2),(3,5,1),(4,1,2),(4,6,1),(5,2,3),(1,4,1),(2,5,2);
"""

_SQL_OK = re.compile(
    r"^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|DROP\s+TABLE"
    r"|ALTER\s+TABLE|CREATE\s+INDEX|DROP\s+INDEX|PRAGMA|BEGIN|COMMIT|ROLLBACK)",
    re.IGNORECASE
)
_SQL_BAD = re.compile(r"\b(ATTACH|DETACH|LOAD\s+EXTENSION)\b", re.IGNORECASE)
_vms: dict = {}

def _get_vm(vid):
    import sqlite3
    if vid not in _vms:
        con = sqlite3.connect(":memory:", check_same_thread=False)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA foreign_keys=ON")
        for s in _DEMO_SQL.split(";"):
            s = s.strip()
            if s:
                try: con.execute(s)
                except Exception: pass
        con.commit()
        _vms[vid] = con
    return _vms[vid]

@app.route("/api/sql/run", methods=["POST"])
def api_sql_run():
    import sqlite3
    data = request.get_json()
    sql  = (data.get("sql") or "").strip()
    vid  = request.remote_addr or "demo"
    if not sql: return jsonify({"error": "Nenhuma query enviada."}), 400
    if _SQL_BAD.search(sql): return jsonify({"error": "⚠️ Comando não permitido."}), 400
    if not _SQL_OK.match(sql):
        return jsonify({"error": "⚠️ Apenas SELECT, INSERT, UPDATE, DELETE, CREATE/DROP TABLE são permitidos."}), 400
    con = _get_vm(vid)
    try:
        cur = con.execute(sql); con.commit()
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = [list(r) for r in cur.fetchall()]
            return jsonify({"type":"select","columns":cols,"rows":rows,"rowcount":len(rows)})
        return jsonify({"type":"write","rowcount":cur.rowcount,"message":f"✅ {cur.rowcount} linha(s) afetada(s)."})
    except sqlite3.Error as e:
        return jsonify({"error":f"❌ Erro SQL: {e}"}), 400
    except Exception as e:
        return jsonify({"error":f"❌ Erro: {e}"}), 500

@app.route("/api/sql/reset", methods=["POST"])
def api_sql_reset():
    vid = request.remote_addr or "demo"
    if vid in _vms:
        try: _vms[vid].close()
        except Exception: pass
        del _vms[vid]
    _get_vm(vid)
    return jsonify({"message":"✅ Banco de dados resetado com sucesso!"})

@app.route("/api/ia/sql-hint", methods=["POST"])
def api_ia_sql_hint():
    try:
        data = request.get_json()
        sql, erro, ctx = data.get("sql",""), data.get("erro",""), data.get("contexto","")
        system = ("Você é a Cognitio IA, tutora especialista em SQL. "
                  "Explique erros e sugira melhorias de forma didática para iniciantes. Português do Brasil.")
        prompt = (f"Query:\n```sql\n{sql}\n```\nErro: {erro}\nExplique o erro e mostre a correção."
                  if erro else
                  f"Módulo: {ctx}\nSugira uma query SQL interessante para praticar nas tabelas: clientes, produtos, pedidos.")
        comp = client.chat.completions.create(
            messages=[{"role":"system","content":system},{"role":"user","content":prompt}],
            model=MODEL, temperature=0.6, max_tokens=600
        )
        return jsonify({"reply": comp.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ia/js-hint", methods=["POST"])
def api_ia_js_hint():
    try:
        data = request.get_json()
        code = data.get("code", "")
        erro = data.get("erro", "")
        ctx  = data.get("contexto", "")
        system = ("Você é a Cognitio IA, tutora especialista em JavaScript. "
                  "Explique erros e sugira melhorias de forma didática para iniciantes. Português do Brasil. "
                  "Seja concisa e use exemplos de código quando útil.")
        if erro:
            prompt = f"Código JS:\n```js\n{code}\n```\nErro: {erro}\nExplique o erro e mostre como corrigir."
        else:
            prompt = (f"Módulo: {ctx}\nCódigo JS do aluno:\n```js\n{code}\n```\n"
                      "Dê uma dica prática sobre o que pode melhorar ou explore mais o conceito do módulo.")
        comp = client.chat.completions.create(
            messages=[{"role": "system", "content": system},
                      {"role": "user",   "content": prompt}],
            model=MODEL, temperature=0.6, max_tokens=600
        )
        return jsonify({"reply": comp.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════
# UTILITÁRIOS
# ═══════════════════════════════════════════════════════════════

def md_to_html(text: str) -> str:
    """Converte Markdown básico para HTML seguro."""
    import html as html_mod
    text = html_mod.escape(text)
    # Cabeçalhos
    text = re.sub(r"^### (.+)$", r"<h4>\1</h4>", text, flags=re.MULTILINE)
    text = re.sub(r"^## (.+)$",  r"<h3>\1</h3>", text, flags=re.MULTILINE)
    text = re.sub(r"^# (.+)$",   r"<h3>\1</h3>", text, flags=re.MULTILINE)
    # Negrito e itálico
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*",     r"<em>\1</em>",         text)
    # Listas
    text = re.sub(r"^[\*\-] (.+)$", r"<li>\1</li>", text, flags=re.MULTILINE)
    text = re.sub(r"(<li>.*</li>)", r"<ul>\1</ul>", text, flags=re.DOTALL)
    # Parágrafos
    paragraphs = re.split(r"\n{2,}", text)
    result = []
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith("<h") and not p.startswith("<ul"):
            p = p.replace("\n", "<br>")
            p = f"<p>{p}</p>"
        result.append(p)
    return "\n".join(result)


# ═══════════════════════════════════════════════════════════════
# INICIALIZAÇÃO
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Mudando para a porta 5001
    app.run(debug=True, port=5001)
