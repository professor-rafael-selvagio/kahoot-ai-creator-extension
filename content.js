// content.js - Automation Engine & In-Page Widget for Kahoot! Creator
console.log('[Kahoot! AI Creator] Content script ativado em create.kahoot.it');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Initialize on-page assistant when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOnPageWidget);
} else {
  initOnPageWidget();
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_INJECTION') {
    startAutomatedInjection(message.questions)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

/**
 * Checks if an element belongs to the extension widget
 */
function isExtensionElement(el) {
  if (!el || !el.closest) return false;
  return el.closest('#kahoot-ai-modal-overlay, #kahoot-ai-floating-trigger, #kahoot-ai-live-banner') != null;
}

/**
 * Injects a floating launcher and on-page configuration modal into Kahoot! Creator
 */
function initOnPageWidget() {
  if (document.getElementById('kahoot-ai-floating-trigger')) return;

  // 1. Floating Launcher Button
  const trigger = document.createElement('div');
  trigger.id = 'kahoot-ai-floating-trigger';
  trigger.innerHTML = `
    <div class="badge-icon">⚡</div>
    <span>Criador de Jogos IA</span>
  `;
  document.body.appendChild(trigger);

  // 2. Modal Overlay
  const modal = document.createElement('div');
  modal.id = 'kahoot-ai-modal-overlay';
  modal.innerHTML = `
    <div id="kahoot-ai-modal-card">
      <div class="kahoot-ai-header">
        <div class="kahoot-ai-title-wrap">
          <div class="kahoot-ai-logo">⚡</div>
          <div class="kahoot-ai-title">
            <h2>Kahoot! AI Creator</h2>
            <p>Gerador Automático de Jogos & Perguntas</p>
            <p style="font-size: 10.5px; color: #a78bfa; margin: 1px 0 0 0;">by Prof. Esp. Rafael de Sena Selvagio</p>
          </div>
        </div>
        <button type="button" class="kahoot-ai-close" id="kahoot-ai-close-btn">&times;</button>
      </div>

      <!-- Theme Input -->
      <div class="kahoot-ai-field">
        <label for="kahoot-ai-theme">
          <span style="color:#eab308;">💡</span> Tema ou Assunto do Jogo:
        </label>
        <input type="text" id="kahoot-ai-theme" placeholder="Ex: Inteligência Artificial, Marketing Digital, Python..." autofocus />
        <div class="kahoot-ai-quick-themes">
          <span class="kahoot-ai-chip" data-theme="Inteligência Artificial">🤖 IA</span>
          <span class="kahoot-ai-chip" data-theme="Marketing Digital">📈 Marketing</span>
          <span class="kahoot-ai-chip" data-theme="Programação em Python">🐍 Python</span>
          <span class="kahoot-ai-chip" data-theme="Excel e Fórmulas">📊 Excel</span>
          <span class="kahoot-ai-chip" data-theme="História do Brasil">🏛️ História</span>
        </div>
      </div>

      <!-- Balanced Rules Card -->
      <div class="kahoot-ai-rules-card">
        <div class="kahoot-ai-rule-item">
          <span style="color:#fbbf24;">⭐</span>
          <span><strong>1ª Pergunta:</strong> Sempre Múltipla Escolha (Quiz)</span>
        </div>
        <div class="kahoot-ai-rule-item">
          <span style="color:#a78bfa;">⚖️</span>
          <span><strong>1/3 Fácil, 1/3 Médio, 1/3 Difícil</strong> (balanceado)</span>
        </div>
        <div class="kahoot-ai-rule-item">
          <span style="color:#38bdf8;">🔀</span>
          <span><strong>Mescla:</strong> Múltipla Escolha + Verdadeiro/Falso</span>
        </div>
        <div class="kahoot-ai-rule-item">
          <span style="color:#4ade80;">📏</span>
          <span><strong>Limites:</strong> Pergunta máx 120 chars • Respostas máx 75 chars</span>
        </div>
      </div>

      <!-- Number of Questions & Time Select -->
      <div class="kahoot-ai-row" style="grid-template-columns: 1.2fr 1fr; margin-top: 2px;">
        <div class="kahoot-ai-field">
          <label for="kahoot-ai-count"><span style="color:#38bdf8;">🔢</span> Total Perguntas:</label>
          <div class="kahoot-ai-stepper">
            <button type="button" class="kahoot-ai-stepper-btn" id="kahoot-ai-btn-minus">-</button>
            <input type="number" id="kahoot-ai-count" value="6" min="1" max="30" />
            <button type="button" class="kahoot-ai-stepper-btn" id="kahoot-ai-btn-plus">+</button>
          </div>
        </div>
        <div class="kahoot-ai-field">
          <label for="kahoot-ai-time"><span style="color:#4ade80;">⏱️</span> Tempo:</label>
          <select id="kahoot-ai-time">
            <option value="10">10s</option>
            <option value="20" selected>20s (Padrão)</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
          </select>
        </div>
      </div>

      <!-- Gemini API Key Collapsible -->
      <div class="kahoot-ai-accordion">
        <button type="button" class="kahoot-ai-accordion-toggle" id="kahoot-ai-toggle-api">
          <span><span style="color:#a78bfa;">🔑</span> Chave Gemini API (Opcional)</span>
          <span id="kahoot-ai-chevron" style="font-size: 11px;">▼</span>
        </button>
        <div class="kahoot-ai-accordion-body" id="kahoot-ai-api-body" style="display: none;">
          <p class="kahoot-ai-api-help">
            Use sua chave gratuita da Google AI Studio. Se deixar em branco, o motor inteligente offline é usado automaticamente.
          </p>
          <div class="kahoot-ai-api-wrap">
            <input type="password" id="kahoot-ai-apikey" placeholder="Cole sua chave AIzaSy..." />
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="kahoot-ai-key-link" title="Obter chave gratuita no Google AI Studio">
              Obter Grátis ↗
            </a>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="kahoot-ai-actions">
        <button type="button" class="kahoot-ai-btn kahoot-ai-btn-primary" id="kahoot-ai-submit-btn">
          ✨ Gerar e Inserir no Kahoot!
        </button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="kahoot-ai-btn kahoot-ai-btn-secondary" id="kahoot-ai-preview-btn" style="flex: 1;">
            👁️ Pré-visualizar
          </button>
          <button type="button" class="kahoot-ai-btn kahoot-ai-btn-secondary" id="kahoot-ai-csv-btn" style="flex: 1;" title="Baixar planilha para importação em lote">
            📥 Baixar CSV
          </button>
        </div>
      </div>

      <!-- Preview Section inside modal -->
      <div class="kahoot-ai-preview-section" id="kahoot-ai-preview-box" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 12px; font-weight: 700; color: #fff;">
            📋 Perguntas Geradas (<span id="kahoot-ai-preview-count">0</span>)
          </h4>
          <button type="button" class="kahoot-ai-btn-text" id="kahoot-ai-inject-preview-btn">
            ▶ Inserir Agora
          </button>
        </div>
        <div class="kahoot-ai-preview-list" id="kahoot-ai-preview-list"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Load existing settings
  chrome.storage.local.get(['geminiApiKey', 'lastTheme', 'countInput', 'timeSelect'], (data) => {
    if (data.geminiApiKey) document.getElementById('kahoot-ai-apikey').value = data.geminiApiKey;
    if (data.lastTheme) {
      document.getElementById('kahoot-ai-theme').value = data.lastTheme;
      document.querySelectorAll('.kahoot-ai-chip').forEach(c => {
        if (c.getAttribute('data-theme') === data.lastTheme) c.classList.add('active');
      });
    }
    if (data.countInput) document.getElementById('kahoot-ai-count').value = data.countInput;
    if (data.timeSelect) document.getElementById('kahoot-ai-time').value = data.timeSelect;
  });

  // Event handlers
  trigger.addEventListener('click', () => {
    modal.classList.add('active');
  });

  document.getElementById('kahoot-ai-close-btn').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Quick Chips in modal
  document.querySelectorAll('.kahoot-ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.kahoot-ai-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const themeField = document.getElementById('kahoot-ai-theme');
      themeField.value = chip.getAttribute('data-theme');
      themeField.focus();
    });
  });

  // Stepper buttons in modal
  const countInputEl = document.getElementById('kahoot-ai-count');
  document.getElementById('kahoot-ai-btn-minus').addEventListener('click', () => {
    const val = parseInt(countInputEl.value, 10) || 6;
    if (val > 1) countInputEl.value = val - 1;
  });
  document.getElementById('kahoot-ai-btn-plus').addEventListener('click', () => {
    const val = parseInt(countInputEl.value, 10) || 6;
    if (val < 30) countInputEl.value = val + 1;
  });

  // Accordion for Gemini API Key in modal
  const toggleApiBtn = document.getElementById('kahoot-ai-toggle-api');
  const apiBodyEl = document.getElementById('kahoot-ai-api-body');
  const chevronEl = document.getElementById('kahoot-ai-chevron');
  toggleApiBtn.addEventListener('click', () => {
    const isClosed = apiBodyEl.style.display === 'none';
    apiBodyEl.style.display = isClosed ? 'block' : 'none';
    chevronEl.textContent = isClosed ? '▲' : '▼';
  });

  let modalQuestionsCache = [];

  // Generate and Inject directly
  document.getElementById('kahoot-ai-submit-btn').addEventListener('click', async () => {
    const theme = document.getElementById('kahoot-ai-theme').value.trim();
    if (!theme) {
      alert('Por favor, informe o tema do jogo!');
      return;
    }

    const count = parseInt(countInputEl.value, 10) || 6;
    const timeLimit = parseInt(document.getElementById('kahoot-ai-time').value, 10) || 20;
    const apiKey = document.getElementById('kahoot-ai-apikey').value.trim();

    // Save to storage
    chrome.storage.local.set({ geminiApiKey: apiKey, lastTheme: theme, countInput: count, timeSelect: timeLimit });

    modal.classList.remove('active');

    try {
      showLiveBanner('🧠 Gerando perguntas balanceadas (1ª sempre Quiz)...');
      let questions = [];

      if (apiKey) {
        questions = await generateQuestionsWithGemini(apiKey, { theme, count, timeLimit });
      } else {
        await sleep(400);
        questions = generateQuestionsLocal({ theme, count, timeLimit });
      }

      questions = ensureFirstQuestionIsQuiz(questions);
      await startAutomatedInjection(questions);
    } catch (err) {
      console.error(err);
      alert('Erro na geração: ' + err.message + '\nUsando motor offline alternativo.');
      const fallback = ensureFirstQuestionIsQuiz(generateQuestionsLocal({ theme, count, timeLimit }));
      await startAutomatedInjection(fallback);
    }
  });

  // Preview button inside modal
  document.getElementById('kahoot-ai-preview-btn').addEventListener('click', async () => {
    const theme = document.getElementById('kahoot-ai-theme').value.trim();
    if (!theme) {
      alert('Por favor, informe o tema do jogo!');
      return;
    }

    const count = parseInt(countInputEl.value, 10) || 6;
    const timeLimit = parseInt(document.getElementById('kahoot-ai-time').value, 10) || 20;
    const apiKey = document.getElementById('kahoot-ai-apikey').value.trim();

    showLiveBanner('🧠 Gerando pré-visualização das perguntas...');

    try {
      let questions = [];
      if (apiKey) {
        questions = await generateQuestionsWithGemini(apiKey, { theme, count, timeLimit });
      } else {
        await sleep(300);
        questions = generateQuestionsLocal({ theme, count, timeLimit });
      }

      modalQuestionsCache = ensureFirstQuestionIsQuiz(questions);
      renderModalQuestionsPreview(modalQuestionsCache);
      removeLiveBanner();
    } catch (err) {
      console.error(err);
      const fallback = ensureFirstQuestionIsQuiz(generateQuestionsLocal({ theme, count, timeLimit }));
      modalQuestionsCache = fallback;
      renderModalQuestionsPreview(fallback);
      removeLiveBanner();
    }
  });

  // Inject previewed questions
  document.getElementById('kahoot-ai-inject-preview-btn').addEventListener('click', async () => {
    if (modalQuestionsCache.length > 0) {
      modal.classList.remove('active');
      await startAutomatedInjection(modalQuestionsCache);
    }
  });

  function renderModalQuestionsPreview(questions) {
    const box = document.getElementById('kahoot-ai-preview-box');
    const countSpan = document.getElementById('kahoot-ai-preview-count');
    const list = document.getElementById('kahoot-ai-preview-list');

    box.style.display = 'flex';
    countSpan.textContent = questions.length;
    list.innerHTML = '';

    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
    const symbols = ['▲', '◆', '●', '■'];

    questions.forEach((q, idx) => {
      const isTF = q.type === 'true_false' || (Array.isArray(q.answers) && q.answers.length === 2);
      const isFirst = (idx === 0);
      const answers = isTF ? ['Verdadeiro', 'Falso'] : (q.answers || []);

      let ansHtml = '';
      answers.forEach((ans, aIdx) => {
        const isCorrect = (aIdx === q.correctIndex);
        const bg = isTF ? (aIdx === 0 ? '#1368ce' : '#e21b3c') : colors[aIdx % 4];
        const sym = isTF ? (aIdx === 0 ? '✔' : '✖') : symbols[aIdx % 4];

        ansHtml += `
          <div style="background:${bg}; padding: 4px 6px; border-radius: 6px; font-size: 10px; color: #fff; display: flex; align-items: center; gap: 4px; ${isCorrect ? 'box-shadow: 0 0 0 1.5px #fff; font-weight:700;' : ''}">
            <span>${sym}</span> <span>${ans}</span> ${isCorrect ? '✔' : ''}
          </div>
        `;
      });

      const qDiv = document.createElement('div');
      qDiv.style.cssText = 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px;';
      qDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; font-size:9.5px;">
          <span style="background:rgba(139,92,246,0.25); color:#c4b5fd; padding:1px 5px; border-radius:4px; font-weight:700;">${q.difficulty}</span>
          <span style="background:rgba(56,189,248,0.2); color:#38bdf8; padding:1px 5px; border-radius:4px; font-weight:700;">${isTF ? 'V/F' : 'Quiz'}</span>
          ${isFirst ? '<span style="background:rgba(251,191,36,0.2); color:#fbbf24; padding:1px 5px; border-radius:4px; font-weight:700;">Slide 1</span>' : ''}
          <span style="margin-left:auto; color:#94a3b8;">${q.question.length}/120 chars</span>
        </div>
        <div style="font-size:11.5px; font-weight:600; color:#fff; margin-bottom:6px;">#${idx + 1}. ${q.question}</div>
        <div style="display:grid; grid-template-columns:${isTF ? '1fr 1fr' : '1fr 1fr'}; gap:4px;">
          ${ansHtml}
        </div>
      `;
      list.appendChild(qDiv);
    });

    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Export CSV
  document.getElementById('kahoot-ai-csv-btn').addEventListener('click', async () => {
    const theme = document.getElementById('kahoot-ai-theme').value.trim() || 'Quiz';
    const count = parseInt(countInputEl.value, 10) || 6;
    const questions = ensureFirstQuestionIsQuiz(generateQuestionsLocal({ theme, count }));
    exportToKahootCSV(questions, theme);
  });
}

/**
 * Live Floating Top Banner to show progress
 */
function showLiveBanner(text) {
  let banner = document.getElementById('kahoot-ai-live-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'kahoot-ai-live-banner';
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    <div class="spinner"></div>
    <span>${text}</span>
  `;
}

function removeLiveBanner() {
  const banner = document.getElementById('kahoot-ai-live-banner');
  if (banner) banner.remove();
}

/**
 * Checks whether an element is empty or contains default placeholder
 */
function isSlideEmpty(titleElement) {
  if (!titleElement) return true;
  const txt = titleElement.textContent.trim().toLowerCase();
  if (!txt) return true;
  if (txt.includes('comece a digitar') || txt.includes('start typing') || txt.includes('digite sua pergunta')) {
    return true;
  }
  return false;
}

/**
 * Selectors for Question Title
 * Always returns the innermost contenteditable/textbox node, prioritized from top to bottom
 */
function getQuestionTitleElement() {
  // 1. Direct functional selectors
  const selectors = [
    '[data-functional-selector="question-title__input"] [contenteditable="true"]',
    '[data-functional-selector="question-title__input"] div[role="textbox"]',
    '[data-functional-selector="question-title__input"]',
    '[data-functional-selector*="question-title"] [contenteditable="true"]',
    '[data-functional-selector*="question-title"] div[role="textbox"]',
    '[data-functional-selector*="question-title"]',
    'div[role="textbox"][aria-label*="pergunta" i]',
    'div[role="textbox"][aria-label*="question" i]',
    '[contenteditable="true"][aria-label*="pergunta" i]',
    '[contenteditable="true"][aria-label*="question" i]'
  ];

  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && !isExtensionElement(el)) {
      return el.isContentEditable ? el : (el.querySelector('[contenteditable="true"]') || el.querySelector('div[role="textbox"]') || el);
    }
  }

  // 2. Fallback: Search all contenteditable elements in canvas
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"], div[role="textbox"]'))
    .filter(el => {
      if (isExtensionElement(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 80 && rect.height > 15;
    });

  if (editables.length > 0) {
    // Question title in Kahoot canvas is ALWAYS the topmost editable
    editables.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const topEl = editables[0];
    return topEl.isContentEditable ? topEl : (topEl.querySelector('[contenteditable="true"]') || topEl);
  }

  return null;
}

/**
 * Checks whether the current active slide in Kahoot is a native True/False slide
 */
function isNativeTrueFalseSlide() {
  // 1. Check right sidebar question type selector
  const typeSelector = document.querySelector('[data-functional-selector="question-type-select"]') ||
                        document.querySelector('[data-functional-selector*="question-type"]');
  if (typeSelector && !isExtensionElement(typeSelector)) {
    const txt = typeSelector.textContent.toLowerCase();
    if (txt.includes('true') || txt.includes('verdadeiro') || txt.includes('false') || txt.includes('falso')) {
      return true;
    }
  }

  // 2. Check canvas for native True/False specific selectors
  const tfSelectors = [
    '[data-functional-selector*="true-false"]',
    '[data-functional-selector*="true_false"]',
    '[data-functional-selector*="boolean-answer"]'
  ];
  for (const sel of tfSelectors) {
    const found = document.querySelector(sel);
    if (found && !isExtensionElement(found)) return true;
  }

  // 3. Check if there are no editable answer textboxes and True/False cards exist
  const editableAnswers = Array.from(document.querySelectorAll('[data-functional-selector="question-answer__input"] [contenteditable="true"], [data-functional-selector*="question-answer"] [contenteditable="true"]'))
    .filter(el => !isExtensionElement(el));

  if (editableAnswers.length === 0) {
    const hasTFText = Array.from(document.querySelectorAll('div, button, span')).some(el => {
      if (isExtensionElement(el)) return false;
      const t = el.textContent.trim().toLowerCase();
      return t === 'verdadeiro' || t === 'true' || t === 'falso' || t === 'false';
    });
    if (hasTFText) return true;
  }

  return false;
}

/**
 * Selectors for Answer alternatives (Quiz slide only)
 * If active slide is native True/False, returns empty array to prevent overwriting the title
 */
function getAnswerInputElements() {
  if (isNativeTrueFalseSlide()) {
    return [];
  }

  const titleEl = getQuestionTitleElement();

  // 1. Direct answer selectors
  let inputs = Array.from(document.querySelectorAll('[data-functional-selector="question-answer__input"] [contenteditable="true"]'));
  if (inputs.length < 2) {
    inputs = Array.from(document.querySelectorAll('[data-functional-selector="question-answer__input"] div[role="textbox"]'));
  }
  if (inputs.length < 2) {
    inputs = Array.from(document.querySelectorAll('[data-functional-selector="question-answer__input"]'));
  }
  if (inputs.length < 2) {
    inputs = Array.from(document.querySelectorAll('[data-functional-selector*="question-answer"] [contenteditable="true"]'));
  }
  if (inputs.length < 2) {
    inputs = Array.from(document.querySelectorAll('div[data-functional-selector^="answer-"] [contenteditable="true"]'));
  }

  // Filter out extension elements and title
  inputs = inputs.filter(el => {
    if (!el || isExtensionElement(el)) return false;
    if (titleEl && (el === titleEl || el.contains(titleEl) || titleEl.contains(el))) return false;
    return true;
  });

  if (inputs.length >= 2) {
    return inputs.map(el => el.isContentEditable ? el : (el.querySelector('[contenteditable="true"]') || el.querySelector('div[role="textbox"]') || el));
  }

  // 2. Fallback: Search all editables positioned strictly below title
  if (titleEl) {
    const titleRect = titleEl.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll('[contenteditable="true"], div[role="textbox"]'))
      .filter(el => {
        if (isExtensionElement(el) || el === titleEl || el.contains(titleEl) || titleEl.contains(el)) return false;
        const rect = el.getBoundingClientRect();
        return rect.top > titleRect.bottom + 20 && rect.width > 50 && rect.height > 20;
      })
      .sort((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        if (Math.abs(rA.top - rB.top) > 30) return rA.top - rB.top;
        return rA.left - rB.left;
      });

    if (candidates.length >= 2) {
      return candidates.slice(0, 4);
    }
  }

  return [];
}

/**
 * Converts the active slide's question type via the right sidebar (used for slide 1 if needed)
 */
async function convertCurrentSlideType(targetType) {
  const typeSelector = (
    document.querySelector('[data-functional-selector="question-type-select"]') ||
    document.querySelector('[data-functional-selector*="question-type"]') ||
    Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
      if (isExtensionElement(b)) return false;
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return aria.includes('question type') || aria.includes('tipo de pergunta');
    })
  );

  if (!typeSelector) return false;

  const currentText = typeSelector.textContent.toLowerCase();
  const alreadyTF = currentText.includes('verdadeiro') || currentText.includes('true');
  const alreadyQuiz = currentText.includes('quiz');

  if (targetType === 'true_false' && alreadyTF) return true;
  if (targetType === 'quiz' && alreadyQuiz) return true;

  typeSelector.click();
  await sleep(400);

  const options = Array.from(document.querySelectorAll('[role="option"], button, li, div[data-functional-selector*="type"]'))
    .filter(el => !isExtensionElement(el));

  const targetOption = options.find(opt => {
    const txt = opt.textContent.toLowerCase().replace(/\s+/g, ' ');
    if (targetType === 'true_false') {
      return (txt.includes('verdadeiro') && txt.includes('falso')) ||
             (txt.includes('true') && txt.includes('false')) ||
             txt.includes('verdadeiro') ||
             txt.includes('true or false');
    } else {
      return txt === 'quiz' || txt.includes('quiz');
    }
  });

  if (targetOption) {
    targetOption.click();
    await sleep(800);
    return true;
  } else {
    // Close dropdown
    typeSelector.click();
    await sleep(250);
    return false;
  }
}

/**
 * Clicks the "Add question" button and selects "Quiz" or "True or false"
 */
async function clickAddQuestion(type = 'quiz') {
  // 1. Locate "Add question" button
  const addBtn = (
    document.querySelector('[data-functional-selector="add-question-button"]') ||
    document.querySelector('button[data-functional-selector*="add-question"]') ||
    Array.from(document.querySelectorAll('button')).find((b) => {
      if (isExtensionElement(b)) return false;
      const txt = b.textContent.toLowerCase().replace(/\s+/g, ' ');
      return (txt.includes('add question') || txt.includes('adicionar pergunta')) && !b.disabled;
    })
  );

  if (!addBtn) {
    console.warn('[Kahoot! AI] Botão "Adicionar pergunta" não localizado.');
    return;
  }

  addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  addBtn.click();
  await sleep(600);

  // 2. Poll for the modal/drawer options
  const isTF = (type === 'true_false');
  let targetBtn = null;
  const startTime = Date.now();

  while (Date.now() - startTime < 3000) {
    if (isTF) {
      targetBtn = (
        document.querySelector('[data-functional-selector="create-button__true-false"]') ||
        document.querySelector('[data-functional-selector="create-button__true_false"]') ||
        document.querySelector('[data-functional-selector="create-button__tf"]') ||
        document.querySelector('button[data-functional-selector*="true-false"]') ||
        document.querySelector('button[data-functional-selector*="true_false"]') ||
        Array.from(document.querySelectorAll('button, div[role="button"]')).find((b) => {
          if (isExtensionElement(b)) return false;
          const txt = b.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
          return (
            (txt.includes('verdadeiro') && txt.includes('falso')) ||
            (txt.includes('true') && txt.includes('false')) ||
            txt.includes('verdadeiro ou falso') ||
            txt.includes('true or false') ||
            txt === 'verdadeiro'
          ) && !b.disabled;
        })
      );
    } else {
      targetBtn = (
        document.querySelector('[data-functional-selector="create-button__quiz"]') ||
        document.querySelector('button[data-functional-selector*="quiz"]') ||
        Array.from(document.querySelectorAll('button, div[role="button"]')).find((b) => {
          if (isExtensionElement(b)) return false;
          const txt = b.textContent.trim().toLowerCase();
          return (txt === 'quiz' || txt.startsWith('quiz')) && !b.disabled;
        })
      );
    }

    if (targetBtn) break;
    await sleep(200);
  }

  // Fallback to Quiz if True/False was not found in modal
  if (!targetBtn && isTF) {
    targetBtn = (
      document.querySelector('[data-functional-selector="create-button__quiz"]') ||
      document.querySelector('button[data-functional-selector*="quiz"]') ||
      Array.from(document.querySelectorAll('button, div[role="button"]')).find((b) => {
        if (isExtensionElement(b)) return false;
        return b.textContent.trim().toLowerCase() === 'quiz' && !b.disabled;
      })
    );
  }

  if (targetBtn) {
    targetBtn.click();
    await sleep(1000);
  } else {
    console.warn('[Kahoot! AI] Opção de slide não encontrada no seletor.');
  }
}

/**
 * Sets text in contenteditable or input cleanly WITHOUT DUPLICATING TEXT
 * Dispatches only necessary events and removes conflicting manual InputEvent
 */
async function setTextContentEditable(element, text) {
  if (!element) return false;

  const target = (element.isContentEditable || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
    ? element
    : (element.querySelector('[contenteditable="true"]') ||
       element.querySelector('div[role="textbox"]') ||
       element.querySelector('textarea, input') ||
       element);

  // If standard input/textarea
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    target.focus();
    target.value = text;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Contenteditable (Draft.js / ProseMirror)
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  target.focus();
  await sleep(50);

  // 1. Clear existing text cleanly
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete', false, null);
  } catch (e) {
    try {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
    } catch (e2) {}
  }
  await sleep(30);

  // 2. Insert text once using execCommand('insertText')
  // In Chrome, this automatically issues the native input pipeline to Draft.js
  let inserted = false;
  try {
    inserted = document.execCommand('insertText', false, text);
  } catch (e) {
    inserted = false;
  }

  // 3. ONLY if execCommand returned false or threw (rare fallback)
  if (!inserted) {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      target.dispatchEvent(new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      }));
    } catch (e) {
      target.textContent = text;
    }
  }

  // 4. Dispatch standard change and blur events (never dispatch duplicate beforeinput with data)
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  target.dispatchEvent(new Event('blur', { bubbles: true }));

  return true;
}

/**
 * Marks the correct answer toggle on both Quiz and True/False slides
 */
async function markCorrectAnswer({ isTF, correctIndex }) {
  const targetIdx = (isTF && correctIndex > 1) ? 0 : (correctIndex || 0);

  // 1. Standard toggle buttons
  let toggles = Array.from(document.querySelectorAll('[data-functional-selector="question-answer__toggle-button"]'));
  if (toggles.length < 2) {
    toggles = Array.from(document.querySelectorAll('button[data-functional-selector*="toggle-button"]'));
  }
  if (toggles.length < 2) {
    toggles = Array.from(document.querySelectorAll('[data-functional-selector*="answer"] button[role="checkbox"], [data-functional-selector*="answer"] button[role="radio"], [data-functional-selector*="answer"] [role="switch"]'));
  }
  if (toggles.length < 2) {
    toggles = Array.from(document.querySelectorAll('button[aria-label*="correct" i], button[aria-label*="correta" i]'));
  }

  toggles = toggles.filter(b => !isExtensionElement(b));

  if (toggles.length >= 2 && toggles[targetIdx]) {
    const btn = toggles[targetIdx];
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    btn.click();
    await sleep(200);
    return true;
  }

  // 2. Native True/False slide cards fallback
  if (isTF) {
    const searchTerms = targetIdx === 0 ? ['verdadeiro', 'true'] : ['falso', 'false'];
    const cards = Array.from(document.querySelectorAll('button, div[role="button"], [data-functional-selector*="answer"]'))
      .filter(el => {
        if (isExtensionElement(el)) return false;
        const txt = (el.textContent || '').trim().toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        return searchTerms.some(t => txt === t || aria.includes(t));
      });

    if (cards.length > 0) {
      cards[0].click();
      await sleep(200);
      return true;
    }
  }

  return false;
}

/**
 * Wait for a DOM element to appear
 */
async function waitForElement(selectorFn, timeoutMs = 3500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = selectorFn();
    if (el) return el;
    await sleep(150);
  }
  return null;
}

/**
 * Automates the insertion of questions directly into Kahoot! Creator
 */
async function startAutomatedInjection(rawQuestions) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    alert('Nenhuma pergunta disponível para inserção.');
    return;
  }

  // Guarantee the first question is ALWAYS Multiple Choice (quiz)
  const questions = (typeof ensureFirstQuestionIsQuiz === 'function')
    ? ensureFirstQuestionIsQuiz(rawQuestions)
    : rawQuestions;

  showLiveBanner(`🚀 Iniciando inserção de ${questions.length} slides no Kahoot!...`);
  await sleep(800);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const slideNumber = i + 1;
    const isTF = (q.type === 'true_false') || (Array.isArray(q.answers) && q.answers.length === 2);
    const typeLabel = isTF ? 'Verdadeiro/Falso' : 'Múltipla Escolha';

    showLiveBanner(`Slide ${slideNumber} de ${questions.length} [${q.difficulty} | ${typeLabel}]: Criando pergunta...`);
    notifyProgress(slideNumber, questions.length, `${typeLabel} (${q.difficulty})...`);

    // Handle slide creation / conversion
    if (i > 0) {
      await clickAddQuestion(q.type);
      await sleep(1000);
    } else {
      // First slide (slide 1)
      const currentTitle = getQuestionTitleElement();
      if (currentTitle && !isSlideEmpty(currentTitle)) {
        await clickAddQuestion(q.type);
        await sleep(1000);
      } else {
        if (isTF) {
          await convertCurrentSlideType('true_false');
          await sleep(600);
        }
      }
    }

    // 1. Fill Question Title (Strictly sanitized and capped at 110 chars)
    showLiveBanner(`Slide ${slideNumber} de ${questions.length}: Preenchendo pergunta...`);
    const titleElement = await waitForElement(() => getQuestionTitleElement(), 5000);
    if (titleElement) {
      const cleanTitle = sanitizeQuestionText(q.question);
      await setTextContentEditable(titleElement, cleanTitle);
      await sleep(350);
    } else {
      console.warn(`[Kahoot! AI] Campo de título do slide ${slideNumber} não encontrado.`);
    }

    // 2. Fill the Answers
    showLiveBanner(`Slide ${slideNumber} de ${questions.length}: Preenchendo respostas...`);
    const isNativeTF = isNativeTrueFalseSlide();

    if (isNativeTF) {
      console.log(`[Kahoot! AI] Slide ${slideNumber}: Slide nativo Verdadeiro/Falso. Alternativas automáticas.`);
      await sleep(250);
    } else {
      // Quiz slide: locate editable answer textboxes
      const answerInputs = await waitForElement(() => {
        const inputs = getAnswerInputElements();
        return inputs.length >= 2 ? inputs : null;
      }, 4000);

      if (answerInputs && answerInputs.length >= 2) {
        if (isTF) {
          // True/False on a Quiz slide: Fill 2 alternatives
          await setTextContentEditable(answerInputs[0], 'Verdadeiro');
          await sleep(200);
          await setTextContentEditable(answerInputs[1], 'Falso');
          await sleep(200);
        } else {
          // Multiple Choice (Quiz): Fill up to 4 alternatives (each max 72 chars)
          for (let aIdx = 0; aIdx < Math.min(4, answerInputs.length); aIdx++) {
            const ansText = sanitizeAnswerText(q.answers[aIdx] || `Alternativa ${aIdx + 1}`);
            await setTextContentEditable(answerInputs[aIdx], ansText);
            await sleep(200);
          }
        }
      } else {
        console.warn(`[Kahoot! AI] Slide ${slideNumber}: Campos de alternativas não localizados.`);
      }
    }

    // 3. Mark the Correct Answer
    showLiveBanner(`Slide ${slideNumber} de ${questions.length}: Marcando resposta correta...`);
    await sleep(300);
    await markCorrectAnswer({ isTF, correctIndex: q.correctIndex });

    await sleep(800); // Allow Kahoot state and autosave to settle
  }

  // Completion
  showLiveBanner(`✅ Todas as ${questions.length} perguntas foram adicionadas com sucesso!`);
  notifyCompletion();

  setTimeout(() => {
    removeLiveBanner();
  }, 4000);
}

function notifyProgress(current, total, status) {
  try {
    chrome.runtime.sendMessage({
      action: 'INJECTION_PROGRESS',
      current,
      total,
      status
    });
  } catch (e) {}
}

function notifyCompletion() {
  try {
    chrome.runtime.sendMessage({ action: 'INJECTION_COMPLETE' });
  } catch (e) {}
}
