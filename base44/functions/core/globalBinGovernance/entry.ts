/**
 * CAOS GLOBAL BIN GOVERNANCE
 * 
 * Before any external lookup:
 * 1. Check Global Bin
 * 2. If hit within freshness → return
 * 3. If miss:
 *    - Seeding Phase → allow lookup
 *    - Governed Phase → queue update
 * 4. Populate Global Bin on confirmed lookup
 * 5. Emit receipt
 * 
 * Global Bin entries are IMMUTABLE.
 * No direct promotion to profile memory.
 */

/**
 * Check if cached result exists in Global Bin
 * @returns {Object|null} Cached result or null if miss/stale
 */
export async function checkGlobalBin(lookupKey, base44) {
    console.log('🗄️ [GLOBAL_BIN_CHECK]', { lookup_key: lookupKey });

    try {
        const entries = await base44.asServiceRole.entities.GlobalBin.filter(
            { lookup_key: lookupKey },
            '-retrieved_at_ms',
            1
        );

        if (!entries || entries.length === 0) {
            console.log('❌ [GLOBAL_BIN_MISS]', { lookup_key: lookupKey });
            return null;
        }

        const entry = entries[0];
        const now = Date.now();
        const freshnessMs = entry.freshness_duration_hours * 60 * 60 * 1000;
        const ageMs = now - entry.retrieved_at_ms;

        if (ageMs > freshnessMs) {
            console.log('⏰ [GLOBAL_BIN_STALE]', { 
                lookup_key: lookupKey,
                age_hours: (ageMs / (60 * 60 * 1000)).toFixed(1),
                freshness_hours: entry.freshness_duration_hours
            });
            return null;
        }

        // HIT - Update access stats
        await base44.asServiceRole.entities.GlobalBin.update(entry.id, {
            hit_count: (entry.hit_count || 0) + 1,
            last_accessed: new Date().toISOString()
        });

        console.log('✅ [GLOBAL_BIN_HIT]', {
            lookup_key: lookupKey,
            hit_count: entry.hit_count + 1,
            age_hours: (ageMs / (60 * 60 * 1000)).toFixed(1)
        });

        return entry.result;

    } catch (error) {
        console.error('⚠️ [GLOBAL_BIN_CHECK_ERROR]', error.message);
        return null;
    }
}

/**
 * Store external lookup result in Global Bin
 * Entries are IMMUTABLE once created
 */
export async function storeInGlobalBin(params, base44) {
    const {
        lookup_key,
        lookup_type,
        result,
        freshness_duration_hours = 24
    } = params;

    console.log('💾 [GLOBAL_BIN_STORE]', { lookup_key, lookup_type });

    try {
        // Check if entry already exists (immutable)
        const existing = await base44.asServiceRole.entities.GlobalBin.filter(
            { lookup_key },
            '-retrieved_at_ms',
            1
        );

        if (existing && existing.length > 0) {
            console.log('⚠️ [GLOBAL_BIN_IMMUTABLE]', { 
                lookup_key, 
                message: 'Entry already exists, cannot overwrite'
            });
            return existing[0];
        }

        // Create new entry
        const timestamp = new Date();
        const entry = await base44.asServiceRole.entities.GlobalBin.create({
            lookup_key,
            lookup_type,
            result,
            retrieved_at: timestamp.toISOString(),
            retrieved_at_ms: timestamp.getTime(),
            freshness_duration_hours,
            hit_count: 0,
            immutable: true
        });

        console.log('✅ [GLOBAL_BIN_STORED]', {
            lookup_key,
            freshness_hours: freshness_duration_hours
        });

        return entry;

    } catch (error) {
        console.error('🚨 [GLOBAL_BIN_STORE_ERROR]', error.message);
        throw error;
    }
}

/**
 * Perform external lookup with Global Bin governance
 * This is the main entry point for any external data fetch
 */
export async function governedLookup(params, base44) {
    const {
        lookup_key,
        lookup_type,
        lookup_function,
        freshness_duration_hours = 24
    } = params;

    console.log('🔍 [GOVERNED_LOOKUP_START]', { lookup_key, lookup_type });

    // STEP 1: Check Global Bin first
    const cached = await checkGlobalBin(lookup_key, base44);
    if (cached) {
        return {
            source: 'global_bin',
            cached: true,
            result: cached
        };
    }

    // STEP 2: Miss - execute external lookup
    console.log('🌐 [EXTERNAL_LOOKUP_EXECUTING]', { lookup_key });

    try {
        const result = await lookup_function();

        // STEP 3: Store in Global Bin
        await storeInGlobalBin({
            lookup_key,
            lookup_type,
            result,
            freshness_duration_hours
        }, base44);

        return {
            source: 'external',
            cached: false,
            result
        };

    } catch (error) {
        console.error('🚨 [EXTERNAL_LOOKUP_FAILED]', { lookup_key, error: error.message });
        throw error;
    }
}

/**
 * Helper: Generate lookup key for web search
 */
export function generateWebSearchKey(query) {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, '_');
    return `web_search:${normalized}`;
}

/**
 * Helper: Generate lookup key for API calls
 */
export function generateApiKey(endpoint, params) {
    const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    return `api:${endpoint}:${paramString}`;
}