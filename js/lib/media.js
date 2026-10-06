import { esc } from './html.js';

// Rendu d'un emplacement média (objet de data.js) en HTML. Aucun accès DOM.

export function renderMedia(media, opts = {}) {
  if (!media || (media.type !== 'image' && media.type !== 'svg') || !media.src) return '';
  const load = opts.eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const a = [
    `src="${esc(media.src)}"`,
    `alt="${esc(media.alt ?? '')}"`,
    load,
    'decoding="async"',
  ];
  if (media.width != null) a.push(`width="${esc(media.width)}"`);
  if (media.height != null) a.push(`height="${esc(media.height)}"`);
  if (media.srcset) a.push(`srcset="${esc(media.srcset)}"`);
  if (media.sizes) a.push(`sizes="${esc(media.sizes)}"`);
  if (media.type === 'svg') a.push('class="object-contain"');
  return `<img ${a.join(' ')}>`;
}
