// Pure helper functions — no side effects, no UI/toast/DOM dependencies
// Commit 2: extracted verbatim from ChatBubble.jsx

export const getYouTubeId = (url) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

export const extractUrls = (text) => {
  if (!text) return [];
  
  // Extract URLs from both bare URLs and markdown links [text](url)
  const urls = [];
  
  // Match markdown links: [text](url)
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(text)) !== null) {
    urls.push(match[2]); // The URL is in the second capture group
  }
  
  // Match bare URLs
  const urlRegex = /https?:\/\/[^\s)\]]+/g;
  const bareUrls = text.match(urlRegex) || [];
  urls.push(...bareUrls);
  
  // Remove duplicates
  return [...new Set(urls)];
};

export const getVimeoId = (url) => {
  const regExp = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
  const match = url.match(regExp);
  return match ? match[3] : null;
};

export const isVideoUrl = (url) => {
  return getYouTubeId(url) || getVimeoId(url);
};

export const extractFilename = (langString) => {
  if (langString && langString.startsWith('filename:')) {
    return langString.replace('filename:', '');
  }
  return null;
};