// background.js - Service Worker for Kahoot! AI Creator
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Kahoot! AI Creator] Extensão instalada com sucesso!');
  // Initialize default options in storage if not present
  chrome.storage.local.get(['geminiApiKey', 'defaultQuestionsCount', 'defaultTimeLimit'], (data) => {
    if (!data.defaultQuestionsCount) {
      chrome.storage.local.set({ defaultQuestionsCount: 5 });
    }
    if (!data.defaultTimeLimit) {
      chrome.storage.local.set({ defaultTimeLimit: 20 });
    }
  });
});

// Relay messages or handle AI generation if called via background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CALL_GEMINI_API') {
    callGeminiAPI(message.apiKey, message.prompt)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.action === 'CHECK_KAHOOT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      const isKahoot = activeTab && activeTab.url && activeTab.url.includes('create.kahoot.it');
      sendResponse({ isKahoot, url: activeTab ? activeTab.url : null, tabId: activeTab ? activeTab.id : null });
    });
    return true;
  }
});

async function callGeminiAPI(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2500
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro na API Gemini (${response.status})`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return rawText;
}

