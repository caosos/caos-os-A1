import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StarfieldBackground from '@/components/chat/StarfieldBackground';

export default function TerminalBlueprint() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <StarfieldBackground />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <Link 
          to={createPageUrl('Chat')}
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to CAOS
        </Link>

        <div className="prose prose-invert max-w-none">
          <pre className="bg-[#0f1f3d]/80 backdrop-blur-sm border border-white/10 rounded-lg p-6 overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap">
{`================================================================
PROJECT NAME
----------------------------------------------------------------
CAOS UNIFIED TERMINAL
(Internal codename: SHELL-ZERO)

SYSTEM TYPE
----------------------------------------------------------------
Full-Featured Terminal Emulator & Remote Shell Manager
SSH/Tmux Replacement • WebSocket-Native • Multi-Session

STATUS
----------------------------------------------------------------
ARCHITECTURAL BLUEPRINT v1
IMPLEMENTATION-READY SPECIFICATION

================================================================
1. PURPOSE & PROBLEM STATEMENT
================================================================

Current terminal solutions fragment the workflow:
- SSH for remote access
- Tmux/Screen for session persistence
- Separate file transfer tools (SCP/SFTP)
- Local terminal for local work
- No unified authentication
- No session continuity across devices
- Poor mobile experience
- Complex multiplexing setup

CAOS UNIFIED TERMINAL exists to:
- Replace SSH + Tmux with a single WebSocket-based system
- Provide persistent sessions accessible from any device
- Integrate terminal access directly into CAOS UI
- Support split panes, tabs, and session management natively
- Enable secure shell access to remote servers (Linode, etc.)
- Allow seamless switching between local/remote contexts
- Preserve session state across reconnections
- Provide modern terminal features (search, copy/paste, theming)

This is NOT a toy terminal.
This is a production shell replacement.

================================================================
2. CORE DESIGN PRINCIPLES (NON-NEGOTIABLE)
================================================================

- Security first (zero-trust model)
- Session persistence over connection stability
- WebSocket-native (HTTP/2 upgrade path)
- Backend-agnostic (support multiple shell types)
- Mobile-friendly without compromising desktop power
- Keyboard-first (all vim/emacs bindings work)
- Zero data loss on disconnect
- Audit trail for all commands
- Deterministic session recovery

================================================================
3. SYSTEM ARCHITECTURE
================================================================

┌─────────────────────────────────────────────────────────┐
│                    CAOS FRONTEND                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Terminal UI Component                   │   │
│  │  - xterm.js (terminal emulator)                 │   │
│  │  - Split pane manager                           │   │
│  │  - Tab manager                                   │   │
│  │  - Command palette                              │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↕ WebSocket                     │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                 CAOS TERMINAL SERVER                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │       WebSocket Gateway                         │   │
│  │  - Connection manager                           │   │
│  │  - Session router                               │   │
│  │  - Auth validator                               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │       Session Manager                           │   │
│  │  - PTY (Pseudo-Terminal) allocator              │   │
│  │  - Process supervisor                           │   │
│  │  - Buffer manager (scrollback)                  │   │
│  │  - Session persistence (Redis/DB)               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │       Shell Backends                            │   │
│  │  - Local shell (bash/zsh/fish)                  │   │
│  │  - SSH client (connect to remote)               │   │
│  │  - Container exec (Docker/K8s)                  │   │
│  │  - Custom REPL environments                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                  REMOTE SERVERS                         │
│  - Linode VPS (SSH)                                     │
│  - AWS EC2 (SSH)                                        │
│  - Local Docker containers                              │
│  - Kubernetes pods                                      │
└─────────────────────────────────────────────────────────┘

================================================================
4. CONNECTION TYPES
================================================================

A) LOCAL SHELL
   - Spawns shell process on CAOS server
   - User: CAOS user's system account
   - Security: sandboxed, limited permissions
   - Use case: quick commands, file inspection

B) SSH TUNNEL (RECOMMENDED FOR LINODE)
   - CAOS server acts as SSH client
   - Connects to remote server via SSH
   - Authentication: SSH keys stored securely
   - Session persistence via backend buffer
   - Use case: full remote server access

C) DIRECT WEBSOCKET SHELL (ADVANCED)
   - Custom protocol for CAOS-aware servers
   - No SSH overhead
   - Built-in compression & multiplexing
   - Use case: CAOS-managed infrastructure

D) CONTAINER EXEC
   - Docker exec / kubectl exec wrapper
   - Direct PTY into container
   - Use case: debugging, dev environments

================================================================
5. AUTHENTICATION & AUTHORIZATION
================================================================

USER AUTHENTICATION:
- CAOS user session token validates WS connection
- No separate terminal login required
- Session tokens short-lived, refreshed automatically

SERVER AUTHENTICATION (SSH):
- User uploads SSH private key (encrypted at rest)
- OR: uses SSH agent forwarding (if available)
- OR: password (discouraged, time-limited)

Key storage:
- Encrypted with user's CAOS session key
- Never stored in plaintext
- Destroyed on logout
- Optional: use hardware keys (YubiKey, etc.)

AUTHORIZATION LEVELS:
- Guest: no terminal access
- User: local shell only
- Power User: SSH to whitelisted servers
- Admin: SSH to any server + local shell

================================================================
6. SESSION PERSISTENCE MODEL
================================================================

Each terminal session has:
- UUID (global identifier)
- User ID
- Connection type (local/ssh/container)
- Created timestamp
- Last activity timestamp
- TTL (time-to-live)

Session lifecycle:
1. User opens terminal → creates session
2. Backend spawns PTY + process
3. WebSocket connects to session
4. If WebSocket disconnects:
   - PTY remains alive
   - Output buffered (up to BUFFER_MAX)
5. User reconnects → resumes from last state
6. If idle > TTL → session terminated

TTL RULES:
- Active session: infinite (until user closes)
- Disconnected session: 1 hour (configurable)
- Idle session: 24 hours (configurable)
- Admin override: can force-kill sessions

Buffer limits:
- SCROLLBACK_LINES = 10,000
- MAX_BUFFER_SIZE = 10 MB
- Overflow: oldest lines dropped

================================================================
7. TMUX REPLACEMENT FEATURES
================================================================

NATIVE SPLIT PANES:
- Horizontal split (Ctrl+B, ")
- Vertical split (Ctrl+B, %)
- Navigate panes (Ctrl+B, arrow keys)
- Resize panes (drag divider)
- Close pane (Ctrl+B, x)

TABS:
- New tab (Ctrl+T)
- Switch tabs (Ctrl+Tab, Ctrl+Shift+Tab)
- Close tab (Ctrl+W)
- Rename tab (double-click)

LAYOUTS:
- Preset layouts (grid, columns, rows)
- Save custom layouts
- Restore layouts on session resume

SESSION SHARING:
- Generate shareable link
- Read-only vs. read-write access
- Revokable tokens
- Audit log of viewers

================================================================
8. KEYBOARD SHORTCUTS & BINDINGS
================================================================

TERMINAL OPERATIONS:
- Ctrl+C          → SIGINT (pass to shell)
- Ctrl+D          → EOF / exit
- Ctrl+L          → Clear screen
- Ctrl+Shift+C    → Copy selection
- Ctrl+Shift+V    → Paste
- Ctrl+Shift+F    → Search in scrollback
- Ctrl+Shift+K    → Clear scrollback

NAVIGATION:
- PgUp/PgDn       → Scroll
- Ctrl+Home/End   → Jump to start/end
- Shift+Arrow     → Select text

PANE MANAGEMENT:
- Ctrl+B, "       → Split horizontal
- Ctrl+B, %       → Split vertical
- Ctrl+B, Arrow   → Switch pane
- Ctrl+B, x       → Close pane
- Ctrl+B, z       → Zoom pane (fullscreen toggle)

TAB MANAGEMENT:
- Ctrl+T          → New tab
- Ctrl+W          → Close tab
- Ctrl+Tab        → Next tab
- Ctrl+Shift+Tab  → Previous tab
- Ctrl+1-9        → Jump to tab N

SYSTEM:
- Ctrl+Shift+P    → Command palette
- Ctrl+,          → Settings
- Ctrl+Shift+D    → Toggle developer tools

All vim/emacs bindings pass through to shell.

================================================================
9. FEATURES MATRIX
================================================================

CORE FEATURES (MVP):
✓ WebSocket-based terminal emulator (xterm.js)
✓ SSH connection to remote servers
✓ Session persistence (survive disconnect)
✓ Scrollback buffer
✓ Copy/paste
✓ Resizable window

PHASE 2:
✓ Split panes (horizontal/vertical)
✓ Tabs
✓ Session reconnection
✓ Upload SSH keys
✓ Command history search
✓ Theme customization

PHASE 3:
✓ File transfer (drag-drop upload/download)
✓ Multi-user session sharing
✓ Session recordings
✓ Command autocomplete
✓ Inline file preview (cat image.png shows image)

PHASE 4:
✓ AI command suggestions
✓ Natural language to shell commands
✓ Automatic error diagnosis
✓ Infrastructure-as-code integration
✓ Kubernetes/Docker native support

================================================================
10. BACKEND REQUIREMENTS
================================================================

TECHNOLOGY STACK:
- Language: Node.js / Python / Go (pick one)
- WebSocket: ws (Node) / websockets (Python) / gorilla/websocket (Go)
- PTY: node-pty / pty (Python) / go-pty
- Session store: Redis (fast) + PostgreSQL (persistent)
- SSH client: ssh2 (Node) / paramiko (Python) / crypto/ssh (Go)

DEPENDENCIES:
- Terminal emulator: xterm.js (frontend)
- PTY allocator: OS-level pseudoterminal
- Process supervisor: systemd / supervisord / custom
- Encryption: libsodium / native crypto

ENDPOINTS:
- POST /terminal/session/create
  → Creates new session, returns session_id
  
- WS /terminal/session/{session_id}/attach
  → WebSocket connection to PTY
  
- GET /terminal/session/{session_id}/status
  → Current session state (active/idle/terminated)
  
- POST /terminal/session/{session_id}/resize
  → Update terminal dimensions (rows, cols)
  
- DELETE /terminal/session/{session_id}
  → Force-terminate session
  
- GET /terminal/sessions
  → List user's active sessions
  
- POST /terminal/ssh/keys/upload
  → Store SSH private key (encrypted)
  
- GET /terminal/ssh/keys
  → List available SSH keys (metadata only)

================================================================
11. SECURITY MODEL
================================================================

THREAT MODEL:
- Malicious user executing commands
- Session hijacking
- SSH key theft
- Command injection
- Privilege escalation
- Data exfiltration

MITIGATIONS:

A) AUTHENTICATION:
   - Every WebSocket requires valid CAOS session token
   - Tokens expire, must refresh
   - No anonymous terminal access

B) AUTHORIZATION:
   - User can only access own sessions
   - SSH keys tied to user account
   - Whitelist of allowed remote hosts
   - Rate limiting on connection attempts

C) ENCRYPTION:
   - WebSocket over TLS (WSS)
   - SSH keys encrypted at rest (AES-256)
   - No plaintext key storage
   - Keys stored in secure enclave if available

D) SANDBOXING:
   - Local shells run in chroot/namespace
   - Limited filesystem access
   - No sudo access for unprivileged users
   - Resource limits (CPU, memory, disk I/O)

E) AUDIT LOGGING:
   - All commands logged (optional redaction)
   - Connection events logged
   - Failed auth attempts logged
   - Admin can review logs

F) SESSION SECURITY:
   - Auto-terminate on inactivity
   - Force logout on password change
   - Revoke sessions on security event
   - No session sharing across accounts

================================================================
12. FILE TRANSFER INTEGRATION
================================================================

UPLOAD (Local → Remote):
- Drag file into terminal window
- Backend: base64 encode → transfer → decode
- OR: chunked binary transfer (efficient)
- Progress bar in UI
- Resume on disconnect (optional)

DOWNLOAD (Remote → Local):
- Command: \`caos-download /path/to/file\`
- Backend streams file over WebSocket
- Browser triggers download
- Supports large files (chunked)

INLINE PREVIEW:
- Detect file type in terminal output
- Images: render inline (base64 or fetch)
- Logs: syntax highlight
- JSON: collapsible tree view

SCP REPLACEMENT:
- \`caos-scp user@host:/path /local/path\`
- Backend handles transfer via SSH
- No separate tool needed

================================================================
13. MOBILE CONSIDERATIONS
================================================================

TOUCH SUPPORT:
- Long-press for right-click menu
- Swipe for scrollback
- Pinch-zoom for font size
- Virtual keyboard integration

MOBILE LAYOUT:
- Bottom toolbar (common commands)
- Swipe from edge for settings
- Tab bar at top
- Reduced padding for screen space

BLUETOOTH KEYBOARD:
- Full shortcut support
- Hardware escape key support
- Function keys mapped

================================================================
14. PERFORMANCE REQUIREMENTS
================================================================

LATENCY:
- Local shell: < 10ms input lag
- SSH (same region): < 50ms
- SSH (cross-region): < 200ms
- Acceptable: depends on network

THROUGHPUT:
- Support 10,000+ lines/sec output
- No UI freeze on high-speed cat
- Virtualized scrollback (render viewport only)

CONCURRENCY:
- Support 100+ concurrent sessions per server
- Graceful degradation under load
- Queue connections if at capacity

RESOURCE LIMITS (per session):
- CPU: 10% average, 50% burst
- Memory: 100 MB
- Disk I/O: 10 MB/s
- Network: 10 Mbps

================================================================
15. IMPLEMENTATION PHASES
================================================================

PHASE 1: BASIC SSH TERMINAL (2-3 weeks)
- [ ] xterm.js integration in frontend
- [ ] WebSocket gateway backend
- [ ] SSH connection via backend
- [ ] Basic PTY management
- [ ] Session creation/destruction
- [ ] Single fullscreen terminal

PHASE 2: SESSION PERSISTENCE (1-2 weeks)
- [ ] Redis session store
- [ ] Reconnection logic
- [ ] Session list UI
- [ ] TTL & cleanup jobs
- [ ] Buffer overflow handling

PHASE 3: MULTI-PANE SUPPORT (2 weeks)
- [ ] Split pane UI (ResizablePanel)
- [ ] Multiple PTY sessions per window
- [ ] Pane focus & navigation
- [ ] Keyboard shortcuts
- [ ] Layout persistence

PHASE 4: TABS & LAYOUTS (1 week)
- [ ] Tab UI component
- [ ] Tab switching logic
- [ ] Save/restore layouts
- [ ] Named sessions

PHASE 5: FILE TRANSFER (1-2 weeks)
- [ ] Drag-drop upload
- [ ] File download commands
- [ ] Progress indicators
- [ ] Resume capability

PHASE 6: SECURITY HARDENING (ongoing)
- [ ] SSH key encryption
- [ ] Audit logging
- [ ] Rate limiting
- [ ] Security review

PHASE 7: ADVANCED FEATURES (future)
- [ ] AI command suggestions
- [ ] Session sharing
- [ ] Recording/playback
- [ ] Container support

================================================================
16. BACKEND API SPECIFICATION
================================================================

SESSION LIFECYCLE:

POST /api/terminal/session
Request:
{
  "type": "ssh" | "local" | "container",
  "config": {
    "host": "linode.example.com",      // for SSH
    "port": 22,
    "username": "user",
    "auth_method": "key" | "password",
    "key_id": "key-uuid",              // ref to stored key
    "password": "temp-pass",           // discouraged
    "container_id": "abc123",          // for container
    "shell": "/bin/bash"               // optional
  },
  "dimensions": {
    "rows": 24,
    "cols": 80
  }
}

Response:
{
  "session_id": "sess-uuid-here",
  "status": "active",
  "created_at": "2026-01-17T12:00:00Z",
  "websocket_url": "wss://caos.example.com/ws/terminal/sess-uuid-here"
}

WS /ws/terminal/{session_id}
- Bidirectional data stream
- Client → Server: user input (keystrokes)
- Server → Client: PTY output (stdout/stderr)
- Ping/Pong for keepalive
- Binary mode for efficiency

Messages:
{
  "type": "input",
  "data": "ls -la\n"
}

{
  "type": "output",
  "data": "total 32\ndrwxr-xr-x  5 user user 4096..."
}

{
  "type": "resize",
  "rows": 40,
  "cols": 120
}

{
  "type": "exit",
  "code": 0
}

DELETE /api/terminal/session/{session_id}
- Force-terminate session
- Cleanup PTY
- Close all WebSockets

GET /api/terminal/sessions
Response:
{
  "sessions": [
    {
      "session_id": "sess-uuid-1",
      "type": "ssh",
      "host": "linode.example.com",
      "status": "active",
      "created_at": "2026-01-17T10:00:00Z",
      "last_activity": "2026-01-17T12:30:00Z"
    }
  ]
}

================================================================
17. SSH KEY MANAGEMENT
================================================================

POST /api/terminal/keys/upload
Request (multipart):
- private_key: file (PEM format)
- passphrase: string (optional, for encrypted keys)
- name: string (user-friendly name)

Response:
{
  "key_id": "key-uuid",
  "name": "My Linode Key",
  "fingerprint": "SHA256:abc123...",
  "created_at": "2026-01-17T12:00:00Z"
}

Storage:
- Encrypt private key with user's session key derivative
- Store in database (encrypted blob)
- Associate with user_id

GET /api/terminal/keys
Response:
{
  "keys": [
    {
      "key_id": "key-uuid",
      "name": "My Linode Key",
      "fingerprint": "SHA256:abc123...",
      "created_at": "2026-01-17T12:00:00Z"
    }
  ]
}

DELETE /api/terminal/keys/{key_id}
- Securely delete encrypted key
- Revoke access

================================================================
18. FRONTEND COMPONENT ARCHITECTURE
================================================================

<TerminalWindow>
  <TerminalHeader>
    - Tab bar
    - New tab button
    - Settings button
  </TerminalHeader>
  
  <TerminalBody>
    <PaneContainer layout="horizontal|vertical|grid">
      <TerminalPane session_id="sess-1">
        <XTerm websocket_url="..." />
      </TerminalPane>
      
      <TerminalPane session_id="sess-2">
        <XTerm websocket_url="..." />
      </TerminalPane>
    </PaneContainer>
  </TerminalBody>
  
  <TerminalFooter>
    - Status indicators
    - Quick actions
  </TerminalFooter>
</TerminalWindow>

STATE MANAGEMENT:
- sessions: Map<session_id, SessionState>
- layout: PaneLayout
- active_pane: session_id
- theme: TerminalTheme

HOOKS:
- useTerminalSession(session_id)
  → WebSocket connection, PTY data, status
  
- useTerminalLayout()
  → Pane arrangement, split/close logic
  
- useSSHKeys()
  → Fetch, upload, delete keys

================================================================
19. ERROR HANDLING
================================================================

CONNECTION FAILURES:
- Display: "Failed to connect to {host}"
- Action: Retry button
- Log: Connection attempt details

AUTHENTICATION FAILURES:
- Display: "Authentication failed. Check credentials."
- Action: Re-enter password / select different key
- Log: Auth method attempted

SESSION TIMEOUT:
- Display: "Session expired due to inactivity"
- Action: Start new session
- Log: Session TTL exceeded

NETWORK INTERRUPTION:
- Display: "Connection lost. Reconnecting..."
- Action: Auto-retry with exponential backoff
- Fallback: Manual reconnect button

PERMISSION DENIED:
- Display: "Access denied. Contact administrator."
- Action: Request access form
- Log: Authorization check failed

================================================================
20. MONITORING & OBSERVABILITY
================================================================

METRICS:
- Active sessions (gauge)
- Sessions created/hour (counter)
- Connection latency (histogram)
- Data transferred (counter)
- Errors by type (counter)

LOGS:
- Session lifecycle events
- Authentication attempts
- Command execution (opt-in)
- Errors & exceptions

ALERTS:
- Session limit reached
- High error rate
- Unusual access patterns
- Failed auth attempts spike

DASHBOARDS:
- Real-time session map
- User activity heatmap
- Resource utilization
- Error trends

================================================================
21. CONFIGURATION
================================================================

USER SETTINGS:
- Default shell: bash/zsh/fish
- Font family: monospace fonts
- Font size: 12-24px
- Color scheme: light/dark/custom
- Scrollback lines: 1k-100k
- Bell sound: on/off
- Cursor style: block/underline/bar

ADMIN SETTINGS:
- Max concurrent sessions per user
- Session TTL (idle/disconnected)
- Allowed SSH hosts (whitelist)
- Command logging: on/off
- Resource limits per session

SYSTEM CONFIG:
- WebSocket server port
- Session store (Redis URL)
- Database URL (PostgreSQL)
- Encryption key rotation schedule

================================================================
22. TESTING STRATEGY
================================================================

UNIT TESTS:
- PTY allocation/cleanup
- WebSocket message handling
- Session lifecycle
- Auth/authz logic

INTEGRATION TESTS:
- End-to-end SSH connection
- File upload/download
- Session reconnection
- Multi-pane interaction

LOAD TESTS:
- 100 concurrent sessions
- 1000 messages/sec throughput
- Session churn (create/destroy)

SECURITY TESTS:
- Session hijacking attempts
- Privilege escalation
- Command injection
- Key extraction attempts

================================================================
23. MIGRATION PATH (from existing tools)
================================================================

FROM SSH:
- Import existing ~/.ssh/config
- Upload all keys in ~/.ssh/
- Create sessions for frequent hosts
- Bookmark sessions

FROM TMUX:
- Import tmux layouts → pane configs
- Map tmux shortcuts → CAOS shortcuts
- Convert tmux scripts → CAOS automation

FROM SCREEN:
- Similar to tmux migration
- Session persistence built-in

TRANSITION:
- Run CAOS terminal alongside existing tools
- Gradually migrate workflows
- Deprecate old tools when confident

================================================================
24. FUTURE ENHANCEMENTS
================================================================

AI INTEGRATION:
- Natural language commands
  "show me disk usage" → df -h
  
- Error diagnosis
  "Permission denied" → suggests chmod/chown
  
- Command suggestions
  Based on history + context
  
- Auto-completion
  Filesystem paths, command flags

COLLABORATION:
- Multi-user sessions (Google Docs style)
- Cursor presence indicators
- Chat sidebar
- Session annotations

INFRASTRUCTURE:
- Kubernetes dashboard integration
- Docker container lifecycle
- CI/CD pipeline triggers
- Infrastructure-as-code execution

PRODUCTIVITY:
- Snippets library
- Command history across sessions
- Project-based session groups
- Automated workflows (scripts)

================================================================
25. SUCCESS METRICS
================================================================

USER ADOPTION:
- % of users enabling terminal
- Sessions created per user per week
- Time spent in terminal

FUNCTIONALITY:
- SSH connection success rate > 99%
- Session persistence uptime > 99.9%
- Average reconnection time < 5s

PERFORMANCE:
- P50 latency < 50ms
- P99 latency < 200ms
- Zero data loss incidents

SATISFACTION:
- User rating > 4.5/5
- Net Promoter Score > 50
- Feature request trends

================================================================
26. OPEN QUESTIONS FOR BACKEND TEAM
================================================================

1. Preferred language for terminal server?
   - Node.js (easy WebSocket, node-pty)
   - Python (mature SSH libs, pty module)
   - Go (performance, concurrency)

2. Session store architecture?
   - Redis only (fast, ephemeral)
   - Redis + PostgreSQL (fast + persistent)
   - PostgreSQL only (simpler, slower)

3. SSH key encryption?
   - User password-derived key
   - Hardware security module
   - Server-side master key + user key

4. Horizontal scaling strategy?
   - Sticky sessions (simple)
   - Shared session store (complex)
   - Proxy layer (enterprise)

5. Command logging?
   - Full logging (compliance)
   - Opt-in only (privacy)
   - Redacted logging (balanced)

6. File transfer protocol?
   - Base64 over WebSocket (simple)
   - Binary WebSocket frames (efficient)
   - Separate upload endpoint (HTTP)

================================================================
27. IMMEDIATE NEXT STEPS
================================================================

FRONTEND (YOU):
1. Integrate xterm.js into existing CodeTerminal
2. Create WebSocket connection manager
3. Build session list UI
4. Implement basic SSH connection form
5. Add resize handling

BACKEND (TEAM):
1. Set up WebSocket server (Node.js/Python/Go)
2. Implement PTY allocation (node-pty/pty)
3. Build SSH client wrapper
4. Create session store (Redis)
5. Define API endpoints

DEVOPS:
1. Provision terminal server infrastructure
2. Configure TLS for WebSocket
3. Set up monitoring/logging
4. Implement backup for session data

SECURITY:
1. Review authentication flow
2. Design SSH key encryption
3. Audit logging strategy
4. Penetration testing plan

================================================================
END BLUEPRINT
================================================================

IMPLEMENTATION PRIORITY: HIGH
COMPLEXITY: MEDIUM-HIGH
TIMELINE: 6-8 weeks for full production replacement
MVP: 2-3 weeks for basic SSH terminal

This is a production-grade terminal system, not a toy.
Once implemented, you can fully replace SSH/Tmux/Screen.

Next: Backend team implements WebSocket gateway + PTY manager.
Frontend: Enhance CodeTerminal with split panes + session mgmt.`}
          </pre>
        </div>
      </div>
    </div>
  );
}