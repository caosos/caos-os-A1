import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const ts_iso = new Date().toISOString();
        const request_id = crypto.randomUUID();
        const correlation_id = crypto.randomUUID();

        const ui = {
            pages: [
                { name: "Welcome", route: "/Welcome" },
                { name: "Chat", route: "/Chat" },
                { name: "Admin", route: "/Admin" },
                { name: "Console", route: "/Console" },
                { name: "Implementation", route: "/Implementation" },
                { name: "MemoryIsolation", route: "/MemoryIsolation" },
                { name: "SystemBlueprint", route: "/SystemBlueprint" },
                { name: "News", route: "/News" },
                { name: "Logs", route: "/Logs" }
            ],
            topology: {
                background: "animated_starfield_canvas",
                header: "fixed_top_bar",
                thread_list: "slide_in_sidebar_left",
                profile_panel: "slide_in_sidebar_right",
                chat_area: "scrollable_centered_max_width_2xl",
                input_bar: "fixed_bottom",
                token_meter: "top_right_header_wcw_bar"
            },
            profile_panel: {
                toggles: ["Remember Conversations", "Game Mode", "Developer Mode", "Multi-Agent Mode"],
                sections: ["Desktop", "Files", "Folders", "Photos", "Permanent Memories"]
            }
        };

        const encoder = new TextEncoder();
        const uiData = encoder.encode(JSON.stringify(ui));
        const hashBuffer = await crypto.subtle.digest('SHA-256', uiData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const uiHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return Response.json({
            request_id,
            correlation_id,
            tool_name: "ui.pages",
            tool_version: "UIPAGES_v1_2026-03-02",
            ts_iso,
            source: "ui_registry",
            hash: `sha256:${uiHash}`,
            ui
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});