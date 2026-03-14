import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// OpenAI pricing per 1M tokens (as of 2026)
const MODEL_PRICING = {
  'gpt-4o':        { input: 5.00,  output: 15.00 },
  'gpt-4o-mini':   { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':   { input: 10.00, output: 30.00 },
  'gpt-4':         { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50,  output: 1.50  },
  'default':       { input: 5.00,  output: 15.00 },
};

function estimateCost(receipt) {
  const tb = receipt.token_breakdown || {};
  const model = receipt.model_used || 'default';
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];
  const inputTokens  = (tb.system_prompt_tokens || 0) + (tb.history_tokens || 0) + (tb.user_input_tokens || 0);
  const outputTokens = tb.completion_tokens || 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ago24h     = new Date(now - 24 * 60 * 60 * 1000);
    const ago7d      = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const ago15min   = new Date(now - 15 * 60 * 1000);

    // Fetch all data in parallel — list() may return array or {results:[]}
    const unwrap = (r) => Array.isArray(r) ? r : (r?.results || []);
    const [usersRaw, messagesRaw, receiptsRaw, errorsRaw, loginRecordsRaw, supportTicketsRaw] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Message.list('-created_date', 500),
      base44.asServiceRole.entities.DiagnosticReceipt.list('-created_date', 500),
      base44.asServiceRole.entities.ErrorLog.list('-created_date', 200),
      base44.asServiceRole.entities.UserLogin.list('-created_date', 500),
      base44.asServiceRole.entities.SupportTicket.list(),
    ]);
    const users = unwrap(usersRaw);
    const messages = unwrap(messagesRaw);
    const receipts = unwrap(receiptsRaw);
    const errors = unwrap(errorsRaw);
    const loginRecords = unwrap(loginRecordsRaw);
    const supportTickets = unwrap(supportTicketsRaw);

    // ── USER METRICS ──────────────────────────────────────────────
    const registeredUsers = users.filter(u => u.email);
    const byRole = {};
    registeredUsers.forEach(u => {
      const r = u.role || 'user';
      byRole[r] = (byRole[r] || 0) + 1;
    });

    const recentLogins = loginRecords.filter(l =>
      l.last_active_time && new Date(l.last_active_time) >= ago15min
    );
    const activeGuests      = recentLogins.filter(l => l.is_guest).length;
    const activeRegistered  = recentLogins.filter(l => !l.is_guest).length;

    const byLoginMethod = { google: 0, email: 0, guest: 0 };
    loginRecords.forEach(l => {
      const m = l.login_method || 'guest';
      byLoginMethod[m] = (byLoginMethod[m] || 0) + 1;
    });

    const loginsToday = loginRecords.filter(l =>
      l.login_time && new Date(l.login_time) >= todayStart
    ).length;
    const loginsThisMonth = loginRecords.filter(l =>
      l.login_time && new Date(l.login_time) >= monthStart
    ).length;

    const durations = loginRecords.filter(l => l.session_duration_minutes > 0).map(l => l.session_duration_minutes);
    const avgSessionDuration = durations.length
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : 0;

    const countryCounts = {};
    loginRecords.forEach(l => {
      if (l.country) countryCounts[l.country] = (countryCounts[l.country] || 0) + 1;
    });
    const countries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    // ── MESSAGE METRICS ───────────────────────────────────────────
    const userMessages      = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const messagesToday     = messages.filter(m => m.timestamp && new Date(m.timestamp) >= todayStart);

    const avgCharCount  = userMessages.length
      ? Math.round(userMessages.reduce((a, m) => a + (m.char_count || (m.content?.length || 0)), 0) / userMessages.length)
      : 0;
    const avgWordCount  = userMessages.length
      ? Math.round(userMessages.reduce((a, m) => a + (m.word_count || (m.content?.split(/\s+/).length || 0)), 0) / userMessages.length)
      : 0;
    const avgTokenCount = messages.length
      ? Math.round(messages.reduce((a, m) => a + (m.token_count || 0), 0) / messages.length)
      : 0;

    const toolCallCounts = {};
    messages.forEach(m => {
      (m.tool_calls || []).forEach(tc => {
        const n = tc.name || 'unknown';
        toolCallCounts[n] = (toolCallCounts[n] || 0) + 1;
      });
    });
    const totalToolCalls = Object.values(toolCallCounts).reduce((a, b) => a + b, 0);

    // ── TOKEN & COST METRICS ──────────────────────────────────────
    const receiptsToday = receipts.filter(r => r.created_at && new Date(r.created_at) >= todayStart);
    const receiptsMonth = receipts.filter(r => r.created_at && new Date(r.created_at) >= monthStart);

    const sumTokens = (list) => list.reduce((a, r) => a + (r.token_breakdown?.total_tokens || 0), 0);
    const tokensTotal = sumTokens(receipts);
    const tokensToday = sumTokens(receiptsToday);
    const tokensMonth = sumTokens(receiptsMonth);

    const sumCost = (list) => list.reduce((a, r) => a + estimateCost(r), 0);
    const costTotal = sumCost(receipts);
    const costToday = sumCost(receiptsToday);
    const costMonth = sumCost(receiptsMonth);

    // ── PERFORMANCE METRICS ───────────────────────────────────────
    const latencies = receipts.filter(r => r.latency_breakdown?.total_ms > 0).map(r => r.latency_breakdown.total_ms);
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const p95Latency = latencies.length
      ? Math.round(latencies.sort((a,b) => a-b)[Math.floor(latencies.length * 0.95)] || 0)
      : 0;

    // ── ERROR METRICS ─────────────────────────────────────────────
    const errors24h = errors.filter(e => e.created_date && new Date(e.created_date) >= ago24h);
    const errors7d  = errors.filter(e => e.created_date && new Date(e.created_date) >= ago7d);
    const errorsByType = {};
    errors.forEach(e => {
      const t = e.error_type || 'unknown';
      errorsByType[t] = (errorsByType[t] || 0) + 1;
    });
    const unresolvedErrors = errors.filter(e => !e.resolved).length;
    const openTickets      = supportTickets.filter(t => t.status === 'open').length;

    // ── MEMORY METRICS ────────────────────────────────────────────
    const recallRequests     = receipts.filter(r => r.recall_executed).length;
    const crossSessionRecall = receipts.filter(r => r.recall_tier_counts?.profile > 0 || r.recall_tier_counts?.global > 0).length;
    const memorySessions     = receipts.filter(r => r.matched_memories > 0).length;

    return Response.json({
      generated_at: now.toISOString(),
      users: {
        total_registered: registeredUsers.length,
        active_registered: activeRegistered,
        active_guests: activeGuests,
        total_active: activeRegistered + activeGuests,
        by_role: byRole,
        by_login_method: byLoginMethod,
        logins_today: loginsToday,
        logins_this_month: loginsThisMonth,
        avg_session_duration_minutes: parseFloat(avgSessionDuration),
        countries,
      },
      messages: {
        total: messages.length,
        total_user: userMessages.length,
        total_assistant: assistantMessages.length,
        today: messagesToday.length,
        avg_char_count: avgCharCount,
        avg_word_count: avgWordCount,
        avg_token_count: avgTokenCount,
        tool_calls_total: totalToolCalls,
        tool_calls_by_name: toolCallCounts,
      },
      tokens: {
        total_all_time: tokensTotal,
        today: tokensToday,
        this_month: tokensMonth,
        estimated_cost_today: parseFloat(costToday.toFixed(4)),
        estimated_cost_month: parseFloat(costMonth.toFixed(4)),
        estimated_cost_total: parseFloat(costTotal.toFixed(4)),
      },
      errors: {
        count_24h: errors24h.length,
        count_7d:  errors7d.length,
        by_type:   errorsByType,
        unresolved_count: unresolvedErrors,
        support_tickets_open: openTickets,
      },
      performance: {
        avg_response_time_ms: avgLatency,
        p95_response_time_ms: p95Latency,
      },
      memory: {
        recall_requests: recallRequests,
        cross_session_recalls: crossSessionRecall,
        active_sessions_with_memory: memorySessions,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});