# ⚡ Kahoot! AI Creator - Extensão para Google Chrome

Extensão moderna para o **Google Chrome (Manifest V3)** projetada para acelerar a criação de quizzes e jogos no **Kahoot!** (`create.kahoot.it`). Com ela, você digita o **tema** e o **número de perguntas desejadas**, e a extensão gera e preenche automaticamente todos os slides com títulos, alternativas e marcação da resposta correta diretamente no criador do Kahoot!

---

## 🌟 Regras e Funcionalidades Implementadas

- 📏 **Limites Estritos do Kahoot!**:
  - **Enunciado da pergunta**: Máximo de **120 caracteres** (garantindo legibilidade em qualquer dispositivo).
  - **Respostas/Alternativas**: Máximo de **75 caracteres** por alternativa.
- ⚖️ **Distribuição de Dificuldade 1/3 Balanceada**:
  - Exatamente **1/3 de perguntas Fáceis**, **1/3 Médias** e **1/3 Difíceis**.
  - A ordem das perguntas é **embaralhada aleatoriamente** para dinâmicas de jogo mais instigantes.
- 🔀 **Mescla de Tipos de Pergunta**:
  - **Múltipla Escolha (Quiz)**: 4 alternativas exclusivas (Vermelho ▲, Azul ◆, Amarelo ● e Verde ■).
  - **Verdadeiro ou Falso**: 2 opções dinâmicas (*Verdadeiro* e *Falso*).
- 🤖 **Geração com IA ou Motor Offline**:
  - Integração com a API do **Google Gemini** (Gemini 1.5 Flash / 2.0).
  - **Motor Inteligente Offline Integrado**: funciona na hora sem precisar de chave de API.
- ⚡ **Automação Direta no Kahoot!**:
  - Cria os slides de tipo **Quiz** e **Verdadeiro/Falso** sequencialmente.
  - Preenche os campos `contenteditable` simulando digitação natural e disparando eventos reativos.
  - Marca a resposta correta automaticamente com precisão.
- 🎛️ **Dupla Interface de Uso**:
  - **Assistente Flutuante na Página**: botão fixo `⚡ Criador de Jogos IA` na tela do Kahoot!.
  - **Popup da Barra de Ferramentas**: com pré-visualização categorizada de perguntas, badges de dificuldade e contadores de caracteres.
- 📥 **Exportação para Planilha (.csv)**: gera arquivo no formato oficial de importação em lote do Kahoot! (*Import from spreadsheet*).

---

## 📂 Estrutura dos Arquivos

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

## 🛠️ Como Instalar ou Atualizar no Google Chrome

1. Abra o **Google Chrome** e acesse:
   ```text
   chrome://extensions/
   ```
2. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (*Developer mode*).
3. Se for instalar pela primeira vez ou atualizar o caminho:
   - Clique em **"Carregar sem compactação"** (*Load unpacked*) e selecione a pasta:
     ```text
     /Users/rafael.selvagio/Projetos/MyApps/SoftwaresIA/Extensão Google Chrome/kahoot-ai-creator-extension
     ```
4. Se a extensão já estiver carregada com a nova pasta:
   - Basta clicar no ícone de **atualizar** (seta circular 🔄) no card da extensão para aplicar as novas regras imediatamente!

---

## 🎮 Como Usar

1. Acesse o criador do Kahoot!:
   👉 **[create.kahoot.it/creator](https://create.kahoot.it/creator)**
2. Clique no botão flutuante **`⚡ Criador de Jogos IA`** no canto inferior direito da tela (ou no ícone da extensão no Chrome).
3. Digite o **Tema do Jogo** (ex: *Inteligência Artificial*, *Marketing Digital*, *Python*, etc.) e a quantidade de perguntas (ex: 6, 9 ou 12).
4. Clique em **"🚀 Gerar e Inserir no Kahoot Automaticamente"**.
5. As perguntas serão geradas com exatamente 1/3 fáceis, 1/3 médias e 1/3 difíceis (em ordem aleatória), alternando entre múltipla escolha e verdadeiro/falso, respeitando rigorosamente os limites de 120 caracteres para perguntas e 75 para respostas!
