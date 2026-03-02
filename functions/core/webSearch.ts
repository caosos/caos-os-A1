import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RUNTIME_AUTHORITY } from './runtimeAuthority.js';

async function performWebSearch(base44, query, limit = 5) {
  // Use LLM with web search context instead of external API
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Perform a web search for: "${query}"\n\nReturn results as JSON array with fields: title, url, snippet, published. Return ONLY valid JSON, no markdown or prose.`,
    add_context_from_internet: true
  });

  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}

function structureResults(rawResults) {
  return (Array.isArray(rawResults) ? rawResults : []).map(item => ({
    title: item.title || item.name || '',
    url: item.url || '',
    snippet: item.snippet || item.description || '',
    published: item.published || item.datePublished || null
  })).filter(r => r.url);
}

async function computeHash(payload) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
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
    const { query, limit = 5 } = body;

    if (!query || query.trim() === '') {
      return Response.json({ error: 'Query required' }, { status: 400 });
    }

    const rawResults = await performBingSearch(query, Math.min(limit, 10));
    const structuredResults = structureResults(rawResults);
    const payload = {
      tool_name: 'web.search',
      tool_version: 'WEB_v1_2026-03-02',
      source: RUNTIME_AUTHORITY.capabilities.web_search.provider,
      results: structuredResults
    };

    const hash = await computeHash(structuredResults);

    return Response.json({
      ...payload,
      hash: `sha256:${hash}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});