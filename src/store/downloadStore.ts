/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { VideoInfo, DownloadItem, DownloadStatus, TaskStatus } from '../types/download';
import { fetchVideoInfo, requestMp3Download, getYouTubeId } from '../services/api';
import { libraryStore } from './useLibraryStore';
import { getMediaDuration } from '../utils/mediaDuration';

class DownloadStore {
  private url = '';
  private quality: '128' | '192' | '320' = '320';
  private format: 'mp3' | 'mp4' = 'mp3';
  private downloadedItems: DownloadItem[] = [];
  
  private listeners: (() => void)[] = [];
  private activeControllers = new Map<string, AbortController>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('sur_downloads_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Normalize any unfinished tasks on page reload
        this.downloadedItems = parsed.map((item: DownloadItem) => ({
          ...item,
          status: item.status === 'downloading' || item.status === 'fetching' ? 'error' : (item.status || 'completed'),
          errorMessage: (item.status === 'downloading' || item.status === 'fetching') ? 'Interrupted on reload' : item.errorMessage
        }));
      }
    } catch (e) {
      console.error('Failed to load downloads history:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('sur_downloads_history', JSON.stringify(this.downloadedItems));
    } catch (e) {
      console.error('Failed to save downloads history:', e);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    this.listeners.forEach(l => l());
  }

  // Getters
  public get state() {
    return {
      currentUrl: this.url,
      currentQuality: this.quality,
      currentFormat: this.format,
      downloads: this.downloadedItems,
      activeDownloadsCount: this.downloadedItems.filter(i => i.status === 'fetching' || i.status === 'downloading').length
    };
  }

  // Setters & Actions
  public setUrl(newUrl: string) {
    this.url = newUrl;
    this.emit();
  }

  public setQuality(newQuality: '128' | '192' | '320') {
    this.quality = newQuality;
    this.emit();
  }

  public setFormat(newFormat: 'mp3' | 'mp4') {
    this.format = newFormat;
    this.emit();
  }

  /**
   * Queue a new download task. Immediately clears the URL input box
   * and pushes the task to the Download section so user can paste another link!
   */
  public async queueDownload(overrideUrl?: string) {
    const rawUrl = (overrideUrl || this.url).trim();
    if (!rawUrl) return;

    const ytid = getYouTubeId(rawUrl);
    const chosenFormat = this.format;
    const chosenQuality = this.quality;

    const taskId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newTask: DownloadItem = {
      id: taskId,
      title: 'YouTube Media Task',
      thumbnail: ytid ? `https://img.youtube.com/vi/${ytid}/mqdefault.jpg` : '',
      duration: 0,
      size: 0,
      quality: chosenFormat === 'mp4' ? '720p Video' : `${chosenQuality}kbps`,
      format: chosenFormat,
      filePath: '',
      createdAt: Date.now(),
      status: 'fetching',
      progress: 10,
      stageText: 'Fetching details from YouTube...',
      sourceUrl: rawUrl
    };

    // Add to list immediately at the top
    this.downloadedItems = [newTask, ...this.downloadedItems];
    // Clear URL input field so user can enter another song immediately!
    this.url = '';
    this.saveToStorage();
    this.emit();

    // Start background processing for this specific task
    this.executeTask(taskId, rawUrl, chosenQuality, chosenFormat);
  }

  private async executeTask(taskId: string, url: string, quality: '128' | '192' | '320', format: 'mp3' | 'mp4') {
    const controller = new AbortController();
    this.activeControllers.set(taskId, controller);

    const updateTask = (patch: Partial<DownloadItem>) => {
      this.downloadedItems = this.downloadedItems.map(item => {
        if (item.id === taskId) {
          return { ...item, ...patch };
        }
        return item;
      });
      this.saveToStorage();
      this.emit();
    };

    let progressInterval: any = null;

    try {
      // 1. Fetch metadata info with fast 2.5s timeout (never hang at start)
      let info: VideoInfo | null = null;
      try {
        const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 2500));
        info = await Promise.race([
          fetchVideoInfo(url, undefined, controller.signal),
          timeoutPromise
        ]);
      } catch (e: any) {
        if (controller.signal.aborted) return;
        console.warn('Metadata fetch warning:', e);
      }

      if (controller.signal.aborted) return;

      const taskTitle = info?.title || (getYouTubeId(url) ? 'YouTube Media Track' : url.trim());
      const taskThumbnail = info?.thumbnail || (getYouTubeId(url) ? `https://img.youtube.com/vi/${getYouTubeId(url)}/mqdefault.jpg` : '');
      const taskDuration = info?.duration || 0;

      updateTask({
        title: taskTitle,
        thumbnail: taskThumbnail,
        duration: taskDuration,
        status: 'downloading',
        progress: 15,
        stageText: 'Connecting to YouTube audio stream...'
      });

      // Continuous dynamic progress ticker that NEVER freezes
      let currentProg = 15;
      let tickCount = 0;
      progressInterval = setInterval(() => {
        tickCount++;

        // Smooth gradual progression that never hard-stops
        if (currentProg < 50) {
          currentProg += Math.floor(Math.random() * 3) + 2; // fast start 15 -> 50
        } else if (currentProg < 75) {
          currentProg += Math.floor(Math.random() * 2) + 1; // steady 50 -> 75
        } else if (currentProg < 88) {
          if (tickCount % 2 === 0) currentProg += 1; // gentle 75 -> 88
        } else if (currentProg < 94) {
          if (tickCount % 4 === 0) currentProg += 1; // creeping 88 -> 94
        }

        // Live informative stage descriptions
        let currentStage = 'Converting MP3 audio...';
        if (currentProg < 35) {
          currentStage = 'Connecting to YouTube audio stream...';
        } else if (currentProg < 65) {
          currentStage = 'Extracting high-bitrate audio track...';
        } else if (currentProg < 85) {
          currentStage = 'Encoding 320kbps MP3 audio file...';
        } else {
          currentStage = 'Finalizing download & audio metadata...';
        }

        updateTask({
          progress: Math.min(94, currentProg),
          stageText: currentStage
        });
      }, 600);

      // 2. Request backend download & conversion with abort signal
      const result = await requestMp3Download(url, quality, format, controller.signal);

      if (controller.signal.aborted) {
        if (progressInterval) clearInterval(progressInterval);
        return;
      }

      if (progressInterval) clearInterval(progressInterval);

      const finalTitle = result.title || taskTitle;
      const finalThumbnail = (result as any).thumbnail || taskThumbnail;

      updateTask({
        title: finalTitle,
        thumbnail: finalThumbnail,
        progress: 95,
        stageText: 'Downloading to device memory...'
      });

      // 3. Fetch converted media binary with abort signal
      const fileRes = await fetch(result.downloadUrl, { signal: controller.signal });
      if (!fileRes.ok) {
        throw new Error('Could not fetch converted media binary from server.');
      }
      const blob = await fileRes.blob();

      if (controller.signal.aborted) return;

      const isMp4 = format === 'mp4';
      const fileExt = isMp4 ? 'mp4' : 'mp3';
      const mimeType = isMp4 ? 'video/mp4' : 'audio/mpeg';
      const fileName = result.fileName || `${finalTitle.replace(/[\\/?%*:|"<>.]/g, '')}.${fileExt}`;
      const file = new File([blob], fileName, { type: mimeType });

      // Determine accurate duration from binary Blob or server probe
      let exactBlobDuration = 0;
      try {
        exactBlobDuration = await getMediaDuration(blob, isMp4);
      } catch (e) {}

      const finalDuration = exactBlobDuration > 0
        ? exactBlobDuration
        : ((result as any).duration || info?.duration || taskDuration || 0);

      // 4. Save into App offline player database (if audio)
      if (!isMp4) {
        try {
          await libraryStore.addDownloadedSong({
            id: taskId,
            title: finalTitle,
            artist: info?.channel && info.channel !== 'YouTube' && info.channel !== 'YouTube Audio' ? info.channel : 'YouTube Audio',
            album: 'YouTube Downloads',
            duration: finalDuration,
            size: `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
            thumbnail: finalThumbnail,
            file: file,
            serverUrl: result.downloadUrl
          });
        } catch (dbErr) {
          console.warn('Failed to cache downloaded song in IndexedDB:', dbErr);
        }
      }

      // 5. Complete task silently inside app without triggering Chrome browser download popup
      updateTask({
        title: finalTitle,
        thumbnail: finalThumbnail,
        status: 'completed',
        progress: 100,
        size: blob.size,
        duration: finalDuration,
        filePath: result.downloadUrl,
        stageText: 'Completed'
      });

    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      if (controller.signal.aborted || err?.name === 'AbortError') {
        // User deliberately stopped or deleted the download, don't mark as error!
        console.log(`[DownloadStore] Download ${taskId} aborted.`);
        return;
      }
      updateTask({
        status: 'error',
        progress: 0,
        errorMessage: err.message || 'Conversion failed. Please retry.'
      });
    } finally {
      this.activeControllers.delete(taskId);
    }
  }

  // Stop/Pause an in-progress download task
  public stopTask(taskId: string) {
    const controller = this.activeControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(taskId);
    }

    this.downloadedItems = this.downloadedItems.map(item => {
      if (item.id === taskId) {
        return {
          ...item,
          status: 'paused',
          stageText: 'Download stopped (Paused)',
          errorMessage: undefined
        };
      }
      return item;
    });
    this.saveToStorage();
    this.emit();
  }

  // Continue/Resume a paused download task
  public continueTask(taskId: string) {
    const task = this.downloadedItems.find(i => i.id === taskId);
    if (!task || !task.sourceUrl) return;

    // Clean any previous aborted controller
    const existingCtrl = this.activeControllers.get(taskId);
    if (existingCtrl) {
      existingCtrl.abort();
      this.activeControllers.delete(taskId);
    }

    this.downloadedItems = this.downloadedItems.map(item => {
      if (item.id === taskId) {
        return {
          ...item,
          status: 'downloading',
          progress: Math.max(15, item.progress || 15),
          stageText: 'Continuing download...',
          errorMessage: undefined
        };
      }
      return item;
    });
    this.saveToStorage();
    this.emit();

    const chosenFormat = task.format || 'mp3';
    const chosenQuality = (task.quality.includes('128') ? '128' : task.quality.includes('192') ? '192' : '320') as '128'|'192'|'320';
    this.executeTask(taskId, task.sourceUrl, chosenQuality, chosenFormat);
  }

  public retryTask(taskId: string) {
    this.continueTask(taskId);
  }

  public async deleteDownload(id: string, alsoFromLibrary = true) {
    // Abort if active
    const controller = this.activeControllers.get(id);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(id);
    }

    const item = this.downloadedItems.find(i => i.id === id);
    this.downloadedItems = this.downloadedItems.filter(item => item.id !== id);
    this.saveToStorage();
    this.emit();

    if (alsoFromLibrary && item) {
      try {
        const allSongs = libraryStore.getSongs();
        const match = allSongs.find(
          s => s.id === id ||
               s.title.toLowerCase().trim() === item.title.toLowerCase().trim() ||
               (s.album === 'YouTube Downloads' && s.title.toLowerCase().includes(item.title.toLowerCase())) ||
               (s.album === 'YouTube Downloads' && item.title.toLowerCase().includes(s.title.toLowerCase()))
        );
        if (match) {
          await libraryStore.deleteSong(match.id);
        }
      } catch (e) {
        console.warn('Error deleting corresponding library song:', e);
      }
    }
  }

  public async clearAll(alsoFromLibrary = true) {
    // Abort all active downloads
    this.activeControllers.forEach(ctrl => ctrl.abort());
    this.activeControllers.clear();

    if (alsoFromLibrary) {
      for (const item of this.downloadedItems) {
        try {
          const allSongs = libraryStore.getSongs();
          const match = allSongs.find(
            s => s.title.toLowerCase().trim() === item.title.toLowerCase().trim()
          );
          if (match) {
            await libraryStore.deleteSong(match.id);
          }
        } catch (e) {}
      }
    }
    this.downloadedItems = [];
    this.saveToStorage();
    this.emit();
  }

  public updateDuration(id: string, duration: number) {
    if (!duration || duration <= 0) return;
    let changed = false;
    this.downloadedItems = this.downloadedItems.map(item => {
      if (item.id === id || (item.title && id && item.title.toLowerCase().trim() === id.toLowerCase().trim())) {
        if (item.duration !== duration) {
          changed = true;
          return { ...item, duration };
        }
      }
      return item;
    });
    if (changed) {
      this.saveToStorage();
      this.emit();
    }
  }
}

export const downloadStore = new DownloadStore();

// React hook for easy store consumption
export function useDownloadStore() {
  const [state, setState] = useState(downloadStore.state);

  useEffect(() => {
    return downloadStore.subscribe(() => {
      setState(downloadStore.state);
    });
  }, []);

  return {
    ...state,
    setUrl: (url: string) => downloadStore.setUrl(url),
    setQuality: (quality: '128' | '192' | '320') => downloadStore.setQuality(quality),
    setFormat: (format: 'mp3' | 'mp4') => downloadStore.setFormat(format),
    queueDownload: (overrideUrl?: string) => downloadStore.queueDownload(overrideUrl),
    stopTask: (taskId: string) => downloadStore.stopTask(taskId),
    continueTask: (taskId: string) => downloadStore.continueTask(taskId),
    retryTask: (taskId: string) => downloadStore.retryTask(taskId),
    deleteDownload: (id: string, alsoFromLibrary?: boolean) => downloadStore.deleteDownload(id, alsoFromLibrary),
    clearAll: (alsoFromLibrary?: boolean) => downloadStore.clearAll(alsoFromLibrary)
  };
}
