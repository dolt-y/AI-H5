// markdown.ts
import MarkdownIt from 'markdown-it';
// import emojiPlugin from 'markdown-it-emoji';
// import taskLists from 'markdown-it-task-lists';
// import linkAttrs from 'markdown-it-link-attributes';
import hljs from 'highlight.js';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

// 直接使用插件函数，不加 .default
// md.use(emojiPlugin);
// md.use(taskLists, { enabled: true });
// md.use(linkAttrs, { attrs: { target: '_blank', rel: 'noopener' } });

export function renderMarkdown(text: string): string {
  if (!text) return '';
  return md.render(text);
}
