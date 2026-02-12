/**
 * HTML Sanitization Utility
 *
 * XSS攻撃対策のためのHTMLサニタイズ
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * HTMLをサニタイズ（XSS対策）
 */
export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * プレーンテキストのみ許可（タグ全削除）
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Markdown風のテキストをサニタイズ
 */
export const sanitizeMarkdown = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'align'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * URLをサニタイズ（JavaScriptプロトコル除去）
 */
export const sanitizeURL = (url: string): string => {
  const clean = DOMPurify.sanitize(url);

  // JavaScriptプロトコルをブロック
  if (clean.toLowerCase().startsWith('javascript:')) {
    return '';
  }

  return clean;
};
