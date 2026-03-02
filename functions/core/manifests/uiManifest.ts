// LOCK_SIGNATURE: CAOS_UI_MANIFEST_v1_2026-03-01
// STATIC — NO DYNAMIC FIELDS — NO FUNCTION CALLS — NO TIMESTAMPS
// Regenerate only when UI structure changes.

export const UI_MANIFEST_V1 = `
CAOS_UI_MANIFEST_v1_2026-03-01

MACHINE_READABLE:
background=animated_starfield_canvas
header=fixed_top_bar
thread_list=slide_in_sidebar_left
profile_panel=slide_in_sidebar_right
chat_area=scrollable_centered_max_width_2xl
input_bar=fixed_bottom
token_meter=top_right_header_wcw_bar
execution_receipt=expandable_per_assistant_message
developer_mode=resizable_split_chat_left_terminal_right
game_mode=resizable_split_chat_left_gameview_right
multi_agent_mode=agent_chips_above_input_blackboard_below
bottom_nav=mobile_only_chat_news_profile
voice_menu=right_click_on_volume_button

PAGES:
- Welcome (auth entry point: Google OAuth, email, guest mode)
- Chat (primary interaction surface)
- Admin (system monitoring: health, routes, WCW, stats, errors, pipeline)
- Console (SSH-style terminal / WebSocket attach)
- Implementation (CAOS architecture documentation — not deployed backend)
- MemoryIsolation (memory isolation blueprint — diagnostic view)
- SystemBlueprint (full system architecture view)
- News (news feed page)
- Logs (error log viewer)

UI TOPOLOGY:
- Background: Animated starfield (canvas, full viewport, z-index 0)
- Header: Fixed top bar — contains ChatHeader (thread title, new thread, thread list, profile menu, conversation search, token meter)
- Thread List: Slide-in sidebar panel (left) — lists all conversations, supports rename/delete/search
- Profile Panel: Slide-in sidebar panel (right) — user profile, settings, file manager, memory panel, developer/admin toggles
- Chat Area: Scrollable message list (max-width 2xl centered) — ChatBubble components per message
- Input Bar: Fixed bottom — Volume2 (Google TTS read-aloud), textarea, Plus menu (file upload/screen capture/camera), mic button, send button
- Voice Menu: Right-click context menu on Volume2 button — voice selection + speed slider
- Bottom Nav: Mobile only — Chat / News / Profile tabs
- Token Meter: Top-right of header — live WCW usage bar (green→blue→yellow→red)
- Execution Receipt: Expandable panel per assistant message — shows pipeline metadata
- Developer Mode: Resizable split panel — chat left, CodeTerminal right
- Game Mode: Resizable split panel — chat left, GameView right
- Multi-Agent Mode: Agent chips above input bar + Blackboard panel below input

ACTIVE MODES (toggled via ProfilePanel):
- developer_mode: shows CodeTerminal split
- game_mode: shows GameView split
- multi_agent_mode: shows agent selector chips + blackboard

NOT PRESENT:
- Live sensor dashboard
- Calendar integration panel
- Public web browsing interface
`;