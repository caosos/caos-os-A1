import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RUNTIME_AUTHORITY } from './runtimeAuthority.js';

const TIME_SENSITIVE_KEYWORDS = [
  'today', 'latest', 'current', 'news', 'price of', 'weather', 'stock', 'score',
  'release date', 'update', 'version', 'breaking', 'right now', 'this week',
  'as of', 'happening', 'trending', 'recent', 'live', 'now'
];

function detectExternalKnowledgeNeed(userInput, webSearchEnabled) {
  if (!webSearchEnabled) return false;
  
  const lower = userInput.toLowerCase();
  
  for (const keyword of TIME_SENSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { input = '' } = body;

    const webSearchEnabled = RUNTIME_AUTHORITY.capabilities.web_search.enabled;
    const requires_web = detectExternalKnowledgeNeed(input, webSearchEnabled);

    return Response.json({
      requires_web,
      web_search_enabled: webSearchEnabled,
      detection_timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});