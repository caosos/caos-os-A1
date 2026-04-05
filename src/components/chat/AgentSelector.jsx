import React, { useState } from 'react';

const DEFAULT_AGENTS = [
  { id: 'all', name: 'All', color: 'bg-white/20' },
  { id: 'architect', name: 'Architect', color: 'bg-blue-500/20' },
  { id: 'security', name: 'Security', color: 'bg-red-500/20' },
  { id: 'engineer', name: 'Engineer', color: 'bg-green-500/20' },
  { id: 'qa', name: 'QA', color: 'bg-yellow-500/20' },
  { id: 'docs', name: 'Docs', color: 'bg-purple-500/20' },
];

export default function AgentSelector({ multiAgentMode, onSelectionChange }) {
  const [selectedAgents, setSelectedAgents] = useState(['all']);
  const [customAgents, setCustomAgents] = useState(() => {
    const saved = localStorage.getItem('caos_custom_agents');
    return saved ? JSON.parse(saved) : [];
  });

  const agents = [...DEFAULT_AGENTS, ...customAgents];

  const toggleAgent = (agentId) => {
    let next;
    if (agentId === 'all') {
      next = ['all'];
    } else {
      let newSelection = selectedAgents.filter(id => id !== 'all');
      if (newSelection.includes(agentId)) {
        newSelection = newSelection.filter(id => id !== agentId);
      } else {
        newSelection.push(agentId);
      }
      next = newSelection.length === 0 ? ['all'] : newSelection;
    }
    setSelectedAgents(next);
    onSelectionChange?.(next);
  };

  const handleAddAgent = () => {
    const name = prompt('Enter agent name:');
    if (name && name.trim()) {
      const newAgent = {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name: name.trim(),
        color: 'bg-cyan-500/20',
        isCustom: true,
      };
      const updated = [...customAgents, newAgent];
      setCustomAgents(updated);
      localStorage.setItem('caos_custom_agents', JSON.stringify(updated));
    }
  };

  const handleDeleteAgent = (agentId) => {
    const updated = customAgents.filter(a => a.id !== agentId);
    setCustomAgents(updated);
    localStorage.setItem('caos_custom_agents', JSON.stringify(updated));
    const next = selectedAgents.filter(id => id !== agentId);
    const resolved = next.length === 0 ? ['all'] : next;
    setSelectedAgents(resolved);
    onSelectionChange?.(resolved);
  };

  const handleAgentRightClick = (e, agentId) => {
    e.preventDefault();
    if (agentId === 'all') return;
    const agent = agents.find(a => a.id === agentId);
    if (agent?.isCustom) {
      if (confirm(`Delete agent "${agent.name}"?`)) {
        handleDeleteAgent(agentId);
      }
    } else {
      const newRole = prompt('Enter role for this agent:');
      if (newRole && newRole.trim()) {
        const roles = JSON.parse(localStorage.getItem('caos_agent_roles') || '{}');
        roles[agentId] = newRole.trim();
        localStorage.setItem('caos_agent_roles', JSON.stringify(roles));
        alert(`Role updated for ${agentId}: ${newRole.trim()}`);
      }
    }
  };

  if (!multiAgentMode) return null;

  return (
    <div className="mb-2 flex justify-center">
      <div className="flex flex-row flex-wrap gap-2 justify-center">
        {agents.map(agent => (
          <button
            key={agent.id}
            type="button"
            onClick={() => toggleAgent(agent.id)}
            onContextMenu={(e) => handleAgentRightClick(e, agent.id)}
            className={`px-3 py-1.5 rounded text-xs text-white/80 transition-all whitespace-nowrap ${
              selectedAgents.includes(agent.id) || (selectedAgents.includes('all') && agent.id === 'all')
                ? agent.color + ' border border-white/30'
                : 'bg-white/5 border border-white/10 opacity-50'
            }`}
          >
            {agent.name}
          </button>
        ))}
        <button
          type="button"
          onClick={handleAddAgent}
          className="px-3 py-1.5 rounded text-xs text-white/80 bg-white/5 border border-white/20 hover:bg-white/10 transition-all whitespace-nowrap"
        >
          + Add
        </button>
      </div>
    </div>
  );
}