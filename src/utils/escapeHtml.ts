/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Converts: & < > " ' to their HTML entity equivalents.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for HTML insertion
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Client-side escapeHtml function as a string for inline scripts.
 * Use this when you need the function available in client-side code.
 */
export const escapeHtmlClientScript = `
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return '';
  }
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, function(char) {
    return htmlEscapes[char] || char;
  });
}
`;
