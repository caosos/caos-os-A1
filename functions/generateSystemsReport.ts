import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // Entity definitions and status
    const entities = [
      { name: 'Message', purpose: 'Chat message storage + reactions/replies', status: 'Active' },
      { name: 'Record', purpose: 'Session-scoped memory with tiered recall (session/lane/profile/global)', status: 'Active' },
      { name: 'Lane', purpose: 'Topic-based conversation lanes with hot messages + summaries', status: 'Active' },
      { name: 'UserProfile', purpose: 'Persistent user preferences + visual context + learned facts', status: 'Active' },
      { name: 'Conversation', purpose: 'Thread metadata + keywords + summaries', status: 'Active' },
      { name: 'SessionContext', purpose: 'Working context window budget management', status: 'Active' },
      { name: 'SessionState', purpose: 'Per-session anchor tracking', status: 'Active' },
      { name: 'UserFile', purpose: 'User-generated/uploaded files organized by folder', status: 'Active' },
      { name: 'ErrorLog', purpose: 'Error tracking + recovery metadata', status: 'Active' }
    ];

    // Backend functions and status
    const functions = [
      { name: 'hybridMessage', purpose: 'Core message handler (OpenAI gpt-4o + tools + file generation)', status: '✅ Active' },
      { name: 'transcribeAudio', purpose: 'Speech-to-text via Whisper API', status: '✅ Operational' },
      { name: 'textToSpeech', purpose: 'Text-to-audio (OpenAI voices: nova, alloy, echo, shimmer, fable, onyx)', status: '✅ Operational' },
      { name: 'caosMessage', purpose: 'Alternative message routing (legacy)', status: 'Passive' },
      { name: 'proxyMessage', purpose: 'External API proxy handler', status: 'Passive' },
      { name: 'contextJournal', purpose: 'Memory journal management', status: 'Passive' },
      { name: 'tieredRecall', purpose: 'Multi-tier memory retrieval system', status: 'Passive' },
      { name: 'caosRecall', purpose: 'Session-specific recall logic', status: 'Passive' },
      { name: 'selector', purpose: 'Context window decision engine', status: 'Passive' },
      { name: 'grokProvider', purpose: 'Grok API handler (XAI)', status: 'Passive' },
      { name: 'checkGrokModels', purpose: 'Grok model availability check', status: 'Passive' },
      { name: 'extractUserPreference', purpose: 'Profile preference extraction', status: 'Passive' },
      { name: 'pinMemory', purpose: 'Bookmark high-value conversation snippets', status: 'Passive' }
    ];

    // Pages
    const pages = [
      { name: 'Welcome', description: 'Auth entry point (Google OAuth, email signup, guest)' },
      { name: 'Chat', description: 'Main conversation hub + thread management' },
      { name: 'Console', description: 'SSH/WebSocket terminal interface' },
      { name: 'News', description: 'Current events feed' },
      { name: 'SystemBlueprint', description: 'System architecture documentation' },
      { name: 'MemoryIsolation', description: 'Memory system deep-dive' },
      { name: 'Implementation', description: 'UI/backend contract specs' },
      { name: 'TerminalBlueprint', description: 'Terminal system docs' }
    ];

    // Component categories
    const components = {
      'Chat': ['ChatBubble', 'ChatInput', 'ChatHeader', 'TokenMeter', 'ThreadList', 'QuickActionBar', 'ConversationSearch', 'LaneSelector', 'VoiceSettings', 'LinkPreview', 'TextSelectionMenu', 'CopyBlock', 'WelcomeGreeting'],
      'Media': ['FileManager', 'VoiceSettings'],
      'Terminal': ['CodeTerminal', 'SSHConsole', 'WebSocketAttach'],
      'Game': ['GameView'],
      'UI/UX': ['StarfieldBackground', 'ContinuityToken', 'ProfilePanel', 'MemoryPanel', 'ResizablePanels', 'Dialogs', 'Forms']
    };

    // Integration status
    const integrations = [
      { service: 'OpenAI (gpt-4o, Whisper, TTS, DALL-E 3)', status: 'Active', type: 'API Key' },
      { service: 'XAI Grok (fallback LLM)', status: 'Configured but not primary flow', type: 'API Key' },
      { service: 'Google OAuth', status: 'Active', type: 'OAuth' },
      { service: 'Base44 SDK', status: 'Active', type: 'Platform' }
    ];

    // Build comprehensive report
    const report = {
      title: 'COMPREHENSIVE SYSTEMS REPORT - CAOS v3',
      generated: `${dateStr} • ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      status: 'Operational',
      
      architecture: {
        platform: 'Base44 React/Tailwind/TypeScript',
        core_identity: 'CAOS (Cognitive Adaptive Operating System)',
        response_depth_mode: 'Thoroughness-first (default detailed)',
        authentication: 'Base44 built-in + guest support'
      },

      entities: {
        total: entities.length,
        list: entities
      },

      backend_functions: {
        total: functions.length,
        list: functions
      },

      frontend_pages: {
        total: pages.length,
        list: pages
      },

      frontend_components: {
        total: Object.values(components).flat().length,
        by_category: components
      },

      system_capabilities: {
        message_processing: [
          'OpenAI gpt-4o with tools (search_internet, recall_memory, read_app_file, list_app_structure, update_user_profile)',
          'Temperature: 0.8 | Max tokens: 4000',
          'File generation (TXT, JSON, MD, PDF) + image generation (DALL-E 3)'
        ],
        audio_stack: [
          'Speech-to-text: Whisper (up to 5 min recordings)',
          'Text-to-speech: OpenAI (6 voices + speed control 0.5x-2.0x)',
          'Web Audio API + MediaRecorder'
        ],
        memory_system: [
          'Session-level: Current conversation hot context (last 5 msgs per lane)',
          'Lane-level: Topic-specific summaries + cross-lane continuity',
          'Profile-level: Permanent user preferences/learned facts',
          'Global: System-wide anchors'
        ],
        multi_agent_support: [
          'Built-in: Architect, Security, Engineer, QA, Docs',
          'Custom agents: User-creatable with right-click management',
          'Agent-based routing: Specialized response handling'
        ],
        user_features: [
          'Text selection → emoji reactions + threaded replies',
          'File attachments (max 5 per message)',
          'Screenshot capture + webcam integration',
          'Email export for checklists/memos',
          'Token meter (working context window visualization)'
        ]
      },

      integration_status: integrations,

      current_session: {
        user_email: user.email,
        user_role: user.role,
        authentication: 'Authenticated',
        automations: 'None configured',
        app_connectors: 'None authorized',
        secrets_configured: 3
      },

      key_behavioral_rules: [
        'Default Mode: Thorough, detailed responses (ChatGPT-4 depth)',
        'Identity: CAOS (not "me", not user), sender ID for user: "ME"',
        'Tool Mandates: "Remember this" → update_user_profile (MUST); "Find/search past info" → recall_memory (MUST); Video requests → search_internet for YouTube URLs',
        'Grounding: Tool results > web search > current date > training data',
        'Truth Hierarchy: Never contradict live data with training assumptions'
      ]
    };

    return Response.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Systems report generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});