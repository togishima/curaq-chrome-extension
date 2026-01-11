/**
 * Background Service Worker for CuraQ Saver
 * Handles context menu and API communication with token auth
 */

// CuraQ API endpoint
const CURAQ_API_URL = 'https://curaq.app/api/v1';
// For local development, uncomment:
// const CURAQ_API_URL = 'http://localhost:5173/api/v1';

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-curaq',
    title: 'CuraQに保存',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-curaq') {
    try {
      const url = tab.url;
      const title = tab.title || '';

      // Open /share page in new tab
      const shareUrl = `https://curaq.app/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
      chrome.tabs.create({ url: shareUrl });
    } catch (error) {
      console.error('[CuraQ] Context menu save error:', error);
      showNotification('エラー', '記事の保存に失敗しました');
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveArticle') {
    // Get the tab to save
    chrome.tabs.get(request.tabId, async (tab) => {
      const result = await saveArticleToCuraQ(tab);
      sendResponse(result);
    });
    return true;
  }


  // Token storage functions kept for future use
  if (request.action === 'saveToken') {
    chrome.storage.local.set({ apiToken: request.token }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'clearToken') {
    chrome.storage.local.remove('apiToken', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Get API token from storage
 */
async function getApiToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('apiToken', (result) => {
      resolve(result.apiToken || null);
    });
  });
}

/**
 * Check if token is valid by making a test request
 * Commented out for v1.0 - will be used in future Pro features
 */
// async function checkTokenValid() {
//   const token = await getApiToken();
//
//   if (!token) {
//     return { valid: false, error: 'no-token' };
//   }
//
//   try {
//     const response = await fetch(`${CURAQ_API_URL}/articles?limit=1`, {
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });
//
//     if (response.ok) {
//       return { valid: true };
//     } else if (response.status === 401) {
//       return { valid: false, error: 'invalid-token' };
//     } else if (response.status === 403) {
//       return { valid: false, error: 'no-pro-plan' };
//     } else {
//       return { valid: false, error: `api-error-${response.status}` };
//     }
//   } catch (error) {
//     console.error('[CuraQ] Token check failed:', error);
//     return { valid: false, error: 'network-error' };
//   }
// }

/**
 * Open CuraQ share page with current article URL and title
 */
async function saveArticleToCuraQ(tab) {
  try {
    const url = tab.url;
    const title = tab.title || '';

    // Open /share page in new tab
    const shareUrl = `https://curaq.app/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });
    
    return { success: true };

  } catch (error) {
    console.error('[CuraQ] Share page open error:', error);
    const errorMsg = error.message || '記事情報の取得に失敗しました';
    return { success: false, error: errorMsg };
  }
}


/**
 * Show notification to user
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: title,
    message: message,
    priority: 2,
    requireInteraction: true  // User must dismiss the notification
  });
}
