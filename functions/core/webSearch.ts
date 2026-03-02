import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RUNTIME_AUTHORITY } from './runtimeAuthority.js';

async function performBingSearch(query, limit = 5) {
  const bingApiKey = Deno.env.get('BING_SEARCH_API_KEY');
  if (!bingApiKey) {
    throw new Error('BING_SEARCH_API_KEY not configured');
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}&count=${limit}`;

  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': bingApiKey },
    signal: AbortSignal.timeout(RUNTIME_AUTHORITY.safeguards.max_request_timeout_ms)
  });

  if (!response.ok) {
    throw new Error(`Bing API error: ${response.status}`);
  }

  const data = await response.json();
  return data.webPages?.value || [];
}

function structureResults(rawResults) {
  return rawResults.map(item => ({
    title: item.name,
    url: item.url,
    snippet: item.snippet,
    published: item.datePublished || null
  }));
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