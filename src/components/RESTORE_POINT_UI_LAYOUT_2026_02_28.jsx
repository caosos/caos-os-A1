# UI Layout Restore Point - 2026-02-28
**Status**: LOCKED - Do not modify this architecture without explicit user approval.

## Current Stable Architecture

### Layout Structure (pages/Chat.jsx - 1247 lines)
- **Fixed viewport**: height: 100dvh with starfield background
- **Header layer (z-30)**: ChatHeader + ConversationSearch + TokenMeter
- **Main content layer (z-20)**: Resizable panel group or flex column layout
- **Input layer (z-50)**: ChatInput in gradient overlay at bottom
- **Navigation**: BottomNavBar fixed at bottom (mobile only)

### Component Hierarchy
```
Chat (main page)
├── StarfieldBackground (fixed z-0)
├── Header (z-30)
│   ├── ChatHeader
│   ├── ConversationSearch (conditional)
│   └── TokenMeter (conditional)
├── Main Content (z-20)
│   ├── ResizablePanel (dev/game mode enabled)
│   │   ├── Chat Section (50% width)
│   │   │   ├── ChatContainer (scrollable)
│   │   │   │   └── ChatBubble[] (messages)
│   │   │   └── ChatInput (bottom overlay)
│   │   └── Dev Tools Section (50% width)
│   │       ├── CodeTerminal or GameView
│   │       └── Blackboard (multi-agent mode)
│   └── Single Column (dev/game mode disabled)
│       ├── ChatContainer (scrollable)
│       │   └── ChatBubble[] (messages)
│       ├── ChatInput (bottom overlay)
│       └── Blackboard (multi-agent mode only)
├── ThreadList (left slide panel, z-9999)
├── ProfilePanel (right slide panel, z-9999)
├── BottomNavBar (mobile only, z-40)
└── Token Dialog (overlay)
```

### Key Layout Features
- **Mobile-first responsive**: Breakpoints at md (768px)
- **Safe area insets**: Applied to header and input
- **Fixed bottom nav**: 80px height with safe-area-inset-bottom padding
- **Pull-to-refresh**: OnTouchStart on mobile
- **Scroll-to-bottom button**: Animated right-side button
- **Gradient overlay**: ChatInput sits in gradient-to-transparent overlay

### ChatInput Features
- Fixed at bottom with absolute positioning
- Gradient background from-[#0a1628] via-[#0a1628] to-transparent
- Padding bottom: pb-20 for safe area + space
- z-index: 50
- Contains textarea for message input
- Voice controls integration point

### ChatBubble Features
- User messages: Right-aligned, blue-gray background
- Assistant messages: Left-aligned, white/semi-transparent background
- File attachments support
- Tool call displays
- Execution receipt displays
- Message reactions and replies
- Read-aloud button (integration point)

### Responsive Breakpoints
- **Mobile** (<768px):
  - Compact header with icons only
  - Full-width chat
  - Bottom navigation bar
  - No resizable panels
  - Reduced padding
- **Tablet/Desktop** (≥768px):
  - Full header with text
  - Resizable panels (if dev/game mode)
  - No bottom navigation
  - Larger padding

## File Dependencies
- **pages/Chat.jsx**: Main orchestrator (1247 lines)
- **components/chat/ChatHeader.jsx**: Header UI (213 lines)
- **components/chat/ChatBubble.jsx**: Message display (NOT FOUND - needs creation)
- **components/chat/ChatInput.jsx**: Input handling (NOT FOUND - needs creation)
- **components/chat/ThreadList.jsx**: Sidebar panel (258 lines)
- **components/chat/ProfilePanel.jsx**: User settings panel
- **components/chat/TokenMeter.jsx**: WCW display
- **components/chat/ConversationSearch.jsx**: Message search
- **components/chat/StarfieldBackground.jsx**: Visual backdrop
- **components/mobile/BottomNavBar.jsx**: Mobile navigation (40 lines)
- **components/terminal/CodeTerminal.jsx**: Developer mode
- **components/game/GameView.jsx**: Game mode
- **functions/hybridMessage.js**: Backend message handler
- **functions/textToSpeech.js**: OpenAI TTS API

## Known Integration Points
### Read-Aloud Buttons
- **Location 1**: ChatBubble (AI response read-aloud)
  - Uses: OpenAI TTS via textToSpeech function
  - Module: ChatBubbleReadAloud.jsx
  - Trigger: Button on assistant messages
  
- **Location 2**: ChatInput (message bar read-aloud)
  - Uses: Google Web Speech API
  - Module: ChatInputReadAloud.jsx
  - Trigger: Voice icon in input area

## CSS Critical Classes
- `.chat-messages`: Main message container
- `.message-content`: Individual message styling
- `.chat-input`: Input area styling
- `.bottom-nav`: Mobile bottom navigation
- Safe area variables: var(--safe-area-inset-*)

## State Management
- **Messages**: By conversationId in object
- **Conversations**: Array, sorted by last_message_time
- **WCW State**: { used, budget }
- **UI States**: showThreads, showProfile, showTerminal, showToken
- **Preferences**: localStorage keys prefixed with `caos_`

## localStorage Keys Used
- `caos_developer_mode`
- `caos_game_mode`
- `caos_guest_user`
- `caos_guest_conversations`
- `caos_guest_messages`
- `caos_multi_agent_mode`
- `caos_current_lane`
- `caos_last_conversation`
- `caos_seed_*`
- `caos_show_execution`
- `caos_voice_preference` (OpenAI TTS voice)
- `caos_speech_rate` (speech rate 0.1-2.0)
- `caos_google_voice` (Google Voice preference)
- `caos_google_speech_rate`

## Critical DO NOTs
1. ❌ Do NOT move navbar from bottom on mobile
2. ❌ Do NOT change ChatInput z-index below 50
3. ❌ Do NOT remove StarfieldBackground fixed positioning
4. ❌ Do NOT modify viewport meta tag logic
5. ❌ Do NOT change overflow-hidden on body
6. ❌ Do NOT alter message display order
7. ❌ Do NOT modify scroll-to-bottom behavior
8. ❌ Do NOT change header z-index below 30
9. ❌ Do NOT remove safe-area-inset handling
10. ❌ Do NOT modify pull-to-refresh logic

## Last Validated
- **Date**: 2026-02-28
- **Status**: Locked for stability
- **Known Issues**: ChatBubble and ChatInput missing (breaking read-aloud)
- **Next Steps**: Implement missing components with locked layout