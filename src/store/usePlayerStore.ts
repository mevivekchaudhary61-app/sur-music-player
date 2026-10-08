/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { audioEngine, EQUALIZER_PRESETS } from '../utils/audioEngine';
import { libraryStore, Song, areSongTitlesMatching } from './useLibraryStore';
import { downloadStore } from './downloadStore';

export interface PlayerState {
  currentSongId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  queue: string[];
  currentIndex: number;
  sleepTimer: {
    duration: number; // original minutes
    timeLeft: number; // remaining seconds
    active: boolean;
  };
  equalizer: number[]; // 5 band gains
  currentPresetName: string;
}

class PlayerStore {
  private state: PlayerState = {
    currentSongId: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    repeat: 'all',
    queue: [],
    currentIndex: -1,
    sleepTimer: { duration: 0, timeLeft: 0, active: false },
    equalizer: [0, 0, 0, 0, 0],
    currentPresetName: 'Flat',
  };

  private listeners: (() => void)[] = [];
  private timerInterval: any = null;

  constructor() {
    this.loadFromStorage();
    this.setupAudioListeners();
  }

  private loadFromStorage() {
    try {
      const storedSettings = localStorage.getItem('sur_player_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        this.state.volume = parsed.volume ?? 0.8;
        this.state.shuffle = parsed.shuffle ?? false;
        this.state.repeat = parsed.repeat ?? 'all';
        this.state.equalizer = parsed.equalizer ?? [0, 0, 0, 0, 0];
        this.state.currentPresetName = parsed.currentPresetName ?? 'Flat';
        
        audioEngine.setVolume(this.state.volume);
        audioEngine.applyPreset(this.state.equalizer);
      }
    } catch (e) {
      console.error('Failed to load player settings', e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('sur_player_settings', JSON.stringify({
        volume: this.state.volume,
        shuffle: this.state.shuffle,
        repeat: this.state.repeat,
        equalizer: this.state.equalizer,
        currentPresetName: this.state.currentPresetName
      }));
    } catch (e) {
      console.error('Failed to save player settings', e);
    }
  }

  private setupAudioListeners() {
    audioEngine.addEventListener('timeupdate', () => {
      this.state.currentTime = Math.floor(audioEngine.audio.currentTime);
      this.notify();
    });

    audioEngine.addEventListener('durationchange', () => {
      const realDur = Math.floor(audioEngine.audio.duration || 0);
      if (realDur > 0 && isFinite(realDur)) {
        this.state.duration = realDur;
        if (this.state.currentSongId) {
          libraryStore.updateSongDuration(this.state.currentSongId, realDur);
          downloadStore.updateDuration(this.state.currentSongId, realDur);
        }
      }
      this.notify();
    });

    audioEngine.addEventListener('loadedmetadata', () => {
      const realDur = Math.floor(audioEngine.audio.duration || 0);
      if (realDur > 0 && isFinite(realDur)) {
        this.state.duration = realDur;
        if (this.state.currentSongId) {
          libraryStore.updateSongDuration(this.state.currentSongId, realDur);
          downloadStore.updateDuration(this.state.currentSongId, realDur);
        }
      }
      this.notify();
    });

    audioEngine.addEventListener('ended', () => {
      this.handleSongEnded();
    });

    audioEngine.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.notify();
    });

    audioEngine.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notify();
    });
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

  public getState(): PlayerState {
    return this.state;
  }

  private currentPlayRequestId = 0;

  // Play a song in a context queue
  public playSong(songId: string, customQueue?: string[]) {
    const songs = libraryStore.getSongs();
    const downloads = downloadStore.state.downloads;

    // 1. First check if song exists directly in library
    let song = songs.find(s => s.id === songId);

    // 2. Check if songId belongs to a download item
    const dl = downloads.find(d => d.id === songId);

    // 3. If playing a download, check if there is ALREADY an existing song in the library for this track!
    // (User requirement: DO NOT create a new song, CALL the existing song!)
    if (!song && dl) {
      song = songs.find(s => s.id === dl.id || areSongTitlesMatching(s.title, dl.title));
      if (song) {
        // Sync downloaded audio and thumbnail into the existing song so it plays smoothly
        if (dl.filePath && (!song.url || !song.url.startsWith('blob:'))) {
          song.url = dl.filePath;
        }
        if (dl.thumbnail && !song.thumbnail) {
          song.thumbnail = dl.thumbnail;
        }
      }
    }

    // 4. If STILL not in library, use download item directly without creating duplicate songs in library!
    let activeId = songId;
    if (song) {
      activeId = song.id;
    } else if (dl) {
      activeId = dl.id;
      song = {
        id: dl.id,
        title: dl.title,
        artist: 'YouTube Audio',
        album: 'YouTube Downloads',
        duration: dl.duration || 0,
        url: dl.filePath,
        size: dl.size ? `${(dl.size / (1024 * 1024)).toFixed(1)} MB` : '3.5 MB',
        format: dl.format || 'MP3',
        isFavorite: false,
        folderName: 'YouTube Downloads',
        isYoutubeDownload: true,
        colorTheme: 'from-emerald-950/70 to-zinc-950',
        thumbnail: dl.thumbnail,
        lyrics: `[00:00.00] Playing: ${dl.title}\n[00:05.00] Enjoy offline music with Sur player...`
      };
    }

    if (!song) return;

    // Forcefully stop any playing audio immediately
    audioEngine.stop();

    // Cancellation token for rapid consecutive clicks
    const requestId = ++this.currentPlayRequestId;

    // Determine Queue
    if (customQueue && customQueue.length > 0) {
      this.state.queue = [...customQueue];
    } else if (this.state.queue.length === 0 || !this.state.queue.includes(activeId)) {
      this.state.queue = songs.map(s => s.id);
      if (!this.state.queue.includes(activeId)) {
        this.state.queue.push(activeId);
      }
    }

    this.state.currentSongId = activeId;
    this.state.currentIndex = this.state.queue.indexOf(activeId);
    this.state.currentTime = 0;
    this.state.isPlaying = true; // Instantly update UI for immediate 1-click feedback
    this.notify();
    
    const resolveUrlPromise = song.url && !song.url.startsWith('blob:')
      ? Promise.resolve(song.url)
      : libraryStore.getPlayableUrl(activeId);

    resolveUrlPromise.then((playableUrl) => {
      // If a newer request was initiated while resolving URL, abort this one!
      if (requestId !== this.currentPlayRequestId) {
        return;
      }

      const finalUrl = playableUrl || song?.url || dl?.filePath;
      if (!finalUrl) {
        this.state.isPlaying = false;
        this.notify();
        return;
      }

      audioEngine.setSong(finalUrl);
      audioEngine.play()
        .then(() => {
          if (requestId !== this.currentPlayRequestId) {
            audioEngine.pause();
            return;
          }
          this.state.isPlaying = true;
          if (song) {
            this.updateMediaSession(song);
          }
          this.notify();
        })
        .catch((err: any) => {
          if (err?.name === 'AbortError' || err?.message?.includes('pause') || requestId !== this.currentPlayRequestId) {
            return;
          }
          if (requestId === this.currentPlayRequestId) {
            this.state.isPlaying = false;
            this.notify();
          }
        });
    });
  }

  // Checks if two song references belong to the same track (either matching IDs or matching title)
  public isSameSong(idA: string | null | undefined, idB: string | null | undefined): boolean {
    if (!idA || !idB) return false;
    if (idA === idB) return true;

    const songs = libraryStore.getSongs();
    const downloads = downloadStore.state.downloads;

    const songA = songs.find(s => s.id === idA);
    const songB = songs.find(s => s.id === idB);
    const dlA = downloads.find(d => d.id === idA);
    const dlB = downloads.find(d => d.id === idB);

    const titleA = (songA?.title || dlA?.title || '').trim();
    const titleB = (songB?.title || dlB?.title || '').trim();

    if (titleA && titleB && areSongTitlesMatching(titleA, titleB)) {
      return true;
    }
    return false;
  }

  public isCurrentSong(songId: string): boolean {
    return this.isSameSong(this.state.currentSongId, songId);
  }

  // If already playing the requested song, toggle pause/play on a single click! Otherwise start playing it.
  public playOrToggle(songId: string, customQueue?: string[]) {
    if (this.isCurrentSong(songId)) {
      this.togglePlay();
      return;
    }
    this.playSong(songId, customQueue);
  }

  public togglePlay() {
    if (!this.state.currentSongId) {
      const songs = libraryStore.getSongs();
      if (songs.length > 0) {
        this.playSong(songs[0].id);
      }
      return;
    }

    if (this.state.isPlaying) {
      this.state.isPlaying = false;
      this.notify();
      audioEngine.pause();
    } else {
      this.state.isPlaying = true;
      this.notify();
      audioEngine.play().catch((err: any) => {
        if (err?.name === 'AbortError' || err?.message?.includes('pause')) {
          return;
        }
        this.state.isPlaying = false;
        this.notify();
      });
    }
  }

  public pause() {
    if (this.state.isPlaying) {
      this.state.isPlaying = false;
      this.notify();
      audioEngine.pause();
    }
  }

  public next() {
    if (this.state.queue.length === 0) return;

    if (this.state.repeat === 'one') {
      this.seek(0);
      audioEngine.play();
      return;
    }

    let nextIndex = this.state.currentIndex + 1;

    if (this.state.shuffle) {
      // Play a random index in queue other than current if possible
      if (this.state.queue.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * this.state.queue.length);
        } while (nextIndex === this.state.currentIndex);
      } else {
        nextIndex = 0;
      }
    }

    if (nextIndex >= this.state.queue.length) {
      if (this.state.repeat === 'all') {
        nextIndex = 0;
      } else {
        // End of queue
        audioEngine.pause();
        this.state.isPlaying = false;
        this.state.currentTime = 0;
        this.notify();
        return;
      }
    }

    const nextSongId = this.state.queue[nextIndex];
    this.playSong(nextSongId);
  }

  public prev() {
    if (this.state.queue.length === 0) return;

    // If current time is past 3 seconds, just restart the song
    if (this.state.currentTime > 3) {
      this.seek(0);
      return;
    }

    let prevIndex = this.state.currentIndex - 1;

    if (this.state.shuffle) {
      if (this.state.queue.length > 1) {
        do {
          prevIndex = Math.floor(Math.random() * this.state.queue.length);
        } while (prevIndex === this.state.currentIndex);
      } else {
        prevIndex = 0;
      }
    }

    if (prevIndex < 0) {
      if (this.state.repeat === 'all') {
        prevIndex = this.state.queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    const prevSongId = this.state.queue[prevIndex];
    this.playSong(prevSongId);
  }

  public seek(seconds: number) {
    audioEngine.seek(seconds);
    this.state.currentTime = seconds;
    this.notify();
  }

  public setVolume(vol: number) {
    this.state.volume = vol;
    audioEngine.setVolume(vol);
    this.saveSettings();
    this.notify();
  }

  public toggleShuffle() {
    this.state.shuffle = !this.state.shuffle;
    this.saveSettings();
    this.notify();
  }

  public toggleRepeat() {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
    const currentIdx = modes.indexOf(this.state.repeat);
    this.state.repeat = modes[(currentIdx + 1) % modes.length];
    this.saveSettings();
    this.notify();
  }

  public handleSongEnded() {
    this.next();
  }

  public setEqualizerBand(index: number, value: number) {
    const updated = [...this.state.equalizer];
    updated[index] = value;
    this.state.equalizer = updated;
    this.state.currentPresetName = 'Custom';
    audioEngine.setEqualizerBand(index, value);
    this.saveSettings();
    this.notify();
  }

  public applyPreset(presetName: string) {
    const preset = EQUALIZER_PRESETS.find(p => p.name === presetName);
    if (!preset) return;

    this.state.equalizer = [...preset.gains];
    this.state.currentPresetName = preset.name;
    audioEngine.applyPreset(preset.gains);
    this.saveSettings();
    this.notify();
  }

  // Sleep Timer
  public startSleepTimer(minutes: number) {
    this.cancelSleepTimer();

    this.state.sleepTimer = {
      duration: minutes,
      timeLeft: minutes * 60,
      active: true
    };

    this.timerInterval = setInterval(() => {
      if (this.state.sleepTimer.timeLeft <= 1) {
        this.triggerSleepTimerPause();
      } else {
        this.state.sleepTimer.timeLeft -= 1;
        this.notify();
      }
    }, 1000);

    this.notify();
  }

  public cancelSleepTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.state.sleepTimer = { duration: 0, timeLeft: 0, active: false };
    this.notify();
  }

  private triggerSleepTimerPause() {
    this.cancelSleepTimer();
    audioEngine.pause();
    this.state.isPlaying = false;
    this.notify();
  }

  private updateMediaSession(song: Song) {
    audioEngine.updateMediaSession(
      {
        title: song.title,
        artist: song.artist,
        album: song.album,
        artwork: song.colorTheme // using for gradient backdrop simulation
      },
      () => this.togglePlay(),
      () => this.togglePlay(),
      () => this.next(),
      () => this.prev()
    );
  }

  // Queue reordering
  public setQueue(newQueue: string[]) {
    this.state.queue = newQueue;
    if (this.state.currentSongId) {
      this.state.currentIndex = newQueue.indexOf(this.state.currentSongId);
    }
    this.notify();
  }

  public removeSongFromQueue(songId: string) {
    this.state.queue = this.state.queue.filter(id => id !== songId);
    if (this.state.currentSongId === songId) {
      this.next();
    } else {
      if (this.state.currentSongId) {
        this.state.currentIndex = this.state.queue.indexOf(this.state.currentSongId);
      }
    }
    this.notify();
  }
}

export const playerStore = new PlayerStore();

export function usePlayer() {
  const [state, setState] = useState(playerStore.getState());

  useEffect(() => {
    return playerStore.subscribe(() => {
      setState({ ...playerStore.getState() });
    });
  }, []);

  return {
    state,
    playSong: (id: string, q?: string[]) => playerStore.playSong(id, q),
    playOrToggle: (id: string, q?: string[]) => playerStore.playOrToggle(id, q),
    togglePlay: () => playerStore.togglePlay(),
    pause: () => playerStore.pause(),
    next: () => playerStore.next(),
    prev: () => playerStore.prev(),
    seek: (sec: number) => playerStore.seek(sec),
    setVolume: (v: number) => playerStore.setVolume(v),
    toggleShuffle: () => playerStore.toggleShuffle(),
    toggleRepeat: () => playerStore.toggleRepeat(),
    setEqualizerBand: (i: number, v: number) => playerStore.setEqualizerBand(i, v),
    applyPreset: (p: string) => playerStore.applyPreset(p),
    startSleepTimer: (m: number) => playerStore.startSleepTimer(m),
    cancelSleepTimer: () => playerStore.cancelSleepTimer(),
    setQueue: (q: string[]) => playerStore.setQueue(q),
    removeSongFromQueue: (id: string) => playerStore.removeSongFromQueue(id),
    isCurrentSong: (id: string) => playerStore.isCurrentSong(id),
  };
}

export function useLibrary() {
  const [songs, setSongs] = useState(libraryStore.getSongs());
  const [playlists, setPlaylists] = useState(libraryStore.getPlaylists());

  useEffect(() => {
    return libraryStore.subscribe(() => {
      setSongs([...libraryStore.getSongs()]);
      setPlaylists([...libraryStore.getPlaylists()]);
    });
  }, []);

  return {
    songs,
    playlists,
    toggleFavorite: (id: string) => libraryStore.toggleFavorite(id),
    createPlaylist: (name: string) => libraryStore.createPlaylist(name),
    deletePlaylist: (id: string) => libraryStore.deletePlaylist(id),
    addSongToPlaylist: (pId: string, sId: string) => libraryStore.addSongToPlaylist(pId, sId),
    removeSongFromPlaylist: (pId: string, sId: string) => libraryStore.removeSongFromPlaylist(pId, sId),
    addScannedSongs: (files: FileList | File[]) => libraryStore.addScannedSongs(files),
    editSongTags: (id: string, fields: Partial<Song>) => libraryStore.editSongTags(id, fields),
    deleteSong: (id: string, deleteFile = true) => libraryStore.deleteSong(id, deleteFile),
    addOrGetSong: (data: any) => libraryStore.addOrGetSong(data),
    addDownloadedSong: (data: any) => libraryStore.addDownloadedSong(data),
    updateSongLyrics: (id: string, lyrics: string) => libraryStore.updateSongLyrics(id, lyrics),
  };
}
