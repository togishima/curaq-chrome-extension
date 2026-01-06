/**
 * Popup Script for CuraQ Saver
 * Handles UI state and user interactions with token-based auth
 */

const CURAQ_URL = 'https://curaq.pages.dev';

// UI elements
const loadingState = document.getElementById('loading-state');
const noTokenState = document.getElementById('no-token-state');
const invalidTokenState = document.getElementById('invalid-token-state');
const noProState = document.getElementById('no-pro-state');
const readyState = document.getElementById('ready-state');
const successState = document.getElementById('success-state');
const errorState = document.getElementById('error-state');
const settingsState = document.getElementById('settings-state');

const settingsToggle = document.getElementById('settings-toggle');
const tokenInput = document.getElementById('token-input');
const tokenInputRetry = document.getElementById('token-input-retry');
const saveTokenButton = document.getElementById('save-token-button');
const saveTokenRetryButton = document.getElementById('save-token-retry-button');
const saveButton = document.getElementById('save-button');
const saveButtonText = document.getElementById('save-button-text');
const saveSpinner = document.getElementById('save-spinner');
const viewDashboardButton = document.getElementById('view-dashboard-button');
const retryButton = document.getElementById('retry-button');
const errorMessage = document.getElementById('error-message');
const backButton = document.getElementById('back-button');
const clearTokenButton = document.getElementById('clear-token-button');

// Track previous state for settings back button
let previousState = 'ready';

// All states
const allStates = [
  loadingState,
  noTokenState,
  invalidTokenState,
  noProState,
  readyState,
  successState,
  errorState,
  settingsState
];

// State management
function showState(state) {
  allStates.forEach(s => s.classList.add('hidden'));

  switch (state) {
    case 'loading':
      loadingState.classList.remove('hidden');
      break;
    case 'no-token':
      noTokenState.classList.remove('hidden');
      break;
    case 'invalid-token':
      invalidTokenState.classList.remove('hidden');
      break;
    case 'no-pro':
      noProState.classList.remove('hidden');
      break;
    case 'ready':
      readyState.classList.remove('hidden');
      break;
    case 'success':
      successState.classList.remove('hidden');
      break;
    case 'error':
      errorState.classList.remove('hidden');
      break;
    case 'settings':
      settingsState.classList.remove('hidden');
      break;
  }
}

// Check token status
async function checkTokenStatus() {
  showState('loading');

  const response = await chrome.runtime.sendMessage({ action: 'checkToken' });

  if (response.valid) {
    previousState = 'ready';
    showState('ready');
  } else if (response.error === 'no-token') {
    previousState = 'no-token';
    showState('no-token');
  } else if (response.error === 'invalid-token') {
    previousState = 'invalid-token';
    showState('invalid-token');
  } else if (response.error === 'no-pro-plan') {
    previousState = 'no-pro';
    showState('no-pro');
  } else {
    // Network error or other issues - show error state
    previousState = 'no-token';
    errorMessage.textContent = 'サーバーに接続できませんでした';
    showState('error');
  }
}

// Save token
async function saveToken(token) {
  if (!token || token.trim().length === 0) {
    return;
  }

  showState('loading');

  // Save token first
  await chrome.runtime.sendMessage({ action: 'saveToken', token: token.trim() });

  // Verify it works
  const response = await chrome.runtime.sendMessage({ action: 'checkToken' });

  if (response.valid) {
    previousState = 'ready';
    showState('ready');
  } else if (response.error === 'no-pro-plan') {
    previousState = 'no-pro';
    showState('no-pro');
  } else {
    // Token invalid - clear it and show error
    await chrome.runtime.sendMessage({ action: 'clearToken' });
    previousState = 'invalid-token';
    showState('invalid-token');
  }
}

// Save current article
async function saveCurrentArticle() {
  try {
    // Disable button and show spinner
    saveButton.disabled = true;
    saveButtonText.textContent = '保存中...';
    saveSpinner.classList.remove('hidden');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to background script to save article
    const response = await chrome.runtime.sendMessage({
      action: 'saveArticle',
      tabId: tab.id
    });

    if (response.success) {
      showState('success');
    } else {
      errorMessage.textContent = response.error || '保存に失敗しました';
      showState('error');
    }
  } catch (error) {
    console.error('[CuraQ] Save error:', error);
    errorMessage.textContent = error.message || '保存に失敗しました';
    showState('error');
  } finally {
    // Re-enable button
    saveButton.disabled = false;
    saveButtonText.textContent = 'この記事を保存';
    saveSpinner.classList.add('hidden');
  }
}

// Clear token
async function clearToken() {
  await chrome.runtime.sendMessage({ action: 'clearToken' });
  previousState = 'no-token';
  showState('no-token');
}

// Event listeners
saveTokenButton.addEventListener('click', () => {
  saveToken(tokenInput.value);
});

saveTokenRetryButton.addEventListener('click', () => {
  saveToken(tokenInputRetry.value);
});

// Allow Enter key to save token
tokenInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveToken(tokenInput.value);
  }
});

tokenInputRetry.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveToken(tokenInputRetry.value);
  }
});

saveButton.addEventListener('click', () => {
  saveCurrentArticle();
});

viewDashboardButton.addEventListener('click', () => {
  chrome.tabs.create({ url: CURAQ_URL });
  window.close();
});

retryButton.addEventListener('click', () => {
  showState('ready');
});

settingsToggle.addEventListener('click', () => {
  if (!settingsState.classList.contains('hidden')) {
    // Already in settings, go back
    showState(previousState);
  } else {
    // Show settings
    showState('settings');
  }
});

backButton.addEventListener('click', () => {
  showState(previousState);
});

clearTokenButton.addEventListener('click', () => {
  clearToken();
});

// Initialize popup
checkTokenStatus();
