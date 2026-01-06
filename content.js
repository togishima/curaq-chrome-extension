/**
 * Content Script for CuraQ Saver
 * Extracts article content and converts to Markdown
 */

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      // Clone the document to avoid modifying the original page
      const documentClone = document.cloneNode(true);

      // Use Mozilla's Readability to extract main content
      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (!article) {
        sendResponse({
          success: false,
          error: '記事コンテンツを抽出できませんでした'
        });
        return;
      }

      // Convert HTML to Markdown using Turndown
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*'
      });

      // Configure Turndown rules
      turndownService.addRule('strikethrough', {
        filter: ['del', 's', 'strike'],
        replacement: (content) => `~~${content}~~`
      });

      // Remove scripts, styles, and other unwanted elements
      turndownService.remove(['script', 'style', 'noscript', 'iframe']);

      const markdown = turndownService.turndown(article.content);

      // Send extracted content back to background script
      sendResponse({
        success: true,
        data: {
          title: article.title || document.title,
          url: window.location.href,
          markdown: markdown,
          textContent: article.textContent || '',
          excerpt: article.excerpt || '',
          byline: article.byline || '',
          siteName: article.siteName || ''
        }
      });
    } catch (error) {
      console.error('[CuraQ] Content extraction error:', error);
      sendResponse({
        success: false,
        error: error.message || '不明なエラーが発生しました'
      });
    }
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});
