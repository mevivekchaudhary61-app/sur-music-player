/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global crash protection to keep dev server resilient
process.on('uncaughtException', (err) => {
  console.error('[Sur Server] Uncaught exception prevented crash:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Sur Server] Unhandled rejection prevented crash:', reason);
});

// Extract 11-character YouTube video ID or resolve from song title/query
async function resolveToVideoId(input: string): Promise<{ videoId: string; searchTitle?: string }> {
  const clean = input.trim();

  // 1. Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return { videoId: clean };
  }

  // 2. YouTube URL formats (supports standard videos, shorts, live, embeds, music.youtube, m.youtube, youtu.be)
  try {
    const parsed = new URL(clean);
    // youtu.be/ID
    if (parsed.hostname === 'youtu.be' || parsed.hostname.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1).split('/')[0]?.split('?')[0];
      if (id && id.length === 11) return { videoId: id };
    }
    // youtube.com, m.youtube.com, music.youtube.com, www.youtube.com
    if (parsed.hostname.includes('youtube.com')) {
      if (
        parsed.pathname.startsWith('/shorts/') ||
        parsed.pathname.startsWith('/live/') ||
        parsed.pathname.startsWith('/embed/')
      ) {
        const id = parsed.pathname.split('/')[2]?.split('?')[0];
        if (id && id.length === 11) return { videoId: id };
      }
      const v = parsed.searchParams.get('v');
      if (v && v.length === 11) return { videoId: v };
    }
  } catch (e) {
    // Not a direct URL
  }

  // Regex fallback for any YouTube URL pattern
  const urlRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/|shorts\/)([^"&?\/\s]{11})/i;
  const match = clean.match(urlRegex);
  if (match && match[1] && match[1].length === 11) {
    return { videoId: match[1] };
  }

  // 3. Search query: Resolve song, video, shorts, podcast name to top YouTube video ID
  console.log(`[Sur Server] Searching YouTube for query: "${clean}"`);
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await searchRes.text();
    const idMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || html.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (idMatch && idMatch[1]) {
      console.log(`[Sur Server] Found top video ID: ${idMatch[1]} for "${clean}"`);
      return { videoId: idMatch[1], searchTitle: clean };
    }
  } catch (err: any) {
    console.warn('[Sur Server] Search resolver failed:', err.message || err);
  }

  throw new Error(`Could not find any YouTube video matching: "${clean}". Please enter a valid YouTube link or name.`);
}

// Accurately probe media file duration via ffprobe
async function getFileDuration(filePath: string): Promise<number> {
  try {
    if (!fs.existsSync(filePath)) return 0;
    const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await execPromise(probeCmd);
    const parsed = parseFloat(stdout.trim());
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  } catch (err) {}
  return 0;
}

// Convert & Download via ultra-fast high-fidelity Savenow/Loader cloud engine
async function downloadViaSavenow(videoId: string, format: 'mp3' | 'mp4'): Promise<{ buffer: Buffer; title: string }> {
  console.log(`[Sur Server] Converting YouTube content ${videoId} via Savenow Cloud Converter (${format.toUpperCase()})...`);
  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const initUrl = `https://p.savenow.to/ajax/download.php?format=${format}&url=${encodeURIComponent(targetUrl)}`;

  const initRes = await fetch(initUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://loader.to/'
    }
  });

  if (!initRes.ok) {
    throw new Error(`Savenow initial request failed with status: ${initRes.status}`);
  }

  const initData: any = await initRes.json();
  let downloadUrl = initData.download_url || initData.url;
  let title = initData.title || initData.info?.title || '';
  const progressUrl = initData.progress_url;

  if (!downloadUrl && progressUrl) {
    for (let i = 0; i < 40; i++) {
      const waitTime = i < 2 ? 800 : (i < 10 ? 1200 : 1500);
      await new Promise(r => setTimeout(r, waitTime));
      try {
        const progRes = await fetch(progressUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://loader.to/'
          }
        });
        if (!progRes.ok) continue;
        const progData: any = await progRes.json();
        if (progData.title) title = progData.title;
        if (progData.download_url) {
          downloadUrl = progData.download_url;
          break;
        }
        if (progData.success === 1 && progData.download_url) {
          downloadUrl = progData.download_url;
          break;
        }
        if (progData.error) {
          throw new Error(`Savenow conversion error: ${progData.error}`);
        }
      } catch (pollErr: any) {
        if (pollErr.message?.includes('Savenow conversion error')) throw pollErr;
      }
    }
  }

  if (!downloadUrl) {
    throw new Error('Conversion timed out or no download URL was returned.');
  }

  console.log(`[Sur Server] Savenow conversion finished! Streaming binary from: ${downloadUrl}`);
  const streamRes = await fetch(downloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });

  if (!streamRes.ok) {
    throw new Error(`Failed to stream media binary from server: HTTP ${streamRes.status}`);
  }

  const arrayBuffer = await streamRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), title };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Downloads folder setup
  const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }

  // Static serving of downloads folder
  app.use('/downloads', express.static(DOWNLOADS_DIR));

  // Health check route for container & dev server status
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // POST /api/download: Accepts song name OR YouTube URL, converts to MP3/MP4, returns downloadUrl
  app.post('/api/download', async (req, res) => {
    const { url, format = 'mp3' } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Song name or YouTube URL is required' });
    }

    const safeFormat = (format === 'mp4' ? 'mp4' : 'mp3') as 'mp3' | 'mp4';

    try {
      console.log(`[Sur Server] Download request: "${url}" [${safeFormat.toUpperCase()}]`);

      // 1. Resolve to 11-char YouTube Video ID (supports direct URLs or song search)
      const { videoId, searchTitle } = await resolveToVideoId(url);
      console.log(`[Sur Server] Resolved to videoId: ${videoId}`);

      // Check cache on disk for instant response
      try {
        const existingFiles = fs.readdirSync(DOWNLOADS_DIR);
        const cachedFile = existingFiles.find(f => {
          const lower = f.toLowerCase();
          return f.includes(videoId) || (searchTitle && searchTitle.length > 3 && lower.includes(searchTitle.toLowerCase()));
        });
        if (cachedFile) {
          const filePath = path.join(DOWNLOADS_DIR, cachedFile);
          const stats = fs.statSync(filePath);
          if (stats.size > 50000) {
            console.log(`[Sur Server] Instant cache hit: "${cachedFile}" (${stats.size} bytes)`);
            const exactDur = await getFileDuration(filePath);
            return res.json({
              success: true,
              fileName: cachedFile,
              downloadUrl: `/downloads/${encodeURIComponent(cachedFile)}`,
              title: cachedFile.replace(/\.[^/.]+$/, ''),
              size: stats.size,
              duration: exactDur,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            });
          }
        }
      } catch (cacheErr) {}

      let buffer: Buffer | null = null;
      let songTitle = searchTitle || 'Song Audio';

      // 2. Primary Engine: Ultra-Fast Savenow Cloud Converter (Unblocked, High-Fidelity)
      try {
        const result = await downloadViaSavenow(videoId, safeFormat);
        buffer = result.buffer;
        if (result.title) songTitle = result.title;
        console.log(`[Sur Server] Savenow download completed successfully! Title: ${songTitle}`);
      } catch (err: any) {
        console.warn('[Sur Server] Savenow engine failed, checking fallback:', err.message || err);
      }

      // 3. Fallback Engine: yt-dlp with js-runtimes
      if (!buffer) {
        try {
          const proxyArg = process.env.YTDLP_PROXY ? `--proxy "${process.env.YTDLP_PROXY}"` : '';
          const command = safeFormat === 'mp4'
            ? `./yt-dlp ${proxyArg} --js-runtimes node:/usr/local/bin/node -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "./downloads/%(title)s.%(ext)s" --print after_move:filepath "https://www.youtube.com/watch?v=${videoId}"`
            : `./yt-dlp ${proxyArg} --js-runtimes node:/usr/local/bin/node -x --audio-format mp3 --audio-quality 0 -o "./downloads/%(title)s.%(ext)s" --print after_move:filepath "https://www.youtube.com/watch?v=${videoId}"`;

          const { stdout } = await execPromise(command);
          const filePath = stdout.trim();
          if (filePath && fs.existsSync(filePath)) {
            const fileName = path.basename(filePath);
            const stats = fs.statSync(filePath);
            const exactDur = await getFileDuration(filePath);
            return res.json({
              success: true,
              fileName,
              downloadUrl: `/downloads/${encodeURIComponent(fileName)}`,
              title: fileName.replace(/\.[^/.]+$/, ''),
              size: stats.size,
              duration: exactDur,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            });
          }
        } catch (ytErr: any) {
          console.warn('[Sur Server] yt-dlp fallback also failed:', ytErr.message || ytErr);
        }
      }

      if (!buffer) {
        throw new Error('All conversion engines failed to process the request. Please check the YouTube link.');
      }

      // Save buffer to downloads folder
      const cleanTitle = songTitle.replace(/[\/\\?%*:|"<>\.]/g, '').trim() || 'downloaded_audio';
      const fileName = `${cleanTitle}.${safeFormat}`;
      const filePath = path.join(DOWNLOADS_DIR, fileName);

      fs.writeFileSync(filePath, buffer);
      console.log(`[Sur Server] Saved file to disk: ${fileName} (${buffer.length} bytes)`);

      const exactDur = await getFileDuration(filePath);

      return res.json({
        success: true,
        fileName,
        downloadUrl: `/downloads/${encodeURIComponent(fileName)}`,
        title: songTitle,
        size: buffer.length,
        duration: exactDur,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      });
    } catch (err: any) {
      console.error('[Sur Server] Download failed:', err);
      return res.status(500).json({
        error: err.message || 'Conversion failed. Please try again with a different song name or link.'
      });
    }
  });

  // GET /api/info: Resolves YouTube metadata including true duration
  app.get('/api/info', async (req, res) => {
    const url = (req.query.url as string || '').trim();
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    try {
      const { videoId, searchTitle } = await resolveToVideoId(url);
      let title = searchTitle || '';
      let duration = 0;
      let channel = 'YouTube Audio';
      const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      // Try quick scraping from YouTube watch page
      try {
        const ytRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        if (ytRes.ok) {
          const html = await ytRes.text();
          const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
          if (lenMatch) {
            duration = parseInt(lenMatch[1], 10);
          }
          const titleMatch = html.match(/<title>(.*?)<\/title>/);
          if (titleMatch && !title) {
            title = titleMatch[1].replace(' - YouTube', '').trim();
          }
          const authorMatch = html.match(/"author":"(.*?)"/);
          if (authorMatch) {
            channel = authorMatch[1].trim();
          }
        }
      } catch (e) {}

      // Check if file is already in downloads cache with ffprobe duration
      try {
        const existingFiles = fs.readdirSync(DOWNLOADS_DIR);
        const cachedFile = existingFiles.find(f => f.includes(videoId));
        if (cachedFile) {
          const filePath = path.join(DOWNLOADS_DIR, cachedFile);
          const probeDur = await getFileDuration(filePath);
          if (probeDur > 0) duration = probeDur;
        }
      } catch (e) {}

      return res.json({
        id: videoId,
        title: title || searchTitle || 'YouTube Audio',
        channel,
        thumbnail,
        duration
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // LRCLIB proxy route for synced lyrics
  app.get('/api/lyrics', async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

      const lrcRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
        headers: {
          'User-Agent': 'SurMusicPlayer/1.0 (https://sur-music-player.app)'
        }
      });
      if (!lrcRes.ok) throw new Error('LRCLIB responded with error: ' + lrcRes.status);
      const items: any = await lrcRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const bestSynced = items.find((i: any) => i.syncedLyrics);
        const match = bestSynced || items[0];
        return res.json({
          syncedLyrics: match.syncedLyrics,
          plainLyrics: match.plainLyrics,
          trackName: match.trackName,
          artistName: match.artistName
        });
      }
      return res.status(404).json({ error: 'No lyrics found' });
    } catch (err: any) {
      console.warn('[Sur Server] Lyrics proxy failed:', err.message || err);
      return res.status(500).json({ error: 'Failed to fetch lyrics' });
    }
  });

  // POST /api/translate: Translate lyrics to target language with auto-detection of source language
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Text and targetLanguage are required' });
      }

      // Using MyMemory translation API with auto-detect source language (langpair=autodetect|target)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${encodeURIComponent(targetLanguage)}`;
      const trRes = await fetch(url);
      if (trRes.ok) {
        const data = await trRes.json();
        if (data && data.responseData && data.responseData.translatedText) {
          return res.json({ translatedText: data.responseData.translatedText });
        }
      }

      // Fallback response
      return res.json({ translatedText: text });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Translation failed' });
    }
  });

  app.get('/api/lyrics/search', async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q) return res.json([]);

      const lrcRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
        headers: {
          'User-Agent': 'SurMusicPlayer/1.0 (https://sur-music-player.app)'
        }
      });
      if (!lrcRes.ok) throw new Error('LRCLIB search error: ' + lrcRes.status);
      const items = await lrcRes.json();
      return res.json(items);
    } catch (err: any) {
      return res.json([]);
    }
  });

  const distHtmlPath = path.join(__dirname, 'dist/index.html');
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(distHtmlPath);

  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/downloads')) return next();
      res.sendFile(distHtmlPath);
    });
  } else {
    // Create Vite server in middleware mode for development
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/downloads')) return next();
      try {
        const url = req.originalUrl;
        const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e: any) {
        if (vite) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Sur Server] Full-stack engine online on http://0.0.0.0:${port}`);
  });
}

startServer();
