import { ENV } from './_core/env';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

function isLocalMode(): boolean {
  return !ENV.forgeApiKey || ENV.forgeApiKey === 'your-gemini-api-key-here';
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Local Storage ─────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (isLocalMode()) {
    const filePath = path.join(UPLOADS_DIR, relKey);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, data as any);
    const url = `/uploads/${relKey}`;
    return { key: relKey, url };
  }

  // Remote proxy (Manus / production)
  const baseUrl = ENV.forgeApiUrl!;
  const apiKey = ENV.forgeApiKey!;
  const key = relKey.replace(/^\/+/, '');
  const uploadUrl = new URL('v1/storage/upload', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  uploadUrl.searchParams.set('path', key);

  const blob = typeof data === 'string'
    ? new Blob([data], { type: _contentType })
    : new Blob([data as any], { type: _contentType });
  const form = new FormData();
  form.append('file', blob, key.split('/').pop() ?? key);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status} ${response.statusText}): ${message}`);
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (isLocalMode()) {
    return { key: relKey, url: `/uploads/${relKey}` };
  }

  const baseUrl = ENV.forgeApiUrl!;
  const apiKey = ENV.forgeApiKey!;
  const key = relKey.replace(/^\/+/, '');
  const downloadApiUrl = new URL('v1/storage/downloadUrl', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  downloadApiUrl.searchParams.set('path', key);
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return { key, url: (await response.json()).url };
}
