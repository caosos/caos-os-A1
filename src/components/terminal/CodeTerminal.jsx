import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Terminal, Settings, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

export default function CodeTerminal({ onClose }) {
  const [code, setCode] = useState('// Write your code here\nconsole.log("Hello from CAOS Terminal");');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const wsRef = useRef(null);

  const runCode = () => {
    if (language === 'javascript') {
      try {
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));
        
        eval(code);
        
        console.log = originalLog;
        setOutput(logs.join('\n') || 'Code executed successfully (no output)');
      } catch (error) {
        setOutput(`Error: ${error.message}`);
      }
    } else {
      setOutput('Language not yet supported for browser execution');
    }
  };

  const connectToTerminal = () => {
    const wsUrl = localStorage.getItem('caos_terminal_ws') || 'ws://localhost:8765';
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setOutput('✅ Connected to terminal server\n');
        toast.success('Connected to terminal');
      };
      
      ws.onmessage = (event) => {
        setOutput(prev => prev + event.data);
      };
      
      ws.onerror = (error) => {
        setOutput(prev => prev + '\n❌ Connection error\n');
        toast.error('Failed to connect to terminal');
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setOutput(prev => prev + '\n⚠️ Disconnected from terminal\n');
      };
      
      wsRef.current = ws;
    } catch (error) {
      toast.error('Invalid WebSocket URL');
    }
  };

  const sendCommand = (command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(command + '\n');
      setOutput(prev => prev + `$ ${command}\n`);
    } else {
      toast.error('Not connected to terminal');
    }
  };

  const disconnectTerminal = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const saveSettings = (wsUrl) => {
    localStorage.setItem('caos_terminal_ws', wsUrl);
    toast.success('Settings saved');
    setShowSettings(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#1a2744]/95 backdrop-blur-xl border-l border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium text-sm">Developer Terminal</span>
          {isConnected && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-xs"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="bash">Bash</option>
          </select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings(true)}
            className="h-7 px-2 text-white/70 hover:text-white"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 px-2 text-white/70 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={setCode}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-white/10">
        <Button
          size="sm"
          onClick={runCode}
          className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
        >
          <Play className="w-3 h-3 mr-1" />
          Run
        </Button>
        <Button
          size="sm"
          onClick={isConnected ? disconnectTerminal : connectToTerminal}
          className={`${isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white h-7 px-3`}
        >
          <Terminal className="w-3 h-3 mr-1" />
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            const command = prompt('Enter command:');
            if (command) sendCommand(command);
          }}
          disabled={!isConnected}
          className="bg-white/10 hover:bg-white/20 text-white h-7 px-3 disabled:opacity-30"
        >
          Send Command
        </Button>
      </div>

      {/* Output */}
      <div className="h-32 bg-black/30 border-t border-white/10 p-3 overflow-auto">
        <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
          {output || '// Output will appear here'}
        </pre>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a2744] border border-white/20 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white font-semibold mb-4">Terminal Connection Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="text-white/70 text-sm block mb-1">WebSocket URL</label>
                <input
                  type="text"
                  defaultValue={localStorage.getItem('caos_terminal_ws') || 'ws://localhost:8765'}
                  id="ws-url-input"
                  placeholder="ws://localhost:8765"
                  className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <p className="text-white/50 text-xs">
                Connect to your local terminal server or remote machine. 
                You'll need a WebSocket server that can execute commands.
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => {
                  const url = document.getElementById('ws-url-input').value;
                  saveSettings(url);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowSettings(false)}
                className="flex-1 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}