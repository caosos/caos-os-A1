import React, { useState } from 'react';
import { Terminal, AlertCircle } from 'lucide-react';

export default function SSHConsole() {
  const [sshConfig, setSshConfig] = useState({
    host: '',
    port: '22',
    username: '',
    privateKey: '',
    passphrase: ''
  });
  const [sshConnected, setSshConnected] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');

  const handleConnect = async () => {
    if (!sshConfig.host || !sshConfig.username || !sshConfig.privateKey) {
      alert('Please fill in host, username, and private key');
      return;
    }

    try {
      // TODO: Connect to CAOS backend SSH bridge
      // const ws = new WebSocket(`wss://your-caos-server/api/ssh/terminal`);
      // ws.send(JSON.stringify({ type: 'connect', config: sshConfig }));
      
      alert(
        'SSH bridge endpoint not yet implemented on backend.\n\n' +
        'Required backend implementation:\n' +
        '1. POST /api/ssh/connect - Establish SSH connection\n' +
        '2. WebSocket /api/ssh/terminal - Terminal I/O stream\n' +
        '3. Uses ssh2 library to proxy SSH protocol\n\n' +
        'Security: Keys never stored on server, only used for SSH handshake.'
      );
      
      // Mock connection for UI demonstration
      // setSshConnected(true);
      // setTerminalOutput([
      //   `Connecting to ${sshConfig.username}@${sshConfig.host}:${sshConfig.port}...`,
      //   'Connection established.',
      //   `Welcome to ${sshConfig.host}`,
      //   ''
      // ]);
    } catch (error) {
      console.error('SSH connection failed:', error);
      alert('Connection failed: ' + error.message);
    }
  };

  const handleCommand = (e) => {
    if (e.key === 'Enter' && currentCommand.trim()) {
      // TODO: Send command via WebSocket
      setTerminalOutput([...terminalOutput, `$ ${currentCommand}`, '']);
      setCurrentCommand('');
    }
  };

  if (sshConnected) {
    return (
      <div className="bg-black/90 border border-white/10 rounded-lg p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
          <div className="text-green-400 text-sm font-mono">
            {sshConfig.username}@{sshConfig.host}:{sshConfig.port}
          </div>
          <button
            onClick={() => {
              setSshConnected(false);
              setTerminalOutput([]);
            }}
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Disconnect
          </button>
        </div>
        
        <div className="flex-1 font-mono text-sm text-green-400 overflow-auto mb-3">
          {terminalOutput.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div className="flex">
            <span className="text-green-400 mr-2">$</span>
            <input
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleCommand}
              className="flex-1 bg-transparent outline-none text-green-400"
              autoFocus
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-green-400" />
        SSH Connection
      </h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-sm mb-1 block">Host / IP</label>
            <input
              type="text"
              value={sshConfig.host}
              onChange={(e) => setSshConfig({...sshConfig, host: e.target.value})}
              placeholder="192.168.1.100 or example.com"
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1 block">Port</label>
            <input
              type="text"
              value={sshConfig.port}
              onChange={(e) => setSshConfig({...sshConfig, port: e.target.value})}
              placeholder="22"
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="text-white/60 text-sm mb-1 block">Username</label>
          <input
            type="text"
            value={sshConfig.username}
            onChange={(e) => setSshConfig({...sshConfig, username: e.target.value})}
            placeholder="root"
            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        
        <div>
          <label className="text-white/60 text-sm mb-1 block">
            Private Key (ed25519 / RSA)
          </label>
          <textarea
            value={sshConfig.privateKey}
            onChange={(e) => setSshConfig({...sshConfig, privateKey: e.target.value})}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
            rows={6}
            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm font-mono"
          />
        </div>
        
        <div>
          <label className="text-white/60 text-sm mb-1 block">
            Passphrase (optional)
          </label>
          <input
            type="password"
            value={sshConfig.passphrase}
            onChange={(e) => setSshConfig({...sshConfig, passphrase: e.target.value})}
            placeholder="••••••••"
            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        
        <div className="bg-blue-900/20 border border-blue-600/50 rounded p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <strong>Security:</strong> Private keys are processed client-side only. 
              They are transmitted exclusively via encrypted SSH handshake protocol. 
              Keys are never stored on any server.
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-300">
              <strong>Backend Required:</strong> This feature requires an SSH bridge 
              endpoint on your CAOS backend server (WebSocket-to-SSH proxy using ssh2 library).
            </div>
          </div>
        </div>
        
        <button
          onClick={handleConnect}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors font-medium"
        >
          Connect via SSH
        </button>
      </div>
    </div>
  );
}