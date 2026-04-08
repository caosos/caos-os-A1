import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { persistAsset } from '@/lib/userFilePersistence';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function useAttachments({ conversationId } = {}) {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCancelled, setUploadCancelled] = useState(false);
  const uploadCancelledRef = useRef(false);
  const [showCaptureMenu, setShowCaptureMenu] = useState(false);
  const captureMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  // Pending assets: uploaded before conversationId exists; finalized after first send
  const pendingAssetsRef = useRef([]);

  const cancelUpload = () => {
    uploadCancelledRef.current = true;
    setUploadCancelled(true);
    setUploading(false);
    toast('Upload cancelled.');
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const totalFiles = attachedFiles.length + files.length;
    if (totalFiles > 5) {
      alert(`You can only attach up to 5 files. You currently have ${attachedFiles.length} file(s) attached.`);
      e.target.value = '';
      return;
    }

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      toast.error(`File too large: ${oversized.map(f => f.name).join(', ')}. Maximum is ${MAX_FILE_SIZE_MB} MB per file.`, { duration: 6000 });
      e.target.value = '';
      return;
    }

    uploadCancelledRef.current = false;
    setUploadCancelled(false);
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        if (uploadCancelledRef.current) break;
        const result = await base44.integrations.Core.UploadFile({ file });
        if (uploadCancelledRef.current) break;
        const isImage = file.type.startsWith('image/');
        const assetType = isImage ? 'photo' : 'file';
        uploadedFiles.push({ name: file.name, url: result.file_url, type: file.type });
        if (conversationId) {
          await persistAsset({ url: result.file_url, name: file.name, type: assetType, mimeType: file.type, size: file.size, conversationId, userEmail: null });
        } else {
          // Queue for finalization after conversation is created
          pendingAssetsRef.current.push({ url: result.file_url, name: file.name, type: assetType, mimeType: file.type, size: file.size });
        }
      }
      if (!uploadCancelledRef.current) {
        setAttachedFiles(prev => [...prev, ...uploadedFiles]);
      }
    } catch (error) {
      if (!uploadCancelledRef.current) {
        console.error('Error uploading files:', error);
        toast.error('Upload failed. Try a smaller file.');
      }
    }
    setUploading(false);
    uploadCancelledRef.current = false;
    setUploadCancelled(false);
    e.target.value = '';
  };

  const captureScreen = async () => {
    const html2canvas = (await import('html2canvas')).default;
    setShowCaptureMenu(false);
    setUploading(true);
    try {
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight
      });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        const result = await base44.integrations.Core.UploadFile({ file });
        if (conversationId) {
          await persistAsset({ url: result.file_url, name: file.name, type: 'photo', mimeType: 'image/png', size: blob.size, conversationId, userEmail: null });
        } else {
          pendingAssetsRef.current.push({ url: result.file_url, name: file.name, type: 'photo', mimeType: 'image/png', size: blob.size });
        }
        setAttachedFiles(prev => [...prev, { name: file.name, url: result.file_url, type: 'image/png' }]);
        setUploading(false);
      });
    } catch (error) {
      console.error('Error capturing screen:', error);
      setUploading(false);
    }
  };

  const captureCamera = () => {
    setShowCaptureMenu(false);
    cameraInputRef.current?.click();
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (conversationId) {
        await persistAsset({ url: result.file_url, name: file.name, type: 'photo', mimeType: file.type, size: file.size, conversationId, userEmail: null });
      } else {
        pendingAssetsRef.current.push({ url: result.file_url, name: file.name, type: 'photo', mimeType: file.type, size: file.size });
      }
      setAttachedFiles(prev => [...prev, { name: file.name, url: result.file_url, type: file.type }]);
    } catch (error) {
      console.error('Error uploading camera photo:', error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Called by Chat.jsx after conversationId is resolved for a new thread.
  // Persists any assets that were uploaded before the conversation existed.
  const finalizePendingAssets = async (resolvedConversationId, userEmail) => {
    if (!resolvedConversationId || pendingAssetsRef.current.length === 0) return;
    const pending = [...pendingAssetsRef.current];
    pendingAssetsRef.current = [];
    for (const asset of pending) {
      await persistAsset({ ...asset, conversationId: resolvedConversationId, userEmail });
    }
  };

  return {
    attachedFiles,
    setAttachedFiles,
    uploading,
    uploadCancelled,
    showCaptureMenu,
    setShowCaptureMenu,
    captureMenuRef,
    fileInputRef,
    cameraInputRef,
    cancelUpload,
    handleFileSelect,
    captureScreen,
    captureCamera,
    handleCameraCapture,
    removeFile,
    finalizePendingAssets,
  };
}