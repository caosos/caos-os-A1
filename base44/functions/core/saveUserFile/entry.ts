import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Save a file to the user's profile storage (UserFile entity)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_name, file_url, file_type = 'file', folder_path = '/', size = null, mime_type = 'application/octet-stream' } = body;

    if (!file_name || !file_url) {
      return Response.json({ error: 'file_name and file_url required' }, { status: 400 });
    }

    // Create UserFile record
    const userFile = await base44.entities.UserFile.create({
      name: file_name,
      url: file_url,
      type: file_type, // 'file' | 'photo' | 'folder'
      folder_path: folder_path,
      size: size,
      mime_type: mime_type
    });

    return Response.json({
      success: true,
      file_id: userFile.id,
      file_name: file_name,
      folder_path: folder_path,
      type: file_type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});