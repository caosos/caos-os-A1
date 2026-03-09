import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const CHUNK = 60000;

async function proxyCall(fn, payload) {
    const res = await base44.functions.invoke('core/repoProxy', { fn, payload });
    if (!res?.data?.ok) throw new Error(res?.data?.error || 'Proxy error');
    return res.data.result;
}

function TreeNode({ item, onSelect, selectedPath, depth = 0 }) {
    const [open, setOpen] = useState(false);
    const [children, setChildren] = useState(null);
    const [loading, setLoading] = useState(false);
    const isDir = item.type === 'dir';
    const isSelected = selectedPath === item.path;

    async function toggle() {
        if (!isDir) { onSelect(item); return; }
        if (!open && !children) {
            setLoading(true);
            try {
                const result = await proxyCall('core/repoList', { path: item.path });
                setChildren(result?.items || []);
            } catch { setChildren([]); }
            setLoading(false);
        }
        setOpen(v => !v);
    }

    return (
        <div>
            <button
                onClick={toggle}
                className={`flex items-center gap-1 w-full text-left px-2 py-0.5 rounded text-sm hover:bg-zinc-700 transition-colors ${isSelected ? 'bg-zinc-600 text-white' : 'text-zinc-300'}`}
                style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
                {isDir
                    ? (open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />)
                    : <span className="w-3 h-3 shrink-0" />}
                {isDir
                    ? (open ? <FolderOpen className="w-4 h-4 shrink-0 text-yellow-400" /> : <Folder className="w-4 h-4 shrink-0 text-yellow-400" />)
                    : <File className="w-4 h-4 shrink-0 text-blue-400" />}
                <span className="truncate">{item.name}</span>
                {loading && <Loader2 className="w-3 h-3 ml-auto animate-spin" />}
            </button>
            {open && children && (
                <div>
                    {children.map(c => (
                        <TreeNode key={c.path} item={c} onSelect={onSelect} selectedPath={selectedPath} depth={depth + 1} />
                    ))}
                    {children.length === 0 && (
                        <p className="text-xs text-zinc-500 pl-10 py-0.5">empty</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function RepoBrowser() {
    const [root, setRoot] = useState(null);
    const [rootLoading, setRootLoading] = useState(false);
    const [rootError, setRootError] = useState(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [fileLoading, setFileLoading] = useState(false);
    const [fileError, setFileError] = useState(null);
    const [offset, setOffset] = useState(0);
    const [done, setDone] = useState(false);
    const [totalBytes, setTotalBytes] = useState(null);

    async function loadRoot() {
        setRootLoading(true);
        setRootError(null);
        try {
            const result = await proxyCall('core/repoList', { path: '' });
            setRoot(result?.items || []);
        } catch (e) {
            setRootError(e.message);
        }
        setRootLoading(false);
    }

    const loadFile = useCallback(async (file, newOffset = 0) => {
        setSelectedFile(file);
        setFileLoading(true);
        setFileError(null);
        if (newOffset === 0) { setFileContent(''); setDone(false); setTotalBytes(null); }
        try {
            const result = await proxyCall('core/repoReadChunked', {
                path: file.path,
                offset: newOffset,
                max_bytes: CHUNK
            });
            const chunk = result?.content || '';
            setFileContent(prev => newOffset === 0 ? chunk : prev + chunk);
            setOffset(newOffset + chunk.length);
            setDone(result?.done ?? true);
            if (result?.total_bytes) setTotalBytes(result.total_bytes);
        } catch (e) {
            setFileError(e.message);
        }
        setFileLoading(false);
    }, []);

    function onSelect(item) {
        if (item.type === 'dir') return;
        loadFile(item, 0);
    }

    return (
        <div className="flex h-full bg-zinc-900 text-zinc-200 rounded-lg overflow-hidden border border-zinc-700">
            {/* Tree panel */}
            <div className="w-64 shrink-0 border-r border-zinc-700 flex flex-col">
                <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Repo</span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-zinc-400 hover:text-white px-2" onClick={loadRoot} disabled={rootLoading}>
                        {rootLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : root ? 'Refresh' : 'Load'}
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    {rootError && (
                        <div className="p-3 text-xs text-red-400 flex gap-1"><AlertCircle className="w-3 h-3 mt-0.5" />{rootError}</div>
                    )}
                    {root && root.map(item => (
                        <TreeNode key={item.path} item={item} onSelect={onSelect} selectedPath={selectedFile?.path} depth={0} />
                    ))}
                    {!root && !rootLoading && !rootError && (
                        <p className="text-xs text-zinc-500 p-3">Click Load to explore the repo.</p>
                    )}
                </ScrollArea>
            </div>

            {/* File viewer */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedFile ? (
                    <>
                        <div className="px-4 py-2 border-b border-zinc-700 flex items-center justify-between gap-2 shrink-0">
                            <span className="text-xs text-zinc-400 truncate font-mono">{selectedFile.path}</span>
                            {totalBytes && (
                                <span className="text-xs text-zinc-500 shrink-0">{offset.toLocaleString()} / {totalBytes.toLocaleString()} bytes</span>
                            )}
                        </div>
                        <ScrollArea className="flex-1">
                            {fileError && (
                                <div className="p-4 text-sm text-red-400 flex gap-2"><AlertCircle className="w-4 h-4" />{fileError}</div>
                            )}
                            <pre className="p-4 text-xs font-mono text-zinc-200 whitespace-pre-wrap break-all leading-relaxed">
                                {fileContent || (fileLoading ? '' : '(empty)')}
                            </pre>
                            {fileLoading && (
                                <div className="flex items-center gap-2 p-4 text-xs text-zinc-400">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                                </div>
                            )}
                        </ScrollArea>
                        {!done && !fileLoading && (
                            <div className="p-3 border-t border-zinc-700 shrink-0">
                                <Button size="sm" variant="outline" className="text-xs border-zinc-600 text-zinc-300 hover:text-white" onClick={() => loadFile(selectedFile, offset)}>
                                    <ChevronRight className="w-3 h-3 mr-1" /> Next chunk
                                </Button>
                            </div>
                        )}
                        {done && fileContent && (
                            <div className="px-4 py-2 border-t border-zinc-700 shrink-0 text-xs text-zinc-500">
                                End of file
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                        Select a file from the tree
                    </div>
                )}
            </div>
        </div>
    );
}