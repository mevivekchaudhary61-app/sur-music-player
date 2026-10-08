/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchLyricsFromLRCLIB } from '../services/lyricsService';
import { getMediaDuration } from '../utils/mediaDuration';

// Offline File Persistent Storage utilizing HTML5 IndexedDB & LocalStorage
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url: string;      // Object URL or absolute HTTP stream path
  size?: string;    // e.g. "5.4 MB"
  format?: string;  // e.g. "MP3", "FLAC"
  genre?: string;
  year?: string;
  isFavorite: boolean;
  lyrics?: string;  // Text lyrics or LRC format
  colorTheme?: string; // Dominant vibrant color for background matching
  folderName?: string; // simulated folder views
  fileRef?: File;   // Original File reference
  isYoutubeDownload?: boolean; // Tag for YouTube downloads
  thumbnail?: string; // Cover art/thumbnail image URL
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: string;
}

export const DEFAULT_SONGS: Song[] = [];

// Clean and normalize titles for smart matching (e.g. "Kesariya.mp3" matches "Kesariya | Official Music Video")
export function normalizeSongTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/i, '') // remove extensions like .mp3, .m4a
    .replace(/^\d+[\s._-]+/, '') // remove leading track numbers like "01 - "
    .replace(/\b(official|music|video|audio|lyrics|lyrical|hd|4k|full song|song|feat|ft|visualizer|remix|version|ost|soundtrack)\b/gi, '')
    .replace(/\[.*?\]|\(.*?\)/g, '') // remove brackets
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

export function areSongTitlesMatching(titleA: string, titleB: string): boolean {
  if (!titleA || !titleB) return false;
  if (titleA.toLowerCase().trim() === titleB.toLowerCase().trim()) return true;

  const a = normalizeSongTitle(titleA);
  const b = normalizeSongTitle(titleB);
  if (!a || !b) return false;

  const aCompact = a.replace(/\s+/g, '');
  const bCompact = b.replace(/\s+/g, '');

  if (aCompact === bCompact) return true;
  if (aCompact.length >= 4 && bCompact.includes(aCompact)) return true;
  if (bCompact.length >= 4 && aCompact.includes(bCompact)) return true;

  const wordsA = a.split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.split(/\s+/).filter(w => w.length > 2);
  if (wordsA.length > 0 && wordsB.length > 0) {
    const common = wordsA.filter(w => wordsB.includes(w));
    if (common.length >= Math.min(wordsA.length, wordsB.length) || common.some(w => w.length >= 4)) {
      return true;
    }
  }
  return false;
}

// Clean IndexedDB Manager for storing actual binary file Blobs and Synced Lyrics natively
class IndexedDBSongStore {
  private dbName = 'SurMusicDB_V2';
  private storeName = 'songs_binary';
  private lyricsStoreName = 'songs_lyrics';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  public init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
        if (!db.objectStoreNames.contains(this.lyricsStoreName)) {
          db.createObjectStore(this.lyricsStoreName);
        }
      };
    });
    return this.initPromise;
  }

  public async saveSongFile(songId: string, file: Blob | File): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.put(file, songId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getSongFile(songId: string): Promise<Blob | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }
      try {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get(songId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (err) {
        resolve(null);
      }
    });
  }

  public async deleteSongFile(songId: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      try {
        const tx = this.db.transaction([this.storeName, this.lyricsStoreName], 'readwrite');
        tx.objectStore(this.storeName).delete(songId);
        tx.objectStore(this.lyricsStoreName).delete(songId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  public async saveLyrics(songId: string, lyrics: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      if (!this.db) return resolve();
      try {
        if (!this.db.objectStoreNames.contains(this.lyricsStoreName)) return resolve();
        const tx = this.db.transaction(this.lyricsStoreName, 'readwrite');
        const store = tx.objectStore(this.lyricsStoreName);
        store.put(lyrics, songId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  public async getLyrics(songId: string): Promise<string | null> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      try {
        if (!this.db.objectStoreNames.contains(this.lyricsStoreName)) return resolve(null);
        const tx = this.db.transaction(this.lyricsStoreName, 'readonly');
        const store = tx.objectStore(this.lyricsStoreName);
        const req = store.get(songId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }
}

export const songStoreDB = new IndexedDBSongStore();

class LibraryStore {
  private songs: Song[] = [];
  private playlists: Playlist[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    // Initialize DB asynchronously
    songStoreDB.init()
      .then(() => {
        this.reconstructObjectUrls();
      })
      .catch((err) => console.warn('IndexedDB initialisation skipped:', err));
  }

  private loadFromStorage() {
    try {
      const storedSongs = localStorage.getItem('sur_songs');
      const storedPlaylists = localStorage.getItem('sur_playlists');
      
      if (storedSongs) {
        const parsed: Song[] = JSON.parse(storedSongs);
        this.songs = parsed.map(song => ({
          ...song,
          url: '' // Will be filled dynamically by Object URLs from IndexedDB
        }));

        // Reconcile with downloads history so any downloaded song has matching thumbnail, format, and size
        try {
          const dlHistory = localStorage.getItem('sur_downloads_history');
          if (dlHistory) {
            const dlItems = JSON.parse(dlHistory);
            this.songs = this.songs.map(song => {
              const match = dlItems.find((d: any) => 
                d.id === song.id || 
                (d.title && song.title && d.title.toLowerCase().trim() === song.title.toLowerCase().trim())
              );
              if (match) {
                return {
                  ...song,
                  thumbnail: song.thumbnail || match.thumbnail,
                  format: song.format || match.format || 'MP3',
                  size: song.size || (match.size ? `${(match.size / (1024 * 1024)).toFixed(1)} MB` : undefined)
                };
              }
              return song;
            });
          }
        } catch (e) {}

        this.deduplicateSongs();
      } else {
        this.songs = [];
      }

      if (storedPlaylists) {
        this.playlists = JSON.parse(storedPlaylists);
        // Rename any existing "YouTube Downloads" playlist to "Downloads"
        this.playlists = this.playlists.map(p => {
          if (p.id === 'playlist_youtube' && p.name === 'YouTube Downloads') {
            return { ...p, name: 'Downloads' };
          }
          return p;
        });
        const hasYtPlaylist = this.playlists.some(p => p.id === 'playlist_youtube');
        if (!hasYtPlaylist) {
          this.playlists.push({
            id: 'playlist_youtube',
            name: 'Downloads',
            songIds: [],
            createdAt: new Date().toISOString()
          });
        }
        this.savePlaylists();
      } else {
        this.playlists = [
          {
            id: 'playlist_favs',
            name: 'Mera Sangeet',
            songIds: [],
            createdAt: new Date().toISOString()
          },
          {
            id: 'playlist_youtube',
            name: 'Downloads',
            songIds: [],
            createdAt: new Date().toISOString()
          }
        ];
        this.savePlaylists();
      }
    } catch (e) {
      this.songs = [];
      this.playlists = [];
    }
  }

  // Pre-load all stored blobs into transient object URLs on app start and load offline cached lyrics
  private async reconstructObjectUrls() {
    let changed = false;
    for (const song of this.songs) {
      if (song.id.startsWith('scanned_') || song.id.startsWith('dl_')) {
        const blob = await songStoreDB.getSongFile(song.id);
        if (blob) {
          song.url = URL.createObjectURL(blob);
          changed = true;
          // Accurately resolve duration if missing or was previously capped at 240
          if (!song.duration || song.duration <= 0 || song.duration === 240) {
            try {
              const dur = await getMediaDuration(blob);
              if (dur > 0 && dur !== song.duration) {
                song.duration = dur;
                changed = true;
              }
            } catch (e) {}
          }
        }
      } else if ((!song.duration || song.duration <= 0 || song.duration === 240) && song.url) {
        // Also probe songs with HTTP or file URLs
        try {
          const dur = await getMediaDuration(song.url);
          if (dur > 0 && dur !== song.duration) {
            song.duration = dur;
            changed = true;
          }
        } catch (e) {}
      }

      if (!song.lyrics) {
        const cachedLyrics = await songStoreDB.getLyrics(song.id);
        if (cachedLyrics) {
          song.lyrics = cachedLyrics;
          changed = true;
        }
      }
    }
    if (changed) {
      this.saveSongs();
      this.notify();
    }
  }

  public updateSongDuration(songId: string, duration: number) {
    if (!duration || duration <= 0) return;
    const song = this.songs.find(s => s.id === songId || areSongTitlesMatching(s.title, songId));
    if (song && (song.duration !== duration || song.duration === 240)) {
      song.duration = duration;
      this.saveSongs();
      this.notify();
    }
  }

  // Dynamic on-demand resolver for play request stability
  public async getPlayableUrl(songId: string): Promise<string> {
    const song = this.songs.find(s => s.id === songId);
    if (!song) return '';
    if (song.url && song.url.startsWith('blob:')) {
      return song.url;
    }
    const blob = await songStoreDB.getSongFile(songId);
    if (blob) {
      const freshUrl = URL.createObjectURL(blob);
      song.url = freshUrl;
      this.notify();
      return freshUrl;
    }
    if (song.url) {
      return song.url;
    }
    return '';
  }

  private saveSongs() {
    try {
      const serializableSongs = this.songs.map(({ fileRef, url, ...rest }) => ({
        ...rest,
        url: '' // Keep transient blob URLs out of LocalStorage
      }));
      localStorage.setItem('sur_songs', JSON.stringify(serializableSongs));
    } catch (e) {
      console.error('Failed to save songs to local storage', e);
    }
  }

  private savePlaylists() {
    try {
      localStorage.setItem('sur_playlists', JSON.stringify(this.playlists));
    } catch (e) {
      console.error('Failed to save playlists to local storage', e);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public getSongs(): Song[] {
    return this.songs;
  }

  public getPlaylists(): Playlist[] {
    return this.playlists;
  }

  public deduplicateSongs() {
    const cleaned: Song[] = [];
    for (const song of this.songs) {
      const matchIdx = cleaned.findIndex(c => 
        c.id === song.id || areSongTitlesMatching(c.title, song.title)
      );
      if (matchIdx === -1) {
        cleaned.push(song);
      } else {
        // Merge attributes into existing: keep the best metadata and audio URL
        const existing = cleaned[matchIdx];
        if (!existing.thumbnail && song.thumbnail) existing.thumbnail = song.thumbnail;
        if (!existing.url && song.url) existing.url = song.url;
        if ((!existing.duration || existing.duration <= 0) && song.duration > 0) existing.duration = song.duration;
        if (!existing.size && song.size) existing.size = song.size;
      }
    }
    if (cleaned.length !== this.songs.length) {
      this.songs = cleaned;
      this.saveSongs();
      this.notify();
    }
  }

  public addOrGetSong(songData: {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    url: string;
    duration?: number;
    size?: string;
  }): Song {
    const existing = this.songs.find(s => 
      s.id === songData.id || areSongTitlesMatching(s.title, songData.title)
    );

    if (existing) {
      if (songData.url && (!existing.url || !existing.url.startsWith('blob:'))) {
        existing.url = songData.url;
      }
      return existing;
    }

    const newSong: Song = {
      id: songData.id,
      title: songData.title,
      artist: songData.artist || 'YouTube Audio',
      album: songData.album || 'YouTube Downloads',
      duration: songData.duration || 0,
      url: songData.url,
      size: songData.size || '3.5 MB',
      isFavorite: false,
      folderName: 'YouTube Downloads',
      isYoutubeDownload: true,
      colorTheme: 'from-emerald-950/70 to-zinc-950',
      lyrics: `[00:00.00] Playing: ${songData.title}\n[00:05.00] Enjoy offline music with Sur player...`
    };
    this.songs = [newSong, ...this.songs];
    this.saveSongs();
    this.notify();
    return newSong;
  }

  public async addDownloadedSong(data: {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    duration?: number;
    size?: string;
    thumbnail?: string;
    file: File;
    serverUrl?: string;
  }): Promise<Song> {
    // 1. Check if song ALREADY exists in library — if so, update it without creating duplicate!
    const existing = this.songs.find(s => 
      s.id === data.id || areSongTitlesMatching(s.title, data.title)
    );

    if (existing) {
      await songStoreDB.saveSongFile(existing.id, data.file);
      existing.url = URL.createObjectURL(data.file);
      if (data.thumbnail && !existing.thumbnail) existing.thumbnail = data.thumbnail;
      if (data.duration && data.duration > 0 && (!existing.duration || existing.duration <= 0 || existing.duration === 240)) existing.duration = data.duration;
      if (data.size) existing.size = data.size;
      this.saveSongs();
      this.notify();
      return existing;
    }

    const songId = data.id;
    await songStoreDB.saveSongFile(songId, data.file);
    const blobUrl = URL.createObjectURL(data.file);

    const newSong: Song = {
      id: songId,
      title: data.title,
      artist: data.artist || 'YouTube Audio',
      album: data.album || 'YouTube Downloads',
      duration: data.duration || 0,
      url: blobUrl,
      size: data.size || '3.5 MB',
      format: 'MP3',
      isFavorite: false,
      folderName: 'YouTube Downloads',
      isYoutubeDownload: true,
      colorTheme: 'from-emerald-950/70 to-zinc-950',
      thumbnail: data.thumbnail,
      lyrics: `[00:00.00] Playing: ${data.title}\n[00:05.00] Enjoy offline music with Sur player...`
    };

    // Filter out previous entries with matching title to avoid any duplicate songs in the library
    this.songs = [newSong, ...this.songs.filter(s => s.id !== songId && !areSongTitlesMatching(s.title, data.title))];
    this.saveSongs();
    this.notify();

    // Background fetch real synced lyrics from LRCLIB and cache into IndexedDB & localStorage
    fetchLyricsFromLRCLIB(data.title, data.artist, data.duration)
      .then((lrc) => {
        if (lrc?.syncedLyrics || lrc?.plainLyrics) {
          this.updateSongLyrics(songId, lrc.syncedLyrics || lrc.plainLyrics!);
        }
      })
      .catch(() => {});

    return newSong;
  }

  public toggleFavorite(songId: string) {
    this.songs = this.songs.map((song) => {
      if (song.id === songId) {
        const updated = { ...song, isFavorite: !song.isFavorite };
        
        this.playlists = this.playlists.map(pl => {
          if (pl.id === 'playlist_favs') {
            const exists = pl.songIds.includes(songId);
            const songIds = exists 
              ? pl.songIds.filter(id => id !== songId) 
              : [...pl.songIds, songId];
            return { ...pl, songIds };
          }
          return pl;
        });

        return updated;
      }
      return song;
    });

    this.saveSongs();
    this.savePlaylists();
    this.notify();
  }

  public createPlaylist(name: string): Playlist {
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      name,
      songIds: [],
      createdAt: new Date().toISOString()
    };
    this.playlists.push(newPlaylist);
    this.savePlaylists();
    this.notify();
    return newPlaylist;
  }

  public deletePlaylist(playlistId: string) {
    if (playlistId === 'playlist_favs') return;
    this.playlists = this.playlists.filter((p) => p.id !== playlistId);
    this.savePlaylists();
    this.notify();
  }

  public addSongToPlaylist(playlistId: string, songId: string) {
    this.playlists = this.playlists.map((pl) => {
      if (pl.id === playlistId && !pl.songIds.includes(songId)) {
        return { ...pl, songIds: [...pl.songIds, songId] };
      }
      return pl;
    });
    this.savePlaylists();
    this.notify();
  }

  public removeSongFromPlaylist(playlistId: string, songId: string) {
    this.playlists = this.playlists.map((pl) => {
      if (pl.id === playlistId) {
        return { ...pl, songIds: pl.songIds.filter(id => id !== songId) };
      }
      return pl;
    });
    this.savePlaylists();
    this.notify();
  }

  public async addScannedSongs(files: FileList | File[], isYoutube = false, ytArtist?: string) {
    const themes = [
      'from-emerald-950/70 to-zinc-950',
      'from-indigo-950/70 to-zinc-950',
      'from-violet-950/70 to-zinc-950',
      'from-cyan-950/70 to-zinc-950',
      'from-rose-950/70 to-zinc-950',
      'from-teal-950/70 to-zinc-950',
      'from-slate-900/80 to-zinc-950',
      'from-zinc-900 to-zinc-950'
    ];

    const newSongs: Song[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.m4a') && !file.name.endsWith('.flac') && !file.name.endsWith('.wav')) {
        continue;
      }

      let title = file.name.replace(/\.[^/.]+$/, "");
      title = title.replace(/[-_]/g, " ");

      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      const exists = this.songs.some(s => s.title.toLowerCase().trim() === title.toLowerCase().trim() && s.size === sizeStr);
      if (exists) {
        continue;
      }
      
      let accurateDuration = 0;
      try {
        accurateDuration = await getMediaDuration(file);
      } catch (e) {}

      const duration = accurateDuration > 0 ? accurateDuration : Math.max(30, Math.floor((file.size / (128 * 1024)) * 8)); 
      const format = file.name.split('.').pop()?.toUpperCase() || 'MP3';

      let folderName = 'Internal Storage';
      if (isYoutube) {
        folderName = 'YouTube Downloads';
      } else if (file.name.toLowerCase().includes('download')) {
        folderName = 'Downloads';
      } else if (file.name.toLowerCase().includes('whatsapp')) {
        folderName = 'WhatsApp Audio';
      } else if (file.name.toLowerCase().includes('record')) {
        folderName = 'Voice Records';
      }

      const songId = `scanned_${Date.now()}_${i}`;

      // Save the actual file binary Blob to IndexedDB
      await songStoreDB.saveSongFile(songId, file);

      const song: Song = {
        id: songId,
        title: title,
        artist: isYoutube ? (ytArtist || 'YouTube Video') : 'Unknown Artist',
        album: isYoutube ? 'YouTube Downloads' : 'Local Album',
        duration: duration,
        url: URL.createObjectURL(file),
        size: sizeStr,
        format: format,
        genre: isYoutube ? 'YouTube' : 'Offline Local',
        year: new Date().getFullYear().toString(),
        isFavorite: false,
        folderName: folderName,
        isYoutubeDownload: isYoutube,
        colorTheme: themes[Math.floor(Math.random() * themes.length)],
        lyrics: `[00:00.00] Playing YouTube Offline Track: ${title}\n[00:05.00] Enjoy offline music with Sur player...\n[00:30.00] Dynamic 5-Band Equalizer active!`
      };

      newSongs.push(song);
    }

    if (newSongs.length > 0) {
      this.songs = [...this.songs, ...newSongs];
      
      if (isYoutube) {
        this.playlists = this.playlists.map(pl => {
          if (pl.id === 'playlist_youtube') {
            const newIds = [...pl.songIds, ...newSongs.map(s => s.id)];
            return { ...pl, songIds: Array.from(new Set(newIds)) };
          }
          return pl;
        });
        this.savePlaylists();
      }

      this.saveSongs();
      this.notify();
    }
    return newSongs.length;
  }

  public editSongTags(songId: string, updatedFields: Partial<Song>) {
    this.songs = this.songs.map((song) => {
      if (song.id === songId) {
        return { ...song, ...updatedFields };
      }
      return song;
    });
    this.saveSongs();
    this.notify();
  }

  public async updateSongLyrics(songId: string, lyrics: string) {
    let updated = false;
    this.songs = this.songs.map((song) => {
      if (song.id === songId || areSongTitlesMatching(song.title, songId)) {
        updated = true;
        return { ...song, lyrics };
      }
      return song;
    });
    if (updated) {
      this.saveSongs();
      await songStoreDB.saveLyrics(songId, lyrics);
      this.notify();
    }
  }

  public async deleteSong(songId: string, deleteFile = true) {
    const songToDelete = this.songs.find(s => s.id === songId);
    if (songToDelete && songToDelete.url && songToDelete.url.startsWith('blob:') && deleteFile) {
      try {
        URL.revokeObjectURL(songToDelete.url);
      } catch (e) {}
    }

    this.songs = this.songs.filter((song) => song.id !== songId);
    
    this.playlists = this.playlists.map((pl) => ({
      ...pl,
      songIds: pl.songIds.filter(id => id !== songId)
    }));

    // Only permanently remove binary from IndexedDB if deleteFile is true!
    if (deleteFile) {
      await songStoreDB.deleteSongFile(songId);
    }

    this.saveSongs();
    this.savePlaylists();
    this.notify();
  }
}

export const libraryStore = new LibraryStore();
