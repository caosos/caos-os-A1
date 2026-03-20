import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content, context = '' } = body;

    if (!content || typeof content !== 'string') {
      return Response.json({ error: 'No content to pin' }, { status: 400 });
    }

    // Get existing memory file
    let existingMemory = '';
    try {
      const files = await base44.asServiceRole.entities.UserFile.filter({
        name: 'permanent_memory.md',
        folder_path: '/',
        created_by: user.email
      });

      if (files.length > 0) {
        const response = await fetch(files[0].url);
        existingMemory = await response.text();
      }
    } catch (error) {
      console.error('Error reading existing memory:', error);
    }

    // Add new pin with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const newPin = `\n\n## Pinned (${timestamp})\n${content}${context ? `\n\n*Context: ${context}*` : ''}`;
    const updatedMemory = existingMemory + newPin;

    // Upload updated memory
    const blob = new Blob([updatedMemory], { type: 'text/markdown' });
    const file = new File([blob], 'permanent_memory.md', { type: 'text/markdown' });
    const uploadResult = await base44.integrations.Core.UploadFile({ file });

    // Update or create UserFile
    const existingFiles = await base44.asServiceRole.entities.UserFile.filter({
      name: 'permanent_memory.md',
      folder_path: '/',
      created_by: user.email
    });

    if (existingFiles.length > 0) {
      await base44.asServiceRole.entities.UserFile.update(existingFiles[0].id, {
        url: uploadResult.file_url
      });
    } else {
      await base44.asServiceRole.entities.UserFile.create({
        name: 'permanent_memory.md',
        url: uploadResult.file_url,
        type: 'file',
        folder_path: '/',
        mime_type: 'text/markdown'
      });
    }

    return Response.json({
      success: true,
      pinned: content,
      timestamp
    });
  } catch (error) {
    console.error('Pin memory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});