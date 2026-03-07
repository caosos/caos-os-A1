import moment from 'moment';
import { toast } from 'sonner';

export const formatDateTime = (timestamp) => {
  return moment(timestamp).format('MMM D, YYYY • h:mm A');
};

export const downloadFile = (content, filename) => {
  const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Downloaded ${filename}`);
};

export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};