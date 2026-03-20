import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, context = '' } = body;

    if (!message) {
      return Response.json({ success: true });
    }

    // Check if this looks like a preference/style message
    const preferencePatterns = [
      /don't|do not|no need|unnecessary/i,
      /preference|prefer|prefer|style|format|way|present/i,
      /save.*permanently|remember|going forward/i
    ];

    const hasPreference = preferencePatterns.some(pattern => pattern.test(message));

    if (!hasPreference) {
      return Response.json({ success: true });
    }

    // Get existing memory
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

    // Check if we already have this preference saved
    if (existingMemory.includes(message.substring(0, 50))) {
      return Response.json({ success: true });
    }

    // Add preference to memory
    const timestamp = new Date().toISOString().split('T')[0];
    const prefSection = `## Communication Preference (${timestamp})\n${message}${context ? `\n\nContext: ${context}` : ''}`;
    
    let updatedMemory;
    if (existingMemory.includes('## Communication Preference')) {
      // Replace existing preference section
      updatedMemory = existingMemory.replace(
        /## Communication Preference.*?(?=##|$)/s,
        prefSection + '\n\n'
      );
    } else {
      // Add new section after Key Facts or at the end
      updatedMemory = existingMemory + '\n\n' + prefSection;
    }

    // Upload updated memory
    const blob = new Blob([updatedMemory], { type: 'text/markdown' });
    const file = new File([blob], 'permanent_memory.md', { type: 'text/markdown' });
    const uploadResult = await base44.integrations.Core.UploadFile({ file });

    // Update UserFile
    const existingFiles = await base44.asServiceRole.entities.UserFile.filter({
      name: 'permanent_memory.md',
      folder_path: '/',
      created_by: user.email
    });

    if (existingFiles.length > 0) {
      await base44.asServiceRole.entities.UserFile.update(existingFiles[0].id, {
        url: uploadResult.file_url
      });
    }

    return Response.json({ success: true, preference_saved: true });
  } catch (error) {
    console.error('Extract preference error:', error);
    return Response.json({ success: true });
  }
});