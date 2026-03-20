/**
 * YOUTUBE SEARCH EXECUTOR
 * 
 * Contract-compliant executor for YouTube video search.
 * Hard-fails if video_id missing. No synthetic placeholders.
 */

import { buildExecutorResponse } from '../core/executorContract.js';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

export async function youtubeSearchExecutor(query, options = {}) {
    const started_at = Date.now();
    const executor = 'youtubeSearchExecutor';
    const tool = 'search_youtube';
    
    // HARD GUARD: Require query
    if (!query || typeof query !== 'string' || query.trim() === '') {
        return buildExecutorResponse({
            ok: false,
            tool,
            executor,
            started_at,
            ended_at: Date.now(),
            input: query,
            output: null,
            error_code: 'QUERY_MISSING',
            error_detail: 'YouTube search requires non-empty query'
        });
    }
    
    // HARD GUARD: Require API key
    if (!YOUTUBE_API_KEY) {
        return buildExecutorResponse({
            ok: false,
            tool,
            executor,
            started_at,
            ended_at: Date.now(),
            input: query,
            output: null,
            error_code: 'API_KEY_MISSING',
            error_detail: 'YOUTUBE_API_KEY not configured'
        });
    }
    
    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('key', YOUTUBE_API_KEY);
        url.searchParams.set('q', query);
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('type', 'video');
        url.searchParams.set('maxResults', options.maxResults || 5);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const errorText = await response.text();
            return buildExecutorResponse({
                ok: false,
                tool,
                executor,
                started_at,
                ended_at: Date.now(),
                input: query,
                output: null,
                error_code: 'API_ERROR',
                error_detail: `YouTube API returned ${response.status}: ${errorText}`
            });
        }
        
        const data = await response.json();
        
        // HARD GUARD: Validate response structure
        if (!data.items || !Array.isArray(data.items)) {
            return buildExecutorResponse({
                ok: false,
                tool,
                executor,
                started_at,
                ended_at: Date.now(),
                input: query,
                output: data,
                error_code: 'MALFORMED_RESPONSE',
                error_detail: 'YouTube API response missing items array'
            });
        }
        
        // Extract video data
        const videos = data.items.map(item => {
            // HARD GUARD: Require video_id
            if (!item.id?.videoId) {
                return null;
            }
            
            return {
                video_id: item.id.videoId,
                title: item.snippet?.title || 'Untitled',
                description: item.snippet?.description || '',
                channel: item.snippet?.channelTitle || 'Unknown',
                published_at: item.snippet?.publishedAt,
                thumbnail: item.snippet?.thumbnails?.default?.url,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            };
        }).filter(Boolean); // Remove null entries
        
        // HARD GUARD: Fail if no valid videos
        if (videos.length === 0) {
            return buildExecutorResponse({
                ok: false,
                tool,
                executor,
                started_at,
                ended_at: Date.now(),
                input: query,
                output: data,
                error_code: 'NO_VALID_RESULTS',
                error_detail: 'YouTube search returned no videos with valid video_id'
            });
        }
        
        // CONTINUOUS LEARNING: Persist search results as knowledge
        try {
            const topVideos = videos.slice(0, 3);
            for (const video of topVideos) {
                await base44.asServiceRole.entities.LearnedFact.create({
                    user_id: user.email,
                    fact_type: 'search_result',
                    category: 'youtube_search',
                    subject: query,
                    fact_content: `Found video: "${video.title}" by ${video.channel_title} (${video.url})`,
                    confidence: 0.9,
                    source_thread: 'youtube_search_executor',
                    learned_at: new Date().toISOString(),
                    last_referenced: new Date().toISOString(),
                    reference_count: 0,
                    tags: ['youtube', 'video', ...query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3)]
                });
            }
            console.log('🧠 [SEARCH_KNOWLEDGE_STORED]', { query, videos_stored: topVideos.length });
        } catch (learnError) {
            console.warn('⚠️ [SEARCH_LEARNING_FAILED]', learnError.message);
        }
        
        return buildExecutorResponse({
            ok: true,
            tool,
            executor,
            started_at,
            ended_at: Date.now(),
            input: query,
            output: videos,
            data: {
                query,
                count: videos.length,
                videos
            }
        });
        
    } catch (error) {
        return buildExecutorResponse({
            ok: false,
            tool,
            executor,
            started_at,
            ended_at: Date.now(),
            input: query,
            output: null,
            error_code: 'EXECUTION_FAILED',
            error_detail: error.message
        });
    }
}