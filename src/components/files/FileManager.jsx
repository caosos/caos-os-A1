import React, { useState, useEffect } from 'react';
import { FileText, Image, Upload, Trash2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function FileManager({ user, viewType = 'files' }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [viewType]);

  const loadFiles = async () => {
    try {
      const filter = { created_by: user.email, folder_path: '/' };
      
      if (viewType === 'photos') {
        filter.type = 'photo';
      } else if (viewType === 'files') {
        filter.type = 'file';
      }

      const userFiles = await base44.entities.UserFile.filter(filter, '-created_date', 1000);
      setFiles(userFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      const type = file.type.startsWith('image/') ? 'photo' : 'file';
      
      await base44.entities.UserFile.create({
        name: file.name,
        url: result.file_url,
        type: type,
        folder_path: '/',
        size: file.size,
        mime_type: file.type
      });

      toast.success('File uploaded');
      loadFiles();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Delete this file?')) return;
    
    try {
      await base44.entities.UserFile.delete(fileId);
      toast.success('File deleted');
      loadFiles();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Delete failed');
    }
  };

  const createFolder = async () => {
    const name = prompt('Folder name:');
    if (!name) return;

    try {
      await base44.entities.UserFile.create({
        name: name,
        type: 'folder',
        folder_path: currentPath
      });
      toast.success('Folder created');
      loadFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const openFolder = (folder) => {
    setCurrentPath(`${currentPath === '/' ? '' : currentPath}/${folder.name}`);
  };

  const goBack = () => {
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    setCurrentPath('/' + parts.join('/'));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          {currentPath !== '/' && (
            <button
              onClick={goBack}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
          )}
          <span className="text-white text-sm font-mono">{currentPath || '/'}</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={createFolder}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            New Folder
          </button>
          <label className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors cursor-pointer flex items-center gap-2">
            <Upload className="w-3 h-3" />
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* File Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => file.type === 'folder' ? openFolder(file) : null}
            >
              <div className="flex flex-col items-center gap-2">
                {file.type === 'folder' && <Folder className="w-10 h-10 text-blue-400" />}
                {file.type === 'photo' && file.url && (
                  <img src={file.url} alt={file.name} className="w-full h-20 object-cover rounded" />
                )}
                {file.type === 'file' && <FileText className="w-10 h-10 text-white/70" />}
                
                <span className="text-white text-xs text-center truncate w-full">
                  {file.name}
                </span>
              </div>

              {/* Actions */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 bg-white/20 rounded hover:bg-white/30"
                  >
                    <Download className="w-3 h-3 text-white" />
                  </a>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  className="p-1 bg-red-500/20 rounded hover:bg-red-500/30"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-white/50">
            <Folder className="w-16 h-16 mb-2" />
            <p className="text-sm">No files yet</p>
          </div>
        )}
      </div>
    </div>
  );
}