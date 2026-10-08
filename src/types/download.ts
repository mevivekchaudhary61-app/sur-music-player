/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number; // in seconds
}

export type TaskStatus = 'fetching' | 'downloading' | 'paused' | 'completed' | 'error';

export interface DownloadItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  size: number; // in bytes
  quality: string;
  format?: 'mp3' | 'mp4';
  filePath: string;
  createdAt: number;
  status?: TaskStatus;
  progress?: number;
  stageText?: string;
  errorMessage?: string;
  sourceUrl?: string;
}

export type DownloadStatus = 'idle' | 'fetching' | 'downloading' | 'done' | 'error';
