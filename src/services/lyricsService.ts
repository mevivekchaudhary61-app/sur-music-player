/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Service for fetching and managing real synchronized (LRC) lyrics
// Uses LRCLIB (free, open-source, unlimited public lyrics database)

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface LyricSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  syncedLyrics?: string;
  plainLyrics?: string;
}

export function cleanTitleForLyrics(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\.[a-z0-9]{2,4}$/i, '') // remove file extensions (.mp3, .m4a)
    .replace(/^\d+[\s._-]+/, '') // remove leading track numbers (e.g., "01 - ")
    .replace(/\[.*?\]|\(.*?\)/g, '') // remove brackets and parentheses (e.g., "(Official Video)")
    .replace(/\b(official|video|audio|lyrics|lyrical|hd|4k|full song|song|feat|ft|remix|version|ost|soundtrack|visualizer)\b/gi, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch synchronized lyrics for a song from LRCLIB (with local server fallback)
 */
export async function fetchLyricsFromLRCLIB(title: string, artist?: string, duration?: number): Promise<{
  syncedLyrics?: string;
  plainLyrics?: string;
  trackName?: string;
  artistName?: string;
} | null> {
  const cleanTitle = cleanTitleForLyrics(title);
  if (!cleanTitle) return null;

  // Clean artist if available
  const cleanArtist = artist && !artist.toLowerCase().includes('youtube') && !artist.toLowerCase().includes('unknown')
    ? artist.trim()
    : '';

  // 1. Try exact search via direct LRCLIB endpoint
  try {
    let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}`;
    if (cleanArtist) {
      getUrl += `&artist_name=${encodeURIComponent(cleanArtist)}`;
    }
    if (duration && duration > 0) {
      getUrl += `&duration=${Math.round(duration)}`;
    }

    const res = await fetch(getUrl, {
      headers: {
        'User-Agent': 'SurMusicPlayer/1.0 (https://sur-music-player.app)'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics || data.plainLyrics) {
        return {
          syncedLyrics: data.syncedLyrics,
          plainLyrics: data.plainLyrics,
          trackName: data.trackName,
          artistName: data.artistName
        };
      }
    }
  } catch (err) {
    console.warn('[Lyrics] Exact lookup failed, trying fuzzy search...', err);
  }

  // 2. Try search endpoint with query
  try {
    const query = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'SurMusicPlayer/1.0 (https://sur-music-player.app)'
      }
    });

    if (res.ok) {
      const items: LyricSearchResult[] = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        // Find best match with syncedLyrics
        const bestSynced = items.find(i => i.syncedLyrics);
        const match = bestSynced || items[0];
        if (match && (match.syncedLyrics || match.plainLyrics)) {
          return {
            syncedLyrics: match.syncedLyrics,
            plainLyrics: match.plainLyrics,
            trackName: match.trackName,
            artistName: match.artistName
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Lyrics] Fuzzy search via LRCLIB direct failed, trying server proxy...', err);
  }

  // 3. Fallback via our backend proxy route (/api/lyrics)
  try {
    const proxyUrl = `${API_BASE}/api/lyrics?q=${encodeURIComponent(cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics || data.plainLyrics) {
        return {
          syncedLyrics: data.syncedLyrics,
          plainLyrics: data.plainLyrics,
          trackName: data.trackName,
          artistName: data.artistName
        };
      }
    }
  } catch (err) {
    console.error('[Lyrics] All lyrics providers failed:', err);
  }

  return null;
}

/**
 * Search lyrics for manual selection
 */
export async function searchLyricsList(query: string): Promise<LyricSearchResult[]> {
  const cleanQ = cleanTitleForLyrics(query);
  if (!cleanQ) return [];

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanQ)}`, {
      headers: {
        'User-Agent': 'SurMusicPlayer/1.0 (https://sur-music-player.app)'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (e) {
    // Try proxy
    try {
      const pRes = await fetch(`${API_BASE}/api/lyrics/search?q=${encodeURIComponent(cleanQ)}`);
      if (pRes.ok) {
        return await pRes.json();
      }
    } catch (err) {}
  }

  return [];
}
