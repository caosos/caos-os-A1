import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RUNTIME_AUTHORITY } from './runtimeAuthority.js';

const MAX_ARTIFACT_BYTES = 5242880; // 5 MB per artifact
const MAX_TOTAL_BYTES = 10485760; // 10 MB total per request

async function fetchArtifactContent(artifact) {
  const { storage } = artifact;

  if (storage.type === 'base44_file') {
    // Fetch from Base44 file storage
    const response = await fetch(`https://api.base44.io/files/${storage.ref}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Failed to fetch base44_file: ${storage.ref}`);
    return await response.arrayBuffer();
  }

  if (storage.type === 'url') {
    // Fetch from URL with allowlist check
    const url = new URL(storage.ref);
    const allowedDomains = ['imgur.com', 'github.com', 'gist.github.com']; // Example allowlist
    if (!allowedDomains.some(domain => url.hostname.includes(domain))) {
      throw new Error(`Domain not allowlisted: ${url.hostname}`);
    }
    const response = await fetch(storage.ref, {
      signal: AbortSignal.timeout(RUNTIME_AUTHORITY.safeguards.max_request_timeout_ms)
    });
    if (!response.ok) throw new Error(`Failed to fetch URL: ${storage.ref}`);
    return await response.arrayBuffer();
  }

  if (storage.type === 'inline_base64') {
    // Decode inline base64
    const binaryString = atob(storage.ref);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  throw new Error(`Unknown storage type: ${storage.type}`);
}

function extractTextContent(buffer, mimeType, limit = 200000) {
  if (!mimeType.startsWith('text/') && mimeType !== 'application/json') {
    return null; // Binary file, cannot extract text
  }

  const decoder = new TextDecoder();
  const text = decoder.decode(buffer);
  return text.substring(0, limit);
}

async function computeHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { artifacts = [] } = body;

    if (!Array.isArray(artifacts) || artifacts.length === 0) {
      return Response.json({
        artifacts_received: false,
        receipt: { event: 'ARTIFACTS_RECEIVED', count: 0 }
      });
    }

    const processed = [];
    let totalBytes = 0;

    for (const artifact of artifacts) {
      try {
        const content = await fetchArtifactContent(artifact);
        totalBytes += content.byteLength;

        if (content.byteLength > MAX_ARTIFACT_BYTES) {
          processed.push({
            id: artifact.id,
            status: 'error',
            reason: `Artifact exceeds ${MAX_ARTIFACT_BYTES} bytes`
          });
          continue;
        }

        if (totalBytes > MAX_TOTAL_BYTES) {
          processed.push({
            id: artifact.id,
            status: 'error',
            reason: 'Total request exceeds size limit'
          });
          continue;
        }

        const hash = await computeHash(content);
        let contentData = null;

        if (artifact.kind === 'file' && artifact.mime.startsWith('text/')) {
          contentData = extractTextContent(content, artifact.mime);
        }

        processed.push({
          id: artifact.id,
          status: 'loaded',
          size_bytes: content.byteLength,
          hash: `sha256:${hash}`,
          text_extracted: contentData !== null,
          text_preview: contentData ? contentData.substring(0, 500) : null
        });
      } catch (e) {
        processed.push({
          id: artifact.id,
          status: 'error',
          reason: e.message
        });
      }
    }

    return Response.json({
      artifacts_received: true,
      receipt: {
        event: 'ARTIFACTS_RECEIVED',
        timestamp: new Date().toISOString(),
        count: artifacts.length,
        processed
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});