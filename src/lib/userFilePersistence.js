/**
 * userFilePersistence.js
 * Shared canonical helper for persisting all user and AI assets to UserFile storage.
 * All thread-scoped saves go through this module — no inline duplication allowed.
 *
 * THREAD FOLDER CONTRACT:
 *   - if conversationId is known → /Conversations/<conversationId>
 *   - if conversationId is not yet known → caller must re-call with real ID after thread creation
 */

import { base44 } from '@/api/base44Client';

const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
const FILE_EXTS  = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv|mp3|mp4|mov|avi)$/i;

/**
 * Classify a URL or mime type into UserFile type: 'photo' | 'file' | 'link'
 */
export function classifyAsset(url, mimeType) {
  if (mimeType?.startsWith('image/')) return 'photo';
  const pathPart = (url || '').split('?')[0];
  if (IMAGE_EXTS.test(pathPart)) return 'photo';
  if (FILE_EXTS.test(pathPart)) return 'file';
  // If it has a file-like path but no known extension, treat as file
  const lastSegment = pathPart.split('/').pop() || '';
  if (lastSegment.includes('.')) return 'file';
  return 'link';
}

/**
 * Resolve the thread folder path.
 * Always returns /Conversations/<conversationId> when a conversationId is provided.
 */
export function threadFolderPath(conversationId) {
  if (!conversationId) return null; // signals "not ready — hold for finalization"
  return `/Conversations/${conversationId}`;
}

/**
 * Upsert a single asset into UserFile storage.
 * Dedupes on (created_by + url + folder_path). Will not create duplicates on retry.
 *
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} opts.name
 * @param {string} [opts.type]      - 'photo' | 'file' | 'link' — auto-classified if omitted
 * @param {string} [opts.mimeType]
 * @param {number} [opts.size]
 * @param {string} opts.conversationId
 * @param {string} opts.userEmail
 */
export async function persistAsset({ url, name, type, mimeType, size, conversationId, userEmail }) {
  if (!url) return;

  const folder = threadFolderPath(conversationId);
  if (!folder) return; // no conversationId yet — caller must retry after thread creation

  const resolvedType = type || classifyAsset(url, mimeType);
  const resolvedName = name || url.split('/').pop() || url;

  try {
    // Dedupe: only run filter if userEmail is available (skipped for hook-direct uploads)
    if (userEmail) {
      const existing = await base44.entities.UserFile.filter(
        { created_by: userEmail, url, folder_path: folder },
        '-created_date', 1
      );
      if (existing.length > 0) return; // already persisted — skip
    }

    await base44.entities.UserFile.create({
      name: resolvedName,
      url,
      type: resolvedType,
      folder_path: folder,
      mime_type: mimeType || '',
      ...(size ? { size } : {}),
    });
  } catch (e) {
    console.warn('[USER_FILE_PERSISTENCE] Failed to persist asset:', e.message);
  }
}

/**
 * Persist an array of file URLs sent by the user (from fileUrls payload).
 */
export async function persistUserFileUrls({ fileUrls, conversationId, userEmail }) {
  if (!fileUrls?.length || !conversationId) return;
  for (const url of fileUrls) {
    const type = classifyAsset(url);
    await persistAsset({ url, type, conversationId, userEmail });
  }
}

/**
 * Persist AI-generated files from the generatedFiles array in the response payload.
 */
export async function persistGeneratedFiles({ generatedFiles, conversationId, userEmail }) {
  if (!generatedFiles?.length || !conversationId) return;
  for (const gf of generatedFiles) {
    if (!gf.url) continue;
    const type = classifyAsset(gf.url, gf.type);
    await persistAsset({
      url: gf.url,
      name: gf.name || gf.url.split('/').pop() || 'generated',
      type,
      mimeType: gf.type || '',
      conversationId,
      userEmail,
    });
  }
}

/**
 * Extract and persist explicit links/files/images from text.
 * Only matches markdown links [text](url) and bare URLs on their own line.
 * Does NOT scrape prose-embedded links.
 */
export async function persistExplicitLinksFromText({ text, conversationId, userEmail }) {
  if (!text || !conversationId) return;

  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const bareLineUrlRegex  = /^(https?:\/\/[^\s]+)$/gm;

  const toSave = [];
  let m;
  while ((m = markdownLinkRegex.exec(text)) !== null) {
    toSave.push({ url: m[2].replace(/[.,;:!?]+$/, ''), label: m[1] });
  }
  while ((m = bareLineUrlRegex.exec(text)) !== null) {
    toSave.push({ url: m[1].replace(/[.,;:!?]+$/, ''), label: null });
  }

  for (const { url, label } of toSave) {
    const type = classifyAsset(url);
    const name = label || (() => {
      try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
    })();
    await persistAsset({ url, name, type, conversationId, userEmail });
  }
}