import React, { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";

export default function UIDocumentation() {
  const [searchTerm, setSearchTerm] = useState('');

  const docs = {
    overview: {
      title: "Application Overview",
      content: `
**App Name:** CAOS (Conversational AI Operating System)
**Framework:** React 18 + Base44 Platform
**Styling:** Tailwind CSS + Framer Motion

**Core Purpose:** Chat interface for CAOS AI with multi-turn conversations, file uploads, reactions, threaded replies, and developer tooling.
      `
    },
    pages: {
      title: "Pages & Routing",
      sections: [
        {
          name: "Welcome Page",
          route: "/",
          elements: [
            "Animated title: 'CAOS'",
            "Subtitle: 'Conversational AI Operating System'",
            "'Get Started' button → navigates to /Chat",
            "Starfield background animation",
            "Gradient glow effect"
          ]
        },
        {
          name: "Chat Page",
          route: "/Chat",
          elements: [
            "Header (user menu, new thread, threads list)",
            "Message area (scrollable chat history)",
            "Input bar (text, voice, files, read aloud, send)",
            "Side panels (threads, profile)",
            "Optional: Developer terminal (split view 50/50)"
          ]
        }
      ]
    },
    header: {
      title: "Header Components",
      sections: [
        {
          name: "Left Section",
          items: ["User avatar (gradient circle)", "Username", "Dropdown menu trigger"]
        },
        {
          name: "Center Section",
          items: ["'CAOS' branding", "Tagline", "Current conversation title"]
        },
        {
          name: "Right Section",
          items: ["New thread button (Plus icon)", "Threads list button (MessageSquare icon)"]
        },
        {
          name: "User Dropdown Menu",
          items: [
            "New Thread - Creates new conversation",
            "Previous Threads - Opens ThreadList panel",
            "Profile - Opens ProfilePanel",
            "Log Out - Clears data, reloads page"
          ]
        }
      ]
    },
    input: {
      title: "Input System (ChatInput)",
      layout: "🎤 | Text Area | ➕ | 🔊 | Send",
      buttons: [
        {
          name: "Voice Input (🎤)",
          position: "Left",
          states: ["Default (white/70)", "Recording (red, pulsing)", "Disabled (loading)"],
          features: [
            "Web Speech API (webkit/standard)",
            "Real-time transcription",
            "Continuous recording mode",
            "Auto-stops on send"
          ]
        },
        {
          name: "Text Area",
          position: "Center",
          features: [
            "Auto-expanding (24px min, 120px max)",
            "Multi-line support",
            "Scrollable when exceeds max",
            "Disabled during loading",
            "Placeholder: 'Type a message...'"
          ]
        },
        {
          name: "File Attachment (➕)",
          position: "Center-Right",
          features: [
            "Multiple file selection",
            "Supported: image/*, pdf, doc, docx, txt",
            "Uploads via base44.integrations.Core.UploadFile()",
            "Shows as chips above input",
            "Text files: content embedded",
            "Images: marked for vision analysis",
            "Documents: marked for extraction"
          ]
        },
        {
          name: "Read Aloud (🔊)",
          position: "Right",
          features: [
            "Reads last assistant message",
            "Web Speech Synthesis API",
            "Toggle on/off",
            "Disabled if no message"
          ]
        },
        {
          name: "Send",
          position: "Far Right",
          states: [
            "Enabled (blue)",
            "Disabled (no text + no files, or loading)",
            "Loading (spinner)"
          ]
        }
      ]
    },
    messages: {
      title: "Message Display (ChatBubble)",
      types: [
        {
          name: "User Messages",
          alignment: "Right",
          styling: "Blue background, white text, rounded corners (cut bottom-right)",
          content: ["Message text", "File attachments", "Timestamp"]
        },
        {
          name: "Assistant Messages",
          alignment: "Left",
          styling: "White/10 background, border, avatar with pulsing dot",
          content: [
            "'CAOS' label in blue",
            "Text content",
            "YouTube embeds (detects [YOUTUBE:url])",
            "File attachments (images inline, others as download links)",
            "Downloadable code files (from ```filename:name blocks)",
            "Timestamp",
            "Reactions (emoji pills)",
            "Threaded replies (indented with blue border)"
          ]
        },
        {
          name: "Typing Indicator",
          show: "When isLoading = true",
          display: "Avatar + three bouncing dots (0ms, 150ms, 300ms delays)"
        }
      ]
    },
    textSelection: {
      title: "Text Selection Features",
      trigger: "Right-click on assistant message text",
      menu: [
        {
          section: "Reactions",
          emojis: "😊 👍 ❤️ 🎉 🤔 😮",
          behavior: "Adds reaction, calls AI for acknowledgment"
        },
        {
          section: "Read Aloud",
          icon: "Volume2",
          behavior: "Reads selected text using Speech Synthesis"
        },
        {
          section: "Reply",
          icon: "MessageCircle",
          behavior: "Shows textarea, sends to AI, creates threaded reply"
        },
        {
          section: "Copy",
          icon: "Copy",
          behavior: "Copies to clipboard, shows toast"
        }
      ],
      positioning: "Above/below selection, avoids edges and input bar",
      closing: ["Click outside", "Start typing", "After action completes"],
      draggable: true
    },
    threads: {
      title: "Thread Management (ThreadList)",
      trigger: "Click 'Previous Threads' in header",
      type: "Slide-in panel from right",
      threadItem: [
        "MessageSquare icon",
        "Conversation title (editable)",
        "Last message preview (100 chars)",
        "Timestamp (formatted with moment.js)",
        "Edit button (pencil) - converts to input",
        "Delete button (trash) - removes thread + messages"
      ],
      interactions: [
        "Click thread → loads conversation, closes panel, triggers session resume",
        "Edit → inline editing with checkmark confirm",
        "Delete → removes from DB and local state"
      ],
      states: [
        "Default (white/10)",
        "Hover (white/20)",
        "Selected (blue/20 with border)"
      ]
    },
    profile: {
      title: "Profile & Settings (ProfilePanel)",
      trigger: "Click 'Profile' in header",
      sections: [
        {
          name: "User Information",
          display: ["Avatar (gradient with initials)", "Full name", "Email"]
        },
        {
          name: "Settings - Remember Conversations",
          type: "Toggle",
          default: "ON",
          storage: "caos_remember_conversations",
          effect: "Controls memory_gate in API requests (allows/blocks cross-session recall)"
        },
        {
          name: "Settings - Developer Mode",
          type: "Toggle",
          default: "OFF",
          storage: "caos_developer_mode",
          effect: "Shows split-screen with CodeTerminal (requires page reload)"
        }
      ]
    },
    terminal: {
      title: "Developer Terminal (CodeTerminal)",
      location: "Right half of screen when Dev Mode ON",
      layout: [
        "Header: Language dropdown (JS/Python/Bash), Settings, Close",
        "Monaco Code Editor (syntax highlighting, IntelliSense, autocomplete)",
        "Control buttons: Run, Connect/Disconnect, Send Command",
        "Output panel (128px, monospace green text on black)"
      ],
      features: [
        {
          name: "Run Button",
          behavior: "Executes JavaScript in browser, captures console.log"
        },
        {
          name: "Connect Button",
          behavior: "Opens WebSocket to terminal server (ws://localhost:8765 default)"
        },
        {
          name: "Send Command",
          behavior: "Prompts for command, sends via WebSocket"
        },
        {
          name: "Settings",
          behavior: "Modal to configure WebSocket URL"
        },
        {
          name: "Close",
          behavior: "Disables dev mode, reloads page"
        }
      ]
    },
    visual: {
      title: "Visual Elements",
      components: [
        {
          name: "StarfieldBackground",
          details: "200 twinkling stars, gradient background, 60fps animation, auto-resizes"
        },
        {
          name: "WelcomeGreeting",
          shows: "When no messages and not loading",
          content: "Random greeting from 7 predefined messages"
        },
        {
          name: "Loading States",
          types: [
            "Full page: 'Loading...' on starfield",
            "Message: Typing indicator with bouncing dots",
            "File upload: Spinner in button"
          ]
        }
      ]
    },
    dataFlow: {
      title: "Data Flow & State",
      flows: [
        {
          name: "User Registration",
          steps: [
            "Check localStorage for 'caos_user'",
            "If not found → show registration form",
            "On submit → save to localStorage, load conversations"
          ]
        },
        {
          name: "Create New Thread",
          steps: [
            "Click 'New Thread'",
            "Create Conversation entity (title, created_by, timestamp)",
            "Set as current, save ID to localStorage"
          ]
        },
        {
          name: "Send Message",
          steps: [
            "Create user message entity",
            "Add to local state",
            "POST /api/message (message, session, memory_gate, files)",
            "Receive AI response",
            "Verify session ID matches (CAOS-A1)",
            "Create assistant message entity",
            "Update conversation preview"
          ]
        },
        {
          name: "File Upload",
          steps: [
            "Upload via base44.integrations.Core.UploadFile()",
            "Determine type (text/image/document/other)",
            "Read text files, add vision/extraction instructions",
            "Build file_metadata array per CAOS-A1",
            "Include in API request"
          ]
        },
        {
          name: "Session Resume",
          steps: [
            "Select previous thread",
            "Set as current, save to localStorage",
            "Send __SESSION_RESUME__ handshake with thread_meta"
          ]
        }
      ]
    },
    storage: {
      title: "Local Storage",
      keys: [
        {
          name: "caos_user",
          type: "JSON {full_name, email}",
          purpose: "Persist user across sessions"
        },
        {
          name: "caos_last_conversation",
          type: "String (conversation ID)",
          purpose: "Restore last active conversation"
        },
        {
          name: "caos_remember_conversations",
          type: "String ('true'/'false')",
          default: "true",
          purpose: "Memory preference for API requests"
        },
        {
          name: "caos_developer_mode",
          type: "String ('true'/'false')",
          default: "false",
          purpose: "Show/hide terminal (requires reload)"
        },
        {
          name: "caos_terminal_ws",
          type: "String (WebSocket URL)",
          default: "ws://localhost:8765",
          purpose: "Terminal connection endpoint"
        }
      ]
    },
    api: {
      title: "API Integration",
      endpoint: "https://nonextractive-son-ichnographical.ngrok-free.dev/api/message",
      method: "POST",
      timeout: "60 seconds",
      request: {
        message: "User message with file context",
        session: "Conversation ID",
        memory_gate: {
          allowed: "boolean",
          scope: "'session'",
          explicit_recall: "boolean",
          reason: "string"
        },
        files: "[{id, type, mime, url, name, bytes}]",
        type: "Optional '__SESSION_RESUME__'",
        thread_meta: "Optional {title, created_ts, last_ts}"
      },
      response: {
        reply: "AI response",
        session: "Must match request (verified)"
      },
      errors: [
        "Network: 'Cannot reach CAOS server'",
        "Timeout: 'Request timed out after 60 seconds'",
        "Server: 'Server error. Message may be too large'",
        "Mismatch: 'Session mismatch detected'"
      ]
    },
    entities: {
      title: "Database Entities",
      conversation: {
        fields: ["id (auto)", "created_date (auto)", "updated_date (auto)", "created_by (auto)", "title", "last_message_preview", "last_message_time"]
      },
      message: {
        fields: ["id (auto)", "created_date (auto)", "updated_date (auto)", "created_by (auto)", "conversation_id (required)", "role: 'user'|'assistant' (required)", "content (required)", "file_urls (optional)", "timestamp (optional)", "reactions (optional)", "replies (optional)"]
      }
    }
  };

  const filteredSections = Object.entries(docs).filter(([key, section]) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const sectionString = JSON.stringify(section).toLowerCase();
    return sectionString.includes(term);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#1a2744] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">CAOS Frontend UI Documentation</h1>
          </div>
          <p className="text-white/70 text-lg">Complete reference for all UI components, features, and interactions</p>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
          <Input
            type="text"
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 h-12"
          />
        </div>

        {/* Content */}
        <div className="space-y-6">
          {filteredSections.map(([key, section]) => (
            <div key={key} className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-blue-300 mb-4">{section.title}</h2>
              
              {section.content && (
                <pre className="text-white/80 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {section.content}
                </pre>
              )}

              {section.sections && (
                <div className="space-y-4">
                  {section.sections.map((subsection, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">
                        {subsection.name}
                        {subsection.route && <span className="text-blue-400 ml-2 text-sm">({subsection.route})</span>}
                      </h3>
                      {subsection.elements && (
                        <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                          {subsection.elements.map((el, i) => <li key={i}>{el}</li>)}
                        </ul>
                      )}
                      {subsection.items && (
                        <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                          {subsection.items.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.layout && (
                <div className="bg-black/30 rounded-lg p-4 mb-4 font-mono text-green-400">
                  {section.layout}
                </div>
              )}

              {section.buttons && (
                <div className="space-y-4">
                  {section.buttons.map((btn, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">
                        {btn.name} <span className="text-sm text-white/50">({btn.position})</span>
                      </h3>
                      {btn.states && (
                        <div className="mb-2">
                          <p className="text-sm text-white/60 mb-1">States:</p>
                          <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                            {btn.states.map((state, i) => <li key={i}>{state}</li>)}
                          </ul>
                        </div>
                      )}
                      {btn.features && (
                        <div>
                          <p className="text-sm text-white/60 mb-1">Features:</p>
                          <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                            {btn.features.map((feat, i) => <li key={i}>{feat}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.types && (
                <div className="space-y-4">
                  {section.types.map((type, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">{type.name}</h3>
                      {type.alignment && <p className="text-sm text-white/60 mb-2">Alignment: {type.alignment}</p>}
                      {type.styling && <p className="text-sm text-white/60 mb-2">Styling: {type.styling}</p>}
                      {type.show && <p className="text-sm text-white/60 mb-2">Show: {type.show}</p>}
                      {type.display && <p className="text-sm text-white/60 mb-2">Display: {type.display}</p>}
                      {type.content && (
                        <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                          {type.content.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.trigger && (
                <div className="space-y-3">
                  <p className="text-white/80"><span className="font-semibold">Trigger:</span> {section.trigger}</p>
                  {section.type && <p className="text-white/80"><span className="font-semibold">Type:</span> {section.type}</p>}
                  {section.menu && (
                    <div className="space-y-2">
                      {section.menu.map((item, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3">
                          <h4 className="text-white font-medium mb-1">{item.section}</h4>
                          {item.emojis && <p className="text-white/70 text-sm mb-1">Emojis: {item.emojis}</p>}
                          {item.icon && <p className="text-white/70 text-sm mb-1">Icon: {item.icon}</p>}
                          {item.behavior && <p className="text-white/70 text-sm">{item.behavior}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {section.positioning && <p className="text-white/70 text-sm">Positioning: {section.positioning}</p>}
                  {section.closing && (
                    <p className="text-white/70 text-sm">Closes on: {section.closing.join(', ')}</p>
                  )}
                  {section.draggable !== undefined && <p className="text-white/70 text-sm">Draggable: {section.draggable ? 'Yes' : 'No'}</p>}
                  {section.threadItem && (
                    <div>
                      <p className="text-white font-medium mb-2">Thread Item Elements:</p>
                      <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                        {section.threadItem.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {section.interactions && (
                    <div className="mt-2">
                      <p className="text-white font-medium mb-2">Interactions:</p>
                      <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                        {section.interactions.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {section.states && (
                    <div className="mt-2">
                      <p className="text-white font-medium mb-2">States:</p>
                      <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                        {section.states.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {section.location && (
                <div className="space-y-3">
                  <p className="text-white/80 mb-3"><span className="font-semibold">Location:</span> {section.location}</p>
                  {section.layout && (
                    <div>
                      <p className="text-white font-medium mb-2">Layout:</p>
                      <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                        {section.layout.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {section.features && (
                    <div className="space-y-2 mt-3">
                      <p className="text-white font-medium">Features:</p>
                      {section.features.map((feat, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3">
                          <h4 className="text-white font-medium mb-1">{feat.name}</h4>
                          <p className="text-white/70 text-sm">{feat.behavior}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section.components && (
                <div className="space-y-3">
                  {section.components.map((comp, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">{comp.name}</h3>
                      {comp.details && <p className="text-white/70 text-sm mb-2">{comp.details}</p>}
                      {comp.shows && <p className="text-white/70 text-sm mb-2"><span className="font-medium">Shows:</span> {comp.shows}</p>}
                      {comp.content && <p className="text-white/70 text-sm mb-2"><span className="font-medium">Content:</span> {comp.content}</p>}
                      {comp.types && (
                        <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                          {comp.types.map((type, i) => <li key={i}>{type}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.flows && (
                <div className="space-y-3">
                  {section.flows.map((flow, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">{flow.name}</h3>
                      <ol className="list-decimal list-inside space-y-1 text-white/70 text-sm">
                        {flow.steps.map((step, i) => <li key={i}>{step}</li>)}
                      </ol>
                    </div>
                  ))}
                </div>
              )}

              {section.keys && (
                <div className="space-y-3">
                  {section.keys.map((key, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-2">{key.name}</h3>
                      <p className="text-sm text-white/70 mb-1"><span className="font-medium">Type:</span> {key.type}</p>
                      {key.default && <p className="text-sm text-white/70 mb-1"><span className="font-medium">Default:</span> {key.default}</p>}
                      <p className="text-sm text-white/70"><span className="font-medium">Purpose:</span> {key.purpose}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.endpoint && (
                <div className="space-y-3">
                  <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-400">
                    <p><span className="text-white/60">POST</span> {section.endpoint}</p>
                    <p className="text-white/60">Timeout: {section.timeout}</p>
                  </div>
                  {section.request && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Request Body:</h3>
                      <pre className="text-white/70 text-xs overflow-auto">
                        {JSON.stringify(section.request, null, 2)}
                      </pre>
                    </div>
                  )}
                  {section.response && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Response:</h3>
                      <pre className="text-white/70 text-xs overflow-auto">
                        {JSON.stringify(section.response, null, 2)}
                      </pre>
                    </div>
                  )}
                  {section.errors && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Error Messages:</h3>
                      <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                        {section.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {section.conversation && (
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-2">Conversation Entity:</h3>
                    <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                      {section.conversation.fields.map((field, i) => <li key={i}>{field}</li>)}
                    </ul>
                  </div>
                  {section.message && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Message Entity:</h3>
                      <ul className="list-disc list-inside space-y-1 text-white/70 text-sm">
                        {section.message.fields.map((field, i) => <li key={i}>{field}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/50 text-lg">No results found for "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
}