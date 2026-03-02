// LOCK_SIGNATURE: CAOS_SYSTEM_STATE_DIFF_v1_2026-03-02
// Deterministic diff between two snapshots

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from, to } = await req.json();

    if (!from || !to) {
      return Response.json({ error: 'Missing from/to snapshots' }, { status: 400 });
    }

    const before = from.system_state_json || from;
    const after = to.system_state_json || to;

    const changes = [];

    function compare(obj1, obj2, path = "") {
      const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
      
      for (const key of allKeys) {
        const p = path ? `${path}.${key}` : key;
        
        if (!obj1 || !(key in obj1)) {
          changes.push({ type: "added", path: p, value: obj2[key] });
        } else if (!obj2 || !(key in obj2)) {
          changes.push({ type: "removed", path: p, value: obj1[key] });
        } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
            compare(obj1[key], obj2[key], p);
          } else {
            changes.push({ 
              type: "changed", 
              path: p, 
              from: obj1[key], 
              to: obj2[key] 
            });
          }
        }
      }
    }

    compare(before, after);

    return Response.json({ 
      changes,
      change_count: changes.length,
      before_hash: from.system_state_hash,
      after_hash: to.system_state_hash
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});