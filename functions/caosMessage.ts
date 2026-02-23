/**
 * LEGACY PATH - DEPRECATED
 * 
 * This function has been replaced by hybridMessage.
 * 
 * Reason: caosMessage bypassed:
 *   - Intent resolution
 *   - Execution receipts
 *   - Guardrail enforcement
 *   - Drift detection
 * 
 * Migration: All callers should use hybridMessage instead.
 */

Deno.serve(async (req) => {
    console.error('⚠️  DEPRECATED: caosMessage called - redirect to hybridMessage');

    return Response.json({
        error: 'LEGACY_PATH_DEPRECATED',
        message: 'This endpoint has been deprecated. Please use hybridMessage instead.',
        migration_guide: {
            old_function: 'caosMessage',
            new_function: 'hybridMessage',
            reason: 'Unified execution pipeline with governance, receipts, and drift detection',
            breaking_changes: 'Response now includes execution_receipt field'
        },
        deprecated_since: '2026-02-23',
        removal_date: 'TBD'
    }, { 
        status: 410,
        headers: {
            'X-Deprecated-Function': 'caosMessage',
            'X-Replacement-Function': 'hybridMessage'
        }
    });
});