// generator.js - AI and Offline Question Generator for Kahoot!

/**
 * Calculates the exact 1/3 easy, 1/3 medium, 1/3 hard distribution for any count
 */
function getDifficultyDistribution(total) {
  const easyCount = Math.floor(total / 3);
  const hardCount = Math.floor(total / 3);
  const mediumCount = total - easyCount - hardCount;
  return { easyCount, mediumCount, hardCount };
}

/**
 * Fisher-Yates array shuffle for true random order
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Ensures the first question (index 0) is ALWAYS Multiple Choice (quiz).
 * If index 0 is True/False, swaps it with the first available quiz question.
 */
function ensureFirstQuestionIsQuiz(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;

  if (questions[0].type === 'quiz') {
    return questions;
  }

  const quizIdx = questions.findIndex(q => q.type === 'quiz');
  if (quizIdx !== -1) {
    const temp = questions[0];
    questions[0] = questions[quizIdx];
    questions[quizIdx] = temp;
  } else {
    // Edge case: if no quiz question exists, convert question 0 to quiz
    questions[0].type = 'quiz';
    if (!Array.isArray(questions[0].answers) || questions[0].answers.length < 4) {
      questions[0].answers = [
        'Alternativa correta',
        'Segunda alternativa',
        'Terceira alternativa',
        'Quarta alternativa'
      ];
      questions[0].correctIndex = 0;
    }
  }

  questions.forEach((q, idx) => {
    q.id = idx + 1;
  });

  return questions;
}

/**
 * Sanitizes and enforces strict length limits on questions (Kahoot max: 120 chars)
 * Caps at 110-115 chars to leave a safe margin and prevents mid-word truncation.
 */
function sanitizeQuestionText(raw, fallback = 'Pergunta do Quiz') {
  if (!raw) return fallback;
  let text = String(raw).trim();

  // Strip markdown formatting
  text = text.replace(/[*_~`]/g, '');

  // Remove leading numbers or labels: "1. ", "Pergunta 1: ", "Q1: ", "1 - "
  text = text.replace(/^(?:pergunta\s*\d+\s*[:.-]\s*|\d+[\s.-]+)/i, '').trim();

  // Strip outer quotes
  text = text.replace(/^["'«“](.*)["'»”]$/, '$1').trim();

  // Normalize multiple spaces/newlines
  text = text.replace(/\s+/g, ' ').trim();

  // If text is longer than 105 chars, truncate gracefully at the last full word before 105
  if (text.length > 105) {
    const cut = text.slice(0, 105);
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 45) {
      text = cut.slice(0, lastSpace).trim();
    } else {
      text = cut.trim();
    }
    // Ensure it ends with question mark or punctuation
    if (!/[?.!]$/.test(text)) {
      text += '?';
    }
  }

  // Absolute hard cap: max 110 characters (strictly under Kahoot's 120 limit)
  return text.slice(0, 110);
}

/**
 * Sanitizes and enforces strict length limits on answers (Kahoot max: 75 chars)
 */
function sanitizeAnswerText(raw, fallback = 'Opção') {
  if (!raw) return fallback;
  let text = String(raw).trim();

  text = text.replace(/[*_~`]/g, '');

  // Remove leading prefixes: "A) ", "1. ", "A - "
  text = text.replace(/^[a-d\d][\s.-]+/i, '').trim();
  text = text.replace(/\s+/g, ' ').trim();

  // If longer than 68 chars, cut gracefully at the last space
  if (text.length > 68) {
    const cut = text.slice(0, 68);
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 35) {
      text = cut.slice(0, lastSpace).trim();
    } else {
      text = cut.trim();
    }
  }

  // Absolute hard cap: max 72 characters (strictly under Kahoot's 75 limit)
  return text.slice(0, 72);
}

/**
 * Generates questions using Google Gemini API
 */
async function generateQuestionsWithGemini(apiKey, { theme, count = 5, timeLimit = 20 }) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Chave de API Gemini não informada.');
  }

  const { easyCount, mediumCount, hardCount } = getDifficultyDistribution(count);

  const prompt = `Você é um especialista em educação e criação de quizzes para o Kahoot!.
Gere exatamente ${count} perguntas sobre o tema: "${theme}".
Idioma: Português (Brasil).

DISTRIBUIÇÃO RIGOROSA DE DIFICULDADE (Exatamente 1/3 por nível):
- ${easyCount} perguntas de nível Fácil ("Fácil")
- ${mediumCount} perguntas de nível Médio ("Médio")
- ${hardCount} perguntas de nível Difícil ("Difícil")

REGRAS E LIMITES CRUCIAIS DO KAHOOT! (OBRIGATÓRIO):
1. "question": O texto da pergunta DEVE TER ENTRE 40 E 95 CARACTERES (NUNCA ULTRAPASSE 110 CARACTERES. O limite do Kahoot é 120 caracteres e perguntas maiores são bloqueadas). NÃO coloque numeração como "1." no início da pergunta. Seja conciso e direto.
2. "answers": Cada alternativa DEVE TER NO MÁXIMO 65 CARACTERES (limite do Kahoot é 75).
3. MESCLA DE TIPOS DE PERGUNTAS (Múltipla Escolha e Verdadeiro/Falso):
   - A PRIMEIRA PERGUNTA (índice 0) DEVE SER OBRIGATORIAMENTE de Múltipla Escolha ("type": "quiz") com 4 alternativas!
   - Para as demais perguntas, mescle de forma equilibrada perguntas de Múltipla Escolha e de Verdadeiro/Falso.
   - Para perguntas de Múltipla Escolha: "type": "quiz", "answers" deve ter EXATAMENTE 4 opções criativas distintas, e "correctIndex" de 0 a 3.
   - Para perguntas de Verdadeiro ou Falso: "type": "true_false", "answers": ["Verdadeiro", "Falso"], e "correctIndex": 0 (se a afirmação for Verdadeira) ou 1 (se for Falsa).
4. "difficulty": Atribua "Fácil", "Médio" ou "Difícil" para cada item conforme a distribuição.
5. "time": ${timeLimit}.
6. ORDEM: Retorne as perguntas em ordem variada, mantendo SEMPRE a pergunta 1 (índice 0) como Múltipla Escolha ("quiz").

Retorne ESTRITAMENTE um array JSON puro, sem blocos de código markdown (\`\`\`json ou \`\`\`), sem nenhum texto antes ou depois. Exemplo exato:
[
  {
    "type": "quiz",
    "difficulty": "Fácil",
    "question": "Qual é a principal função do CSS em uma página web?",
    "answers": [
      "Definir a estrutura semântica",
      "Estilizar e formatar o visual",
      "Processar requisições no servidor",
      "Criar banco de dados relacional"
    ],
    "correctIndex": 1,
    "time": 20
  },
  {
    "type": "true_false",
    "difficulty": "Médio",
    "question": "Em Python, listas são estruturas de dados imutáveis.",
    "answers": [
      "Verdadeiro",
      "Falso"
    ],
    "correctIndex": 1,
    "time": 20
  }
]`;

  let rawResponse = '';
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      const res = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'CALL_GEMINI_API', apiKey, prompt }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Erro desconhecido na API Gemini'));
          }
        });
      });
      rawResponse = res;
    } catch (bgError) {
      rawResponse = await directGeminiFetch(apiKey, prompt);
    }
  } else {
    rawResponse = await directGeminiFetch(apiKey, prompt);
  }

  // Sanitize and parse JSON
  let cleaned = rawResponse.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  let questions = [];
  try {
    questions = JSON.parse(cleaned);
  } catch (parseError) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      questions = JSON.parse(match[0]);
    } else {
      throw new Error('A IA não retornou um formato JSON válido. Tente novamente.');
    }
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Nenhuma pergunta foi gerada pela IA.');
  }

  // Normalize, strictly enforce character constraints and shuffle
  const normalized = questions.slice(0, count).map((q, idx) => {
    const isTF = q.type === 'true_false' || (Array.isArray(q.answers) && q.answers.length === 2);
    const safeQuestion = sanitizeQuestionText(q.question, `Pergunta ${idx + 1} sobre ${theme}`);

    if (isTF) {
      const correct = (q.correctIndex === 1) ? 1 : 0;
      return {
        id: idx + 1,
        type: 'true_false',
        difficulty: q.difficulty || (idx % 3 === 0 ? 'Fácil' : idx % 3 === 1 ? 'Médio' : 'Difícil'),
        question: safeQuestion,
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: correct,
        time: q.time || timeLimit
      };
    } else {
      let answers = Array.isArray(q.answers) ? q.answers.slice(0, 4) : [];
      while (answers.length < 4) {
        answers.push(`Alternativa ${answers.length + 1}`);
      }
      const safeAnswers = answers.map(a => sanitizeAnswerText(a, 'Opção'));
      const correct = (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3)
        ? q.correctIndex
        : 0;

      return {
        id: idx + 1,
        type: 'quiz',
        difficulty: q.difficulty || (idx % 3 === 0 ? 'Fácil' : idx % 3 === 1 ? 'Médio' : 'Difícil'),
        question: safeQuestion,
        answers: safeAnswers,
        correctIndex: correct,
        time: q.time || timeLimit
      };
    }
  });

  return ensureFirstQuestionIsQuiz(shuffleArray(normalized));
}

async function directGeminiFetch(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro HTTP ${response.status} na API Gemini`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Smart Offline Question Generator (Runs without API key)
 */
function generateQuestionsLocal({ theme, count = 5, timeLimit = 20 }) {
  const { easyCount, mediumCount, hardCount } = getDifficultyDistribution(count);
  const normalizedTheme = theme.toLowerCase().trim();

  const bank = getCategorizedThematicBank(normalizedTheme, theme);

  const easyPool = bank.filter(q => q.difficulty === 'Fácil');
  const mediumPool = bank.filter(q => q.difficulty === 'Médio');
  const hardPool = bank.filter(q => q.difficulty === 'Difícil');

  const selected = [];

  // Pick exact 1/3 for each difficulty
  selected.push(...pickOrGenerate(easyPool, easyCount, 'Fácil', theme, timeLimit));
  selected.push(...pickOrGenerate(mediumPool, mediumCount, 'Médio', theme, timeLimit));
  selected.push(...pickOrGenerate(hardPool, hardCount, 'Difícil', theme, timeLimit));

  // Normalize strict character limits and types
  const finalQuestions = selected.map((q, idx) => {
    const isTF = q.type === 'true_false' || q.answers.length === 2;
    const safeQ = sanitizeQuestionText(q.question, `Pergunta ${idx + 1}`);

    if (isTF) {
      return {
        id: idx + 1,
        type: 'true_false',
        difficulty: q.difficulty,
        question: safeQ,
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: q.correctIndex === 1 ? 1 : 0,
        time: timeLimit
      };
    } else {
      let ans = q.answers.slice(0, 4);
      while (ans.length < 4) ans.push(`Opção ${ans.length + 1}`);
      return {
        id: idx + 1,
        type: 'quiz',
        difficulty: q.difficulty,
        question: safeQ,
        answers: ans.map(a => sanitizeAnswerText(a)),
        correctIndex: q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0,
        time: timeLimit
      };
    }
  });

  return ensureFirstQuestionIsQuiz(shuffleArray(finalQuestions));
}

function pickOrGenerate(pool, needed, difficulty, theme, timeLimit) {
  const shuffled = shuffleArray(pool);
  const result = [];

  for (let i = 0; i < needed; i++) {
    if (i < shuffled.length) {
      result.push({ ...shuffled[i], time: timeLimit });
    } else {
      const isTF = (i % 2 === 1);
      result.push(createThemedDynamicQuestion(theme, difficulty, isTF, timeLimit));
    }
  }

  return result;
}

function createThemedDynamicQuestion(theme, difficulty, isTrueFalse, timeLimit) {
  if (isTrueFalse) {
    const tfTemplates = {
      'Fácil': [
        { q: `O estudo de ${theme} é amplamente aplicado no mercado atual.`, correct: 0 },
        { q: `${theme} é uma área que proíbe o uso de tecnologia digital.`, correct: 1 }
      ],
      'Médio': [
        { q: `Em ${theme}, métricas e análise de dados devem nortear decisões.`, correct: 0 },
        { q: `Boas práticas em ${theme} dispensam planejamento prévio de metas.`, correct: 1 }
      ],
      'Difícil': [
        { q: `A parametrização estratégica em ${theme} reduz a taxa de retrabalho.`, correct: 0 },
        { q: `Processos de automação em ${theme} operam sempre sem supervisão.`, correct: 1 }
      ]
    };
    const list = tfTemplates[difficulty] || tfTemplates['Médio'];
    const pick = list[Math.floor(Math.random() * list.length)];
    return {
      type: 'true_false',
      difficulty: difficulty,
      question: sanitizeQuestionText(pick.q),
      answers: ['Verdadeiro', 'Falso'],
      correctIndex: pick.correct,
      time: timeLimit
    };
  } else {
    const quizTemplates = {
      'Fácil': {
        q: `Qual é o objetivo inicial ao começar a estudar ${theme}?`,
        a: [
          `Compreender conceitos fundamentais e básicos`,
          `Executar projetos complexos sem nenhum treino`,
          `Eliminar a comunicação entre as equipes`,
          `Decorar manuais sem entender o propósito`
        ],
        c: 0
      },
      'Médio': {
        q: `Qual prática assegura maior assertividade em ${theme}?`,
        a: [
          `Ignorar histórico de dados e agir por impulso`,
          `Testes contínuos com monitoramento de métricas`,
          `Copiar modelos prontos sem nenhuma adaptação`,
          `Evitar capacitação técnica dos integrantes`
        ],
        c: 1
      },
      'Difícil': {
        q: `Qual desafio analítico costuma ser mais crítico em ${theme}?`,
        a: [
          `Falta de ferramentas de digitação rápida`,
          `Custo de energia elétrica residencial`,
          `Integração de fluxos com redução de viés`,
          `Uso excessivo de planilhas impressas`
        ],
        c: 2
      }
    };
    const pick = quizTemplates[difficulty] || quizTemplates['Médio'];
    return {
      type: 'quiz',
      difficulty: difficulty,
      question: sanitizeQuestionText(pick.q),
      answers: pick.a.map(a => sanitizeAnswerText(a)),
      correctIndex: pick.c,
      time: timeLimit
    };
  }
}

function getCategorizedThematicBank(norm, rawTheme) {
  // Python & Programação
  if (norm.includes('python') || norm.includes('programaç') || norm.includes('codigo') || norm.includes('dev')) {
    return [
      // FÁCIL
      {
        type: 'quiz',
        difficulty: 'Fácil',
        question: 'Qual comando em Python exibe dados diretamente na tela?',
        answers: ['print()', 'echo()', 'console.log()', 'system.out()'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'Em Python, o comando print("Olá") exibe mensagem no terminal.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'Python é uma linguagem compilada que não suporta scripts.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      },
      // MÉDIO
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'Qual palavra-chave é usada para definir uma função em Python?',
        answers: ['function', 'def', 'fn', 'define'],
        correctIndex: 1
      },
      {
        type: 'true_false',
        difficulty: 'Médio',
        question: 'Em Python, listas são mutáveis e tuplas são imutáveis.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'Qual operador verifica a igualdade de valores em Python?',
        answers: ['=', '!=', '==', '==='],
        correctIndex: 2
      },
      // DIFÍCIL
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'O GIL no CPython permite paralelismo puro em CPU threads.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      },
      {
        type: 'quiz',
        difficulty: 'Difícil',
        question: 'Qual método representa a representação oficial de objeto?',
        answers: ['__str__', '__init__', '__new__', '__repr__'],
        correctIndex: 3
      },
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'Generators em Python produzem valores sob demanda (lazy).',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      }
    ];
  }

  // Marketing Digital
  if (norm.includes('market') || norm.includes('mkt') || norm.includes('vendas') || norm.includes('lead')) {
    return [
      // FÁCIL
      {
        type: 'quiz',
        difficulty: 'Fácil',
        question: 'No Marketing Digital, o que representa a sigla ROI?',
        answers: ['Retorno sobre o Investimento', 'Rede de Operações na Internet', 'Resultado Operacional Indireto', 'Risco Operacional Inicial'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'Um "Lead" representa contato qualificado com potencial de compra.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'No marketing digital, o envio de spam é recomendado.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      },
      // MÉDIO
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'Qual métrica avalia visitantes que convertem em um site?',
        answers: ['Bounce Rate', 'Taxa de Conversão (CR)', 'Impressões Brutas', 'Alcance Médio'],
        correctIndex: 1
      },
      {
        type: 'true_false',
        difficulty: 'Médio',
        question: 'Inbound Marketing foca em atrair clientes com conteúdo útil.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'O que mede o Custo por Clique (CPC) em campanhas pagas?',
        answers: ['Valor por visualização', 'Valor pago por cada clique no anúncio', 'Total de vendas', 'Velocidade da página'],
        correctIndex: 1
      },
      // DIFÍCIL
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'O modelo First Click credita a conversão ao último canal.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      },
      {
        type: 'quiz',
        difficulty: 'Difícil',
        question: 'Qual cálculo representa relação entre LTV e CAC saudável?',
        answers: ['LTV menor que o CAC', 'LTV igual a metade do CAC', 'LTV ao menos 3x maior que CAC', 'CAC 5x maior que LTV'],
        correctIndex: 2
      },
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'O pixel de rastreamento mensura eventos via Conversions API.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      }
    ];
  }

  // Excel & Planilhas
  if (norm.includes('excel') || norm.includes('planilha') || norm.includes('dados') || norm.includes('procv')) {
    return [
      // FÁCIL
      {
        type: 'quiz',
        difficulty: 'Fácil',
        question: 'Qual caractere inicia qualquer fórmula no Microsoft Excel?',
        answers: ['=', '+', '@', '#'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'A função SOMA() no Excel soma valores do intervalo selecionado.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'No Excel, é proibido usar mais de uma planilha no arquivo.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      },
      // MÉDIO
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'Qual função pesquisa valores na primeira coluna de uma tabela?',
        answers: ['PROCX', 'PROCV', 'INDIRETO', 'SEERRO'],
        correctIndex: 1
      },
      {
        type: 'true_false',
        difficulty: 'Médio',
        question: 'O símbolo de cifrão ($) no Excel serve para travar referências.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'O que o erro "#DIV/0!" indica em uma fórmula do Excel?',
        answers: ['Valor de texto inválido', 'Nome de função errado', 'Tentativa de divisão por zero', 'Coluna estreita'],
        correctIndex: 2
      },
      // DIFÍCIL
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'A combinação ÍNDICE e CORRESP substitui com flexibilidade o PROCV.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'quiz',
        difficulty: 'Difícil',
        question: 'Qual função do Excel calcula médias condicionais complexas?',
        answers: ['CONT.SE', 'SOMA', 'SOMASE', 'MÉDIASES'],
        correctIndex: 3
      },
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'Funções matriciais dinâmicas não expandem em células vizinhas.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      }
    ];
  }

  // Inteligência Artificial
  if (norm.includes('ia') || norm.includes('inteligência') || norm.includes('artificial') || norm.includes('prompt')) {
    return [
      // FÁCIL
      {
        type: 'quiz',
        difficulty: 'Fácil',
        question: 'O que é um "Prompt" em ferramentas de IA Generativa?',
        answers: ['O comando ou instrução dado à IA', 'O hardware onde o modelo roda', 'O formato do arquivo', 'O antivírus'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'Modelos como Gemini e ChatGPT geram respostas em texto.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'true_false',
        difficulty: 'Fácil',
        question: 'A IA generativa só consegue responder com números inteiros.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      },
      // MÉDIO
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'O que significa a sigla LLM no contexto de IA?',
        answers: ['Low Latency Machine', 'Large Language Model', 'Linear Logic Model', 'Linked Learning Mode'],
        correctIndex: 1
      },
      {
        type: 'true_false',
        difficulty: 'Médio',
        question: 'Alucinação em IA ocorre quando o modelo gera respostas falsas.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'quiz',
        difficulty: 'Médio',
        question: 'Qual técnica formula instruções assertivas para guiar a IA?',
        answers: ['Compilação de Código', 'Engenharia de Prompt', 'Desfragmentação', 'Overclocking'],
        correctIndex: 1
      },
      // DIFÍCIL
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'O mecanismo Attention foi introduzido no artigo Attention Is All You Need.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 0
      },
      {
        type: 'quiz',
        difficulty: 'Difícil',
        question: 'O que a técnica RAG faz em modelos de linguagem?',
        answers: ['Comprime o tamanho do peso neural', 'Apaga a base de treino', 'Consulta bases externas antes de responder', 'Aumenta consumo de bateria'],
        correctIndex: 2
      },
      {
        type: 'true_false',
        difficulty: 'Difícil',
        question: 'Fine-tuning e RAG são conceitos exatamente idênticos em IA.',
        answers: ['Verdadeiro', 'Falso'],
        correctIndex: 1
      }
    ];
  }

  // Default Bank (Geral / Qualquer Tema)
  return [
    // FÁCIL
    {
      type: 'quiz',
      difficulty: 'Fácil',
      question: `Qual é o objetivo principal ao iniciar estudos em ${rawTheme}?`,
      answers: [
        `Dominar fundamentos essenciais com prática`,
        `Realizar operações complexas sem treino`,
        `Evitar contato com materiais de estudo`,
        `Trabalhar sem nenhum método ou plano`
      ],
      correctIndex: 0
    },
    {
      type: 'true_false',
      difficulty: 'Fácil',
      question: `Em ${rawTheme}, o planejamento é determinante para o sucesso.`,
      answers: ['Verdadeiro', 'Falso'],
      correctIndex: 0
    },
    {
      type: 'true_false',
      difficulty: 'Fácil',
      question: `É recomendado ignorar regras e boas práticas em ${rawTheme}.`,
      answers: ['Verdadeiro', 'Falso'],
      correctIndex: 1
    },
    // MÉDIO
    {
      type: 'quiz',
      difficulty: 'Médio',
      question: `Qual postura favorece a evolução técnica em ${rawTheme}?`,
      answers: [
        `Decidir exclusivamente por intuição`,
        `Acompanhar indicadores e resultados`,
        `Rejeitar novas ferramentas digitais`,
        `Copiar projetos sem avaliar contexto`
      ],
      correctIndex: 1
    },
    {
      type: 'true_false',
      difficulty: 'Médio',
      question: `A avaliação de processos em ${rawTheme} mitiga falhas operacionais.`,
      answers: ['Verdadeiro', 'Falso'],
      correctIndex: 0
    },
    {
      type: 'quiz',
      difficulty: 'Médio',
      question: `Qual é um erro comum de implementação em ${rawTheme}?`,
      answers: [
        `Capacitar a equipe constantemente`,
        `Definir metas claras e alcançáveis`,
        `Executar ações sem cronograma ou escopo`,
        `Realizar testes preliminares`
      ],
      correctIndex: 2
    },
    // DIFÍCIL
    {
      type: 'true_false',
      difficulty: 'Difícil',
      question: `A otimização em ${rawTheme} independe de calibração contínua.`,
      answers: ['Verdadeiro', 'Falso'],
      correctIndex: 1
    },
    {
      type: 'quiz',
      difficulty: 'Difícil',
      question: `Qual fator estratégico garante sustentabilidade em ${rawTheme}?`,
      answers: [
        `Redução drástica da qualidade`,
        `Abandono total de métricas`,
        `Isolamento das equipes técnicas`,
        `Governança sólida, automação e inovação`
      ],
      correctIndex: 3
    },
    {
      type: 'true_false',
      difficulty: 'Difícil',
      question: `Em cenários de ${rawTheme}, a padronização de dados eleva a precisão.`,
      answers: ['Verdadeiro', 'Falso'],
      correctIndex: 0
    }
  ];
}

/**
 * Export questions in Kahoot! bulk upload spreadsheet / CSV format
 */
function exportToKahootCSV(questions, theme = 'quiz') {
  let csv = 'Question - max 120 characters,Answer 1,Answer 2,Answer 3,Answer 4,Time limit (sec),Correct answer(s)\n';

  questions.forEach(q => {
    const isTF = q.type === 'true_false' || q.answers.length === 2;
    const cleanQ = sanitizeQuestionText(q.question).replace(/"/g, '""');
    const a1 = sanitizeAnswerText(q.answers[0] || 'Verdadeiro').replace(/"/g, '""');
    const a2 = sanitizeAnswerText(q.answers[1] || 'Falso').replace(/"/g, '""');
    const a3 = isTF ? '' : sanitizeAnswerText(q.answers[2] || '').replace(/"/g, '""');
    const a4 = isTF ? '' : sanitizeAnswerText(q.answers[3] || '').replace(/"/g, '""');
    const time = q.time || 20;
    const correctNum = (q.correctIndex !== undefined ? q.correctIndex + 1 : 1);

    csv += `"${cleanQ}","${a1}","${a2}","${a3}","${a4}",${time},${correctNum}\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTheme = theme.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'quiz';
  a.href = url;
  a.download = `kahoot_${safeTheme}_perguntas.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
