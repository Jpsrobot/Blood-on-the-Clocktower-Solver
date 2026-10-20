import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { APP_NAME, APP_ICON_URL } from './branding';
// Apply the same Japanese branding to the browser tab and installed web app.
document.title = APP_NAME;
document.documentElement.lang = 'ja';

function brandingLink(rel: string, href: string, type?: string): void {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  const link = existing ?? document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (type) link.type = type;
  if (!existing) document.head.appendChild(link);
}

function brandingMeta(name: string, content: string): void {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const meta = existing ?? document.createElement('meta');
  meta.name = name;
  meta.content = content;
  if (!existing) document.head.appendChild(meta);
}

brandingLink('icon', APP_ICON_URL, 'image/png');
brandingLink('apple-touch-icon', new URL('apple-touch-icon.png', document.baseURI).href, 'image/png');
brandingLink('manifest', new URL('manifest.webmanifest', document.baseURI).href);
brandingMeta('application-name', APP_NAME);
brandingMeta('apple-mobile-web-app-title', APP_NAME);

const root = document.getElementById('root');

if (!root) throw new Error('ルート要素が見つかりません');
createRoot(root).render(<StrictMode><App /></StrictMode>);
