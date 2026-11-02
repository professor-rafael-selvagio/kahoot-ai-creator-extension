# ⚡ Kahoot! AI Creator - Extensão para Google Chrome

Extensão moderna para o **Google Chrome (Manifest V3)** projetada para acelerar a criação de quizzes e jogos no **Kahoot!** (`create.kahoot.it`). Com ela, você digita o **tema** e a **quantidade de perguntas desejadas**, e a IA gera e insere automaticamente todos os slides com títulos, alternativas e respostas corretas marcadas diretamente no criador de jogos.

---

## 📺 Demonstração em Vídeo

Aprenda a utilizar a ferramenta na prática assistindo ao tutorial:

👉 **[Assista ao Tutorial no YouTube](https://www.youtube.com/watch?v=rtGd7JdfL_s)**

---

## 🌟 Regras e Funcionalidades Implementadas

- 📏 **Limites Estritos do Kahoot!**:
  - **Enunciado da pergunta**: Máximo de **120 caracteres** (garantindo legibilidade em qualquer dispositivo).
  - **Respostas/Alternativas**: Máximo de **75 caracteres** por alternativa.
- ⚖️ **Distribuição de Dificuldade Balanceada (1/3)**:
  - Exatamente **1/3 de perguntas Fáceis**, **1/3 Médias** e **1/3 Difíceis**.
  - A ordem de apresentação é **embaralhada aleatoriamente** para enriquecer a dinâmica do jogo.
- 🔀 **Mescla Inteligente de Tipos de Pergunta**:
  - **Múltipla Escolha (Quiz)**: 4 alternativas com os elementos visuais clássicos (Vermelho ▲, Azul ◆, Amarelo ● e Verde ■).
  - **Verdadeiro ou Falso**: 2 opções dinâmicas (*Verdadeiro* e *Falso*).
- 🤖 **Geração com IA ou Motor Offline**:
  - Suporte à API do **Google Gemini** (Gemini 1.5 Flash / 2.0).
  - **Motor Inteligente Offline Integrado**: funciona imediatamente sem a obrigatoriedade de chave de API.
- ⚡ **Automação Direta no Navegador**:
  - Cria os slides de tipo **Quiz** e **Verdadeiro/Falso** sequencialmente.
  - Preenche os campos de texto simulando eventos de digitação reativos compatíveis com o Kahoot!.
  - Seleciona automaticamente a alternativa correta de cada questão.
- 🎛️ **Dupla Interface de Uso**:
  - **Assistente Flutuante na Página**: botão fixo `⚡ Criador de Jogos IA` diretamente na interface do Kahoot!.
  - **Popup da Barra de Ferramentas**: painel com pré-visualização, contadores de caracteres e tags de dificuldade.
- 📥 **Exportação para Planilha (.csv)**: gere arquivos prontos no padrão de importação em lote do Kahoot! (*Import from spreadsheet*).

---

## 📂 Estrutura do Projeto

```text
kahoot-ai-creator-extension/
├── manifest.json        # Configuração da extensão (Manifest V3)
├── background.js        # Service worker em segundo plano
├── generator.js         # Motor balanceado de IA (Gemini API) e gerador offline
├── popup.html           # Interface do popup com badge de regras e pré-visualização
├── popup.css            # Estilos temáticos do Kahoot! com badges de dificuldade
├── popup.js             # Lógica de controle do popup e pré-visualização completa
├── content.js           # Script de automação e injeção no DOM do Kahoot!
├── content.css          # Estilos do widget e banner flutuante no Kahoot!
├── icons/               # Ícones da extensão (16x16, 48x48 e 128x128)
└── README.md            # Documentação e instruções de instalação
```

---

## 🛠️ Como Instalar no Google Chrome

### 1. Clonar o Repositório
Abra o terminal do seu computador e clone o repositório para o diretório de sua preferência:

```bash
git clone https://github.com/professor-rafael-selvagio/kahoot-ai-creator-extension.git
```

> **Alternativa (sem Git):** Clique no botão verde **Code** no topo da página do GitHub, selecione **Download ZIP** e extraia a pasta no seu computador.

---

### 2. Carregar a Extensão no Chrome
1. Abra o **Google Chrome** e acerte na barra de navegação:
   ```text
   chrome://extensions/
   ```
2. No canto superior direito da página, ative o botão **"Modo do desenvolvedor"** (*Developer mode*).
3. Clique no botão **"Carregar sem compactação"** (*Load unpacked*) no canto superior esquerdo.
4. Selecione a pasta clonada: `kahoot-ai-creator-extension`.

Pronto! O ícone da extensão aparecerá na barra de ferramentas do seu navegador.

---

### 🔄 Como Atualizar
Sempre que fizer alterações no código ou executar `git pull`:
1. Acesse `chrome://extensions/`.
2. Localize o card do **Kahoot! AI Creator**.
3. Clique no ícone de **atualizar** (🔄 seta circular) para recarregar as modificações imediatamente.

---

## 🎮 Como Usar

1. Acesse o editor de jogos do Kahoot!:  
   👉 **[create.kahoot.it/creator](https://create.kahoot.it/creator)**
2. Clique no botão flutuante **`⚡ Criador de Jogos IA`** no canto inferior direito da tela (ou no ícone da extensão no Chrome).
3. Informe o **Tema do Jogo** (ex.: *Inteligência Artificial*, *História do Brasil*, *Python Básico*) e selecione a **quantidade de perguntas**.
4. Clique em **"🚀 Gerar e Inserir no Kahoot Automaticamente"**.
5. As perguntas serão geradas respeitando a regra de **1/3 fáceis, 1/3 médias e 1/3 difíceis**, com tipos variados (múltipla escolha e verdadeiro/falso) e preenchidas slide por slide no seu jogo!