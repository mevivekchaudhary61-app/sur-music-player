/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoInfo } from '../types/download';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// Helper function to extract 11-char YouTube ID (supports videos, shorts, live, embed, music, mobile)
export function getYouTubeId(url: string): string | null {
  const clean = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;

  try {
    const p = new URL(clean);
    if (p.hostname === 'youtu.be' || p.hostname.endsWith('.youtu.be')) {
      const id = p.pathname.slice(1).split('/')[0]?.split('?')[0];
      if (id && id.length === 11) return id;
    }
    if (p.hostname.includes('youtube.com')) {
      if (
        p.pathname.startsWith('/shorts/') ||
        p.pathname.startsWith('/live/') ||
        p.pathname.startsWith('/embed/')
      ) {
        const id = p.pathname.split('/')[2]?.split('?')[0];
        if (id && id.length === 11) return id;
      }
      const v = p.searchParams.get('v');
      if (v && v.length === 11) return v;
    }
  } catch (e) {}

  const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/|shorts\/)([^"&?\/\s]{11})/i;
  const m = clean.match(reg);
  return (m && m[1] && m[1].length === 11) ? m[1] : null;
}

// Convert ISO 8601 duration (e.g. PT4M12S) to seconds
export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchVideoInfo(url: string, apiKey?: string, signal?: AbortSignal): Promise<VideoInfo> {
  const id = getYouTubeId(url);

  // 1. Try our server /api/info endpoint first (fetches real duration and metadata)
  try {
    const infoRes = await fetch(`${API_BASE}/api/info?url=${encodeURIComponent(url)}`, { signal });
    if (infoRes.ok) {
      const infoData = await infoRes.json();
      if (infoData && (infoData.title || infoData.id)) {
        return {
          id: infoData.id || id || '',
          title: infoData.title || url.trim(),
          channel: infoData.channel || 'YouTube Audio',
          thumbnail: infoData.thumbnail || (id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : ''),
          duration: infoData.duration || 0
        };
      }
    }
  } catch (e) {}

  if (!id) {
    // If it's a search title (e.g. "Kesariya" or "Tech Podcast"), return clean query metadata
    return {
      id: '',
      title: url.trim(),
      channel: 'YouTube Audio',
      thumbnail: '',
      duration: 0
    };
  }

  // If YouTube Data API v3 Key is available, use it
  if (apiKey) {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${apiKey}&part=snippet,contentDetails`, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          return {
            id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
            duration: parseDuration(item.contentDetails?.duration || '')
          };
        }
      }
    } catch (e) {
      console.warn('Google YouTube API key request failed, falling back to oembed...', e);
    }
  }

  // Graceful fallback to oembed using canonical watch URL (No key required, CORS compliant)
  try {
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`, { signal });
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      return {
        id,
        title: data.title || 'YouTube Audio Track',
        channel: data.author_name || 'YouTube Channel',
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        duration: 0
      };
    }
  } catch (e) {
    // Fall through to default metadata
  }

  return {
    id,
    title: 'YouTube Media',
    channel: 'YouTube',
    thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    duration: 0
  };
}

export interface DownloadResponse {
  success: boolean;
  fileName: string;
  downloadUrl: string;
  size: number;
  title?: string;
  thumbnail?: string;
  duration?: number;
}

export async function requestMp3Download(
  url: string,
  quality: '128' | '192' | '320',
  format: 'mp3' | 'mp4' = 'mp3',
  signal?: AbortSignal
): Promise<DownloadResponse> {
  const response = await fetch(`${API_BASE}/api/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, quality, format }),
    signal
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Server conversion failed.');
  }

  const data: DownloadResponse = await response.json();
  if (data.downloadUrl && !data.downloadUrl.startsWith('http') && API_BASE) {
    data.downloadUrl = `${API_BASE}${data.downloadUrl}`;
  }
  return data;
}
