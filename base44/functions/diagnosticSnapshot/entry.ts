/**
 * DIAGNOSTIC SNAPSHOT TOOL
 * 
 * Generates a comprehensive snapshot of current system state for debugging.
 * Use this to diagnose memory, identity, and configuration issues.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const snapshot = {
            timestamp: new Date().toISOString(),
            user_email: user.email,
            sections: {}
        };
        
        // 1) USER PROFILE CHECK
        try {
            const profiles = await base44.asServiceRole.entities.UserProfile.filter(
                { user_email: user.email },
                '-updated_date',
                1
            );
            
            snapshot.sections.user_profile = {
                exists: profiles.length > 0,
                data: profiles[0] || null,
                assistant_name: profiles[0]?.assistant_name || 'NOT SET',
                memory_anchors_count: profiles[0]?.memory_anchors?.length || 0,
                learned_facts_count: profiles[0]?.learned_facts?.length || 0
            };
        } catch (error) {
            snapshot.sections.user_profile = { error: error.message };
        }
        
        // 2) LEARNED FACTS CHECK
        try {
            const facts = await base44.asServiceRole.entities.LearnedFact.filter(
                { user_id: user.email },
                '-learned_at',
                10
            );
            
            snapshot.sections.learned_facts = {
                total: facts.length,
                sample: facts.slice(0, 5).map(f => ({
                    fact: f.fact_content,
                    type: f.fact_type,
                    category: f.category,
                    confidence: f.confidence,
                    learned_at: f.learned_at
                }))
            };
        } catch (error) {
            snapshot.sections.learned_facts = { error: error.message };
        }
        
        // 3) RECENT THREADS CHECK
        try {
            const conversations = await base44.asServiceRole.entities.Conversation.filter(
                { created_by: user.email },
                '-updated_date',
                5
            );
            
            snapshot.sections.recent_threads = {
                total: conversations.length,
                sample: conversations.map(c => ({
                    id: c.id,
                    title: c.title,
                    created: c.created_date,
                    updated: c.updated_date
                }))
            };
        } catch (error) {
            snapshot.sections.recent_threads = { error: error.message };
        }
        
        // 4) LEXICAL RULES CHECK
        try {
            const rules = await base44.asServiceRole.entities.LexicalRule.filter(
                { enabled: true },
                '-priority',
                10
            );
            
            snapshot.sections.lexical_rules = {
                total: rules.length,
                sample: rules.slice(0, 5).map(r => ({
                    canonical: r.canonical_term,
                    aliases: r.aliases,
                    enabled: r.enabled
                }))
            };
        } catch (error) {
            snapshot.sections.lexical_rules = { error: error.message };
        }
        
        // 5) ENVIRONMENT STATE CHECK
        try {
            const envState = await base44.asServiceRole.entities.EnvironmentState.filter(
                { user_id: user.email },
                '-updated_date',
                1
            );
            
            snapshot.sections.environment_state = {
                exists: envState.length > 0,
                thread_count: envState[0]?.active_thread_count || 0,
                last_updated: envState[0]?.last_updated_at || null
            };
        } catch (error) {
            snapshot.sections.environment_state = { error: error.message };
        }
        
        // 6) SYSTEM SECRETS CHECK (without exposing values)
        snapshot.sections.secrets = {
            OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') ? '✓ SET' : '✗ MISSING',
            XAI_API_KEY: Deno.env.get('XAI_API_KEY') ? '✓ SET' : '✗ MISSING'
        };
        
        // 7) IDENTITY CONTRACT STATUS
        snapshot.sections.identity_contract = {
            default_assistant_name: 'Aria',
            default_environment_name: 'CAOS',
            user_override: snapshot.sections.user_profile?.assistant_name || 'NONE',
            expected_behavior: 'Assistant should NEVER say "I am CAOS" - should use assistant_name instead'
        };
        
        return Response.json(snapshot, { status: 200 });
        
    } catch (error) {
        console.error('🚨 [DIAGNOSTIC_SNAPSHOT_FAILED]', error);
        return Response.json({
            error: 'Diagnostic snapshot failed',
            details: error.message
        }, { status: 500 });
    }
});