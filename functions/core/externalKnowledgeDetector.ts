import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TIME_SENSITIVE_KEYWORDS = [
  'today', 'latest', 'current', 'news', 'price of', 'weather', 'stock', 'score',
  'release date', 'update', 'version', 'breaking', 'right now', 'this week',
  'as of', 'happening', 'trending', 'recent', 'live', 'now'
];

function detectExternalKnowledgeNeed(userInput) {
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

    const requires_web = detectExternalKnowledgeNeed(input);

    return Response.json({
      requires_web,
      detection_timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});