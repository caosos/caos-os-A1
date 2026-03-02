// MODULE: core/systemStateDiff
// PURPOSE: Detect drift between two system state snapshots
// INPUT: { from, to } snapshots
// OUTPUT: { changes, change_count, hashes }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function deepDiff(before, after, path = '') {
  const changes = {
    added: [],
    removed: [],
    changed: []
  };

  // Find removed and changed keys
  for (const key in before) {
    const currentPath = path ? `${path}.${key}` : key;
    if (!(key in after)) {
      changes.removed.push(currentPath);
    } else if (typeof before[key] === 'object' && before[key] !== null && typeof after[key] === 'object' && after[key] !== null) {
      const nested = deepDiff(before[key], after[key], currentPath);
      changes.added.push(...nested.added);
      changes.removed.push(...nested.removed);
      changes.changed.push(...nested.changed);
    } else if (before[key] !== after[key]) {
      changes.changed.push({
        path: currentPath,
        before: before[key],
        after: after[key]
      });
    }
  }

  // Find added keys
  for (const key in after) {
    const currentPath = path ? `${path}.${key}` : key;
    if (!(key in before)) {
      changes.added.push(currentPath);
    }
  }

  return changes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { from, to } = body;

    if (!from || !to) {
      return Response.json({ error: 'Missing from or to snapshots' }, { status: 400 });
    }

    const changes = deepDiff(from, to);

    return Response.json({
      changes,
      change_count: changes.added.length + changes.removed.length + changes.changed.length,
      from_hash: from.hash || 'unknown',
      to_hash: to.hash || 'unknown'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});