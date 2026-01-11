import React from 'react';
import { Database, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export default function FilesystemIsolation() {
  const filesystemContent = `/data/
├── accounts/
│   ├── michael-chambers/          # Account 1
│   │   ├── plane_b/                # SQLite database (authoritative)
│   │   ├── anchor_index/           # Anchor mapping tables
│   │   ├── exports/                # JSONL export files
│   │   ├── metrics/                # Performance metrics
│   │   └── sessions/               # Session-specific data
│   │
│   ├── user_<uuid_1>/             # Account 2
│   │   ├── plane_b/
│   │   ├── anchor_index/
│   │   ├── exports/
│   │   ├── metrics/
│   │   └── sessions/
│   │
│   └── user_<uuid_n>/             # Account N
│       └── ...                     # Fully isolated
│
└── system/                         # Shared system resources
    ├── schemas/                    # Anchor schema definitions
    ├── policies/                   # Access control policies
    ├── evaluators/                 # Validation rules
    └── tooling/                    # Admin utilities

ISOLATION BENEFITS:
• Physical separation: No shared database files between accounts
• Backup isolation: Account data can be backed up independently
• Migration: Entire account can be moved without affecting others
• Deletion: Account removal is a simple directory delete
• Quotas: Filesystem quotas can be enforced per account

IMPLEMENTATION:
Each user account gets a completely isolated directory structure. All data (Plane B, 
indexes, exports, metrics, sessions) are stored in account-specific directories, 
ensuring filesystem-level isolation.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(filesystemContent);
    toast.success('Filesystem structure copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([filesystemContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caos-filesystem-isolation.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded filesystem structure');
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Storage Layer: Filesystem Isolation</h2>
              <p className="text-slate-400 text-sm">Account-Level Directory Structure</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              Download
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[600px] bg-black/30 rounded-lg p-6 border border-slate-700">
          <pre className="text-sm text-green-400 font-mono whitespace-pre">
{filesystemContent}
          </pre>
        </ScrollArea>

        <div className="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <p className="text-cyan-300 text-sm font-semibold mb-2">Key Principle:</p>
          <p className="text-white/70 text-sm">
            Each account is completely isolated at the filesystem level. This provides physical separation,
            independent backups, easy migration, and simple deletion without affecting other accounts.
          </p>
        </div>
      </div>
    </div>
  );
}