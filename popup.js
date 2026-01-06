/**
 * Popup Script for CuraQ Saver
 * Handles UI state and user interactions
 */

const CURAQ_URL = 'https://curaq.pages.dev';
// For local development:
// const CURAQ_URL = 'http://localhost:5173';

// UI elements
const loadingState = document.getElementById('loading-state');
const notLoggedInState = document.getElementById('not-logged-in-state');
const loggedInState = document.getElementById('logged-in-state');
const successState = document.getElementById('success-state');
const errorState = document.getElementById('error-state');

const loginButton = document.getElementById('login-button');
const saveButton = document.getElementById('save-button');
const saveButtonText = document.getElementById('save-button-text');
const saveSpinner = document.getElementById('save-spinner');
const viewDashboardButton = document.getElementById('view-dashboard-button');
const retryButton = document.getElementById('retry-button');
const errorMessage = document.getElementById('error-message');

// State management
function showState(state) {
  loadingState.classList.add('hidden');
  notLoggedInState.classList.add('hidden');
  loggedInState.classList.add('hidden');
  successState.classList.add('hidden');
  errorState.classList.add('hidden');

  switch (state) {
    case 'loading':
      loadingState.classList.remove('hidden');
      break;
    case 'not-logged-in':
      notLoggedInState.classList.remove('hidden');
      break;
    case 'logged-in':
      loggedInState.classList.remove('hidden');
      break;
    case 'success':
      successState.classList.remove('hidden');
      break;
    case 'error':
      errorState.classList.remove('hidden');
      break;
  }
}

// Check login status by attempting to fetch user settings
async function checkLoginStatus() {
  try {
    const response = await fetch(`${CURAQ_URL}/settings/api/settings`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    // If we get a 200 response, user is logged in
    return response.ok;
  } catch (error) {
    console.error('[CuraQ] Login check failed:', error);
    return false;
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

// Event listeners
loginButton.addEventListener('click', () => {
  chrome.tabs.create({ url: `${CURAQ_URL}/login` });
  window.close();
});

saveButton.addEventListener('click', () => {
  saveCurrentArticle();
});

viewDashboardButton.addEventListener('click', () => {
  chrome.tabs.create({ url: CURAQ_URL });
  window.close();
});

retryButton.addEventListener('click', () => {
  showState('logged-in');
});

// Initialize popup
async function init() {
  showState('loading');

  const isLoggedIn = await checkLoginStatus();

  if (isLoggedIn) {
    showState('logged-in');
  } else {
    showState('not-logged-in');
  }
}

// Start initialization
init();
