// popup.js - Controller for the Kahoot! AI Creator Extension Popup

let generatedQuestions = [];
let isKahootTab = false;
let currentTabId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check active tab
  await checkActiveTab();

  // 2. Load stored settings
  loadStoredSettings();

  // 3. Register event listeners
  setupEventListeners();
});

async function checkActiveTab() {
  const badge = document.getElementById('kahoot-status-badge');
  const statusText = document.getElementById('status-text');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('create.kahoot.it')) {
      isKahootTab = true;
      currentTabId = tab.id;
      badge.className = 'status-badge online';
      statusText.textContent = 'Conectado ao Kahoot!';
    } else {
      isKahootTab = false;
      badge.className = 'status-badge offline';
      statusText.innerHTML = '<a href="https://create.kahoot.it/creator" id="linkOpenKahoot" style="color:inherit;text-decoration:underline;">Abrir Criador Kahoot ↗</a>';
      
      const link = document.getElementById('linkOpenKahoot');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: 'https://create.kahoot.it/creator' });
        });
      }
    }
  } catch (err) {
    console.error('Erro ao verificar aba:', err);
  }
}

function loadStoredSettings() {
  chrome.storage.local.get(['geminiApiKey', 'lastTheme', 'countInput', 'timeSelect'], (data) => {
    if (data.geminiApiKey) {
      document.getElementById('apiKeyInput').value = data.geminiApiKey;
    }
    if (data.lastTheme) {
      document.getElementById('themeInput').value = data.lastTheme;
      highlightMatchingChip(data.lastTheme);
    }
    if (data.countInput) {
      document.getElementById('countInput').value = data.countInput;
    }
    if (data.timeSelect) {
      document.getElementById('timeSelect').value = data.timeSelect;
    }
  });
}

function highlightMatchingChip(theme) {
  const trimmed = (theme || '').trim();
  document.querySelectorAll('.quick-chip').forEach(chip => {
    if (chip.getAttribute('data-theme') === trimmed) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function setupEventListeners() {
  const themeInput = document.getElementById('themeInput');
  const countInput = document.getElementById('countInput');
  const timeSelect = document.getElementById('timeSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');

  // Stepper buttons for total questions
  document.getElementById('btnMinusCount').addEventListener('click', () => {
    const val = parseInt(countInput.value, 10) || 6;
    if (val > 1) {
      countInput.value = val - 1;
      saveFormState();
    }
  });

  document.getElementById('btnPlusCount').addEventListener('click', () => {
    const val = parseInt(countInput.value, 10) || 6;
    if (val < 30) {
      countInput.value = val + 1;
      saveFormState();
    }
  });

  // Quick theme chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      themeInput.value = chip.getAttribute('data-theme');
      saveFormState();
      themeInput.focus();
    });
  });

  // Input listener on themeInput to auto-update chips
  themeInput.addEventListener('input', () => {
    highlightMatchingChip(themeInput.value);
    saveFormState();
  });

  // Toggle API key accordion with chevron animation
  const toggleBtn = document.getElementById('toggleApiKey');
  const body = document.getElementById('apiKeyBody');
  const chevron = document.getElementById('chevronIcon');
  toggleBtn.addEventListener('click', () => {
    const isClosed = body.style.display === 'none';
    body.style.display = isClosed ? 'block' : 'none';
    chevron.className = isClosed ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
  });

  // Auto-save fields on change
  countInput.addEventListener('change', () => {
    let val = parseInt(countInput.value, 10) || 6;
    if (val < 1) val = 1;
    if (val > 30) val = 30;
    countInput.value = val;
    saveFormState();
  });

  timeSelect.addEventListener('change', saveFormState);
  apiKeyInput.addEventListener('input', () => {
    chrome.storage.local.set({ geminiApiKey: apiKeyInput.value.trim() });
  });

  // Generate and Inject button
  document.getElementById('btnGenerateAndInject').addEventListener('click', async () => {
    await handleGenerate(true);
  });

  // Preview only button
  document.getElementById('btnPreviewOnly').addEventListener('click', async () => {
    await handleGenerate(false);
  });

  // Export CSV button
  document.getElementById('btnExportCsv').addEventListener('click', async () => {
    const theme = themeInput.value.trim() || 'Quiz Kahoot';
    if (generatedQuestions.length === 0) {
      await handleGenerate(false);
    }
    if (generatedQuestions.length > 0) {
      exportToKahootCSV(generatedQuestions, theme);
    }
  });

  // Inject from preview button
  document.getElementById('btnInjectPreviewed').addEventListener('click', async () => {
    if (generatedQuestions.length > 0) {
      await injectQuestionsIntoKahoot(generatedQuestions);
    }
  });

  // Listen for progress messages from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'INJECTION_PROGRESS') {
      updateProgress(message.current, message.total, message.status);
    }
    if (message.action === 'INJECTION_COMPLETE') {
      showCompletion();
    }
  });
}

function saveFormState() {
  chrome.storage.local.set({
    lastTheme: document.getElementById('themeInput').value,
    countInput: document.getElementById('countInput').value,
    timeSelect: document.getElementById('timeSelect').value
  });
}

function toggleButtonsState(disabled) {
  const btns = [
    document.getElementById('btnGenerateAndInject'),
    document.getElementById('btnPreviewOnly'),
    document.getElementById('btnExportCsv'),
    document.getElementById('btnInjectPreviewed')
  ];
  btns.forEach(btn => {
    if (btn) btn.disabled = disabled;
  });
}

async function handleGenerate(injectDirectly = false) {
  const theme = document.getElementById('themeInput').value.trim();
  if (!theme) {
    alert('Por favor, informe o tema ou assunto do jogo!');
    document.getElementById('themeInput').focus();
    return;
  }

  const count = parseInt(document.getElementById('countInput').value, 10) || 6;
  const timeLimit = parseInt(document.getElementById('timeSelect').value, 10) || 20;
  const apiKey = document.getElementById('apiKeyInput').value.trim();

  // Show progress UI and lock buttons
  showProgress('Gerando perguntas balanceadas (1ª sempre Quiz)...', 15);
  toggleButtonsState(true);

  try {
    let questions = [];

    if (apiKey) {
      updateProgress(1, 4, 'Consultando modelo Gemini AI com regras balanceadas...');
      questions = await generateQuestionsWithGemini(apiKey, { theme, count, timeLimit });
    } else {
      updateProgress(1, 3, 'Criando perguntas balanceadas com o motor local...');
      await new Promise(r => setTimeout(r, 400));
      questions = generateQuestionsLocal({ theme, count, timeLimit });
    }

    generatedQuestions = (typeof ensureFirstQuestionIsQuiz === 'function')
      ? ensureFirstQuestionIsQuiz(questions)
      : questions;

    renderPreview(generatedQuestions);

    if (injectDirectly) {
      await injectQuestionsIntoKahoot(generatedQuestions);
    } else {
      hideProgress();
    }

  } catch (error) {
    console.error('Erro na geração:', error);
    alert('Aviso: ' + error.message + '\n\nUsando gerador inteligente offline alternativo...');
    const fallback = generateQuestionsLocal({ theme, count, timeLimit });
    generatedQuestions = (typeof ensureFirstQuestionIsQuiz === 'function')
      ? ensureFirstQuestionIsQuiz(fallback)
      : fallback;

    renderPreview(generatedQuestions);

    if (injectDirectly) {
      await injectQuestionsIntoKahoot(generatedQuestions);
    } else {
      hideProgress();
    }
  } finally {
    if (!injectDirectly) {
      toggleButtonsState(false);
    }
  }
}

async function injectQuestionsIntoKahoot(questions) {
  if (!isKahootTab || !currentTabId) {
    hideProgress();
    toggleButtonsState(false);
    const openNow = confirm(
      'Você precisa estar com a tela do criador de jogos do Kahoot! aberta (create.kahoot.it/creator).\n\nDeseja abrir o criador do Kahoot! agora?'
    );
    if (openNow) {
      chrome.tabs.create({ url: 'https://create.kahoot.it/creator' });
    }
    return;
  }

  showProgress(`Iniciando inserção de ${questions.length} slides no Kahoot!...`, 20);
  toggleButtonsState(true);

  // Send message to content script
  chrome.tabs.sendMessage(currentTabId, {
    action: 'START_INJECTION',
    questions: questions
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Erro ao conectar ao content script:', chrome.runtime.lastError.message);
      chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ['generator.js', 'content.js']
      }, () => {
        chrome.tabs.sendMessage(currentTabId, {
          action: 'START_INJECTION',
          questions: questions
        });
      });
    }
  });
}

function renderPreview(questions) {
  const previewSection = document.getElementById('previewSection');
  const questionsList = document.getElementById('questionsList');
  const previewCount = document.getElementById('previewCount');

  if (!previewSection || !questionsList) return;

  previewSection.style.display = 'flex';
  if (previewCount) previewCount.textContent = questions.length;
  questionsList.innerHTML = '';

  const colors = ['red', 'blue', 'yellow', 'green'];
  const symbols = ['▲', '◆', '●', '■'];
  const defaultTime = parseInt(document.getElementById('timeSelect')?.value, 10) || 20;

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'question-item';

    const isTF = q.type === 'true_false' || (Array.isArray(q.answers) && q.answers.length === 2);
    const diffClass = q.difficulty ? q.difficulty.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") : 'medio';
    const isFirstQuestion = (idx === 0);

    let answersHtml = '';
    const answers = isTF ? ['Verdadeiro', 'Falso'] : (q.answers || []);

    answers.forEach((ans, aIdx) => {
      const isCorrect = aIdx === q.correctIndex;
      const colorClass = isTF ? (aIdx === 0 ? 'blue' : 'red') : colors[aIdx % 4];
      const symbol = isTF ? (aIdx === 0 ? '✔' : '✖') : symbols[aIdx % 4];

      answersHtml += `
        <div class="ans-badge ${colorClass} ${isCorrect ? 'correct' : ''}" title="${ans} (${ans.length}/75 chars)">
          <span>${symbol}</span> <span>${ans}</span> ${isCorrect ? '<i class="fa-solid fa-check" style="margin-left:auto;"></i>' : ''}
        </div>
      `;
    });

    item.innerHTML = `
      <div class="question-meta-row">
        <span class="meta-pill ${diffClass}">${q.difficulty || 'Médio'}</span>
        <span class="meta-pill ${isTF ? 'type-tf' : 'type-quiz'}">
          ${isTF ? '<i class="fa-solid fa-scale-balanced"></i> V / F' : '<i class="fa-solid fa-list-check"></i> Múltipla Escolha'}
        </span>
        ${isFirstQuestion ? '<span class="meta-pill" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.35);"><i class="fa-solid fa-star"></i> Slide 1</span>' : ''}
        <span class="meta-pill" style="background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.12);">
          <i class="fa-regular fa-clock"></i> ${q.time || defaultTime}s
        </span>
        <span class="char-counter">${q.question.length}/120 chars</span>
      </div>
      <div class="question-item-title">#${idx + 1}. ${q.question}</div>
      <div class="answers-grid" style="${isTF ? 'grid-template-columns: 1fr 1fr;' : ''}">
        ${answersHtml}
      </div>
    `;

    questionsList.appendChild(item);
  });

  // Smooth scroll down to preview section
  setTimeout(() => {
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

function showProgress(title, percent = 10) {
  const card = document.getElementById('progressCard');
  if (!card) return;
  card.style.display = 'block';
  document.getElementById('progressTitle').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${title}`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBar').style.width = `${percent}%`;
  document.getElementById('progressDesc').textContent = 'Preparando...';
}

function updateProgress(current, total, statusText) {
  const card = document.getElementById('progressCard');
  if (!card) return;
  card.style.display = 'block';
  const percent = Math.min(100, Math.round((current / total) * 100));

  document.getElementById('progressTitle').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Inserindo slides no Kahoot!`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBar').style.width = `${percent}%`;
  document.getElementById('progressDesc').textContent = `Slide ${current} de ${total}: ${statusText || 'Preenchendo...'}`;
}

function showCompletion() {
  const card = document.getElementById('progressCard');
  if (card) card.style.display = 'block';
  document.getElementById('progressTitle').innerHTML = `<i class="fa-solid fa-circle-check" style="color:#4ade80;"></i> Concluído com Sucesso!`;
  document.getElementById('progressPercent').textContent = `100%`;
  document.getElementById('progressBar').style.width = `100%`;
  document.getElementById('progressDesc').textContent = 'Todas as perguntas foram inseridas no Kahoot!';

  toggleButtonsState(false);
}

function hideProgress() {
  const card = document.getElementById('progressCard');
  if (card) card.style.display = 'none';
  toggleButtonsState(false);
}
