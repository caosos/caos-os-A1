import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RUNTIME_AUTHORITY } from './runtimeAuthority.js';

const TIME_SENSITIVE_KEYWORDS = [
  'today', 'latest', 'current', 'news', 'price of', 'weather', 'stock', 'score',
  'release date', 'update', 'version', 'breaking', 'right now', 'this week',
  'as of', 'happening', 'trending', 'recent', 'live', 'now', 'yesterday',
  'this morning', 'tonight', 'reportedly', 'according to'
];

// Explicit browse-verb patterns — fire web_allowed=true immediately, no confirmation needed
const BROWSE_VERB_PATTERNS = [
  /\bgo online\b/i,
  /\bsearch (the )?(web|internet|online|for)\b/i,
  /\blook (it )?up\b/i,
  /\bcheck (the )?(news|web|internet|online)\b/i,
  /\bfind (sources?|info|information|articles?|out)\b/i,
  /\bcite (sources?|that|this)\b/i,
  /\bwhat did .+ say\b/i,
  /\bwhat (is|are|was|were) .+ saying\b/i,
  /\bbrowse\b/i,
  /\bpull up\b/i,
  /\bsee what .+ said\b/i,
];

// Named entity presence heuristic — proper noun + event anchor = sufficient for immediate web run
function hasNamedEntityAndAnchor(input) {
  const hasProperNoun = /\b[A-Z][a-z]{2,}/.test(input); // capitalized word
  const hasEventAnchor = /\b(said|stated|announced|declared|bombed|attacked|killed|died|struck|signed|passed|won|lost|launched|arrested|released)\b/i.test(input);
  return hasProperNoun && hasEventAnchor;
}

function detectExternalKnowledgeNeed(userInput, webSearchEnabled) {
  if (!webSearchEnabled) return { requires_web: false, web_trigger: null, query_sufficient: false };

  const lower = userInput.toLowerCase();

  // Stage 1: Check for explicit browse verb — immediate permission
  const explicitBrowse = BROWSE_VERB_PATTERNS.some(p => p.test(userInput));

  // Stage 2: Check time-sensitive keywords
  const timeSensitive = TIME_SENSITIVE_KEYWORDS.some(kw => lower.includes(kw));

  const requires_web = explicitBrowse || timeSensitive;

  if (!requires_web) return { requires_web: false, web_trigger: null, query_sufficient: false };

  // Stage 3: Query sufficiency gate
  // If has named entity + event anchor → run immediately
  // If explicit browse verb but vague → run broad + return candidates
  // If only time-sensitive keyword, no entity → ask before web
  const entityAndAnchor = hasNamedEntityAndAnchor(userInput);
  const query_sufficient = entityAndAnchor || (explicitBrowse && userInput.trim().split(/\s+/).length >= 4);

  return {
    requires_web: true,
    web_trigger: explicitBrowse ? 'explicit_browse_verb' : 'time_sensitive_keyword',
    query_sufficient,
    // If query is insufficient but browse was explicit → run broad search, return candidates
    run_broad_search: explicitBrowse && !query_sufficient,
  };
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
    const detection = detectExternalKnowledgeNeed(input, webSearchEnabled);

    return Response.json({
      ...detection,
      web_search_enabled: webSearchEnabled,
      detection_timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});