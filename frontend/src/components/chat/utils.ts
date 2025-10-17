export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const renderMessageHtml = (s: string) => {
  const escaped = escapeHtml(s);
  // Strip any escaped <card>...</card> blocks if they slip through
  const withoutEscapedCard = escaped.replace(/&lt;card&gt;[\s\S]*?&lt;\/card&gt;/gi, '');
  // Headings (#, ##, ###) at start of lines
  // Render all heading levels identically with tighter line-height and no margins
  const withH3 = withoutEscapedCard.replace(/^###\s+(.+)$/gm, '<div class="font-semibold leading-tight">$1<\/div>');
  const withH2 = withH3.replace(/^##\s+(.+)$/gm, '<div class="font-semibold leading-tight">$1<\/div>');
  const withH1 = withH2.replace(/^#\s+(.+)$/gm, '<div class="font-semibold leading-tight">$1<\/div>');
  // Bold **...**
  const withBold = withH1.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>');
  // Reduce excessive blank lines after headings: collapse 2+ newlines to 1
  const compact = withBold
    .replace(/(<div class=\"font-semibold leading-tight\">.*?<\/div>)\n{2,}/g, '$1\n')
    .replace(/\n{3,}/g, '\n\n');
  return compact;
};

export const extractCardContent = (text: string) => {
  const match = text.match(/<card>([\s\S]*?)<\/card>/i);
  if (!match) return { cleaned: text, card: null as string | null };
  const cleaned = text.replace(/<card>[\s\S]*?<\/card>/i, '').trim();
  return { cleaned, card: match[1].trim() };
};
