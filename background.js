/**
 * Background Service Worker for CuraQ Saver
 * Handles context menu and API communication
 */

// CuraQ API endpoint (change to your production URL)
const CURAQ_API_URL = 'https://curaq.pages.dev/share';
// For local development, uncomment:
// const CURAQ_API_URL = 'http://localhost:5173/share';

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-curaq',
    title: 'CuraQに保存',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-curaq') {
    saveArticleToCuraQ(tab);
  }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  saveArticleToCuraQ(tab);
});

/**
 * Extract article content and save to CuraQ
 */
async function saveArticleToCuraQ(tab) {
  try {
    // Send message to content script to extract article
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractContent'
    });

    if (!response.success) {
      showNotification('エラー', response.error || '記事の抽出に失敗しました');
      return;
    }

    const { title, url, markdown } = response.data;

    // Send to CuraQ API
    const formData = new FormData();
    formData.append('url', url);
    formData.append('title', title);
    formData.append('markdown', markdown);

    const apiResponse = await fetch(CURAQ_API_URL, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include cookies for authentication
      redirect: 'manual' // Don't follow redirects (we'll handle them)
    });

    // Check if redirected (successful save redirects to /?saved=1)
    if (apiResponse.type === 'opaqueredirect' || apiResponse.status === 0) {
      showNotification('保存完了', `「${title}」をCuraQに保存しました`);
      return;
    }

    // Handle redirects
    if (apiResponse.status >= 300 && apiResponse.status < 400) {
      const redirectUrl = apiResponse.headers.get('Location') || '';

      if (redirectUrl.includes('saved=1')) {
        showNotification('保存完了', `「${title}」をCuraQに保存しました`);
      } else if (redirectUrl.includes('restored=1')) {
        showNotification('保存完了', `「${title}」を再登録しました`);
      } else if (redirectUrl.includes('already-read=1')) {
        showNotification('既読記事', 'この記事は既に読了済みです');
      } else if (redirectUrl.includes('error=limit-reached')) {
        showNotification('月間制限', '今月の記事保存上限に達しました');
      } else if (redirectUrl.includes('error=unread-limit')) {
        showNotification('未読上限', '未読記事が30件に達しています。記事を読んでから追加してください');
      } else if (redirectUrl.includes('error=')) {
        const errorParam = redirectUrl.match(/error=([^&]+)/)?.[1];
        showNotification('エラー', `保存に失敗しました: ${errorParam}`);
      } else {
        showNotification('保存完了', `「${title}」をCuraQに保存しました`);
      }
      return;
    }

    // If status is 200, it means we got the login page (not authenticated)
    if (apiResponse.status === 200) {
      const text = await apiResponse.text();
      if (text.includes('login') || text.includes('ログイン')) {
        showNotification('未ログイン', 'CuraQにログインしてください');
        chrome.tabs.create({ url: 'https://curaq.pages.dev/login' });
        return;
      }
    }

    // Other errors
    showNotification('エラー', `保存に失敗しました (${apiResponse.status})`);

  } catch (error) {
    console.error('[CuraQ] Save error:', error);
    showNotification('エラー', error.message || '記事の保存に失敗しました');
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
    priority: 2
  });
}
