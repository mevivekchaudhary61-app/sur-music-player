/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Pause, Trash2, Music, Download, RotateCcw, CheckCircle2, Clock, AlertCircle, Video, X, FileDown } from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';
import { usePlayer, useLibrary } from '../store/usePlayerStore';
import { AppTheme, ThemeStyle, AccentStyle, ACCENT_MAP, getThemeClasses } from '../types/theme';

interface DownloadScreenProps {
  theme?: AppTheme;
  style?: ThemeStyle;
  accentStyle?: AccentStyle;
}

export const DownloadScreen: React.FC<DownloadScreenProps> = ({
  theme = 'dark',
  style: propStyle,
  accentStyle: propAccentStyle
}) => {
  const resolvedStyle = propStyle || getThemeClasses(theme);
  const resolvedAccent = propAccentStyle || ACCENT_MAP.emerald;
  const isLight = theme === 'light';

  const {
    currentUrl,
    currentQuality,
    currentFormat,
    downloads,
    activeDownloadsCount,
    setUrl,
    setQuality,
    setFormat,
    queueDownload,
    stopTask,
    continueTask,
    retryTask,
    deleteDownload,
    clearAll
  } = useDownloadStore();

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);
  const [previewVideoItem, setPreviewVideoItem] = useState<any | null>(null);
  const player = usePlayer();
  const library = useLibrary();

  const handleQueueDownload = async () => {
    if (!currentUrl.trim()) return;
    
    const isVideo = currentFormat === 'mp4';
    await queueDownload();
    
    setToastMsg(isVideo ? "YouTube Video/Shorts download start ho gaya!" : "YouTube Song download start ho gaya!");
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const handleSaveToDevice = (item: any) => {
    if (!item.filePath) return;
    const link = document.createElement('a');
    link.href = item.filePath;
    const ext = item.format === 'mp4' ? 'mp4' : 'mp3';
    link.download = `${item.title.replace(/[\/\\?%*:|"<>.]/g, '')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg("File aapke device download folder mein save ho rahi hai!");
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    
    // Check if currently playing
    const matchingSong = library.songs.find(
      s => s.title.toLowerCase() === deleteConfirmItem.title.toLowerCase() ||
           s.title.toLowerCase().includes(deleteConfirmItem.title.toLowerCase())
    );
    if (matchingSong && player.state.currentSongId === matchingSong.id) {
      player.pause();
    }

    await deleteDownload(deleteConfirmItem.id, true);
    setDeleteConfirmItem(null);

    setToastMsg("Gaana local storage se permanently delete ho gaya!");
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const handleRemoveListOnly = async () => {
    if (!deleteConfirmItem) return;
    // false = keeps file in local storage!
    await deleteDownload(deleteConfirmItem.id, false);
    setDeleteConfirmItem(null);

    setToastMsg("Track list se delete ho gaya (Local file storage mein safe hai)!");
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const handleConfirmClearAll = async () => {
    await clearAll(true);
    setShowClearAllConfirm(false);
    setToastMsg("Saare songs local database aur storage se delete ho gaye!");
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const formatDuration = (secs: number) => {
    if (!secs || secs <= 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0.0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const inProgressTasks = downloads.filter(i => i.status === 'fetching' || i.status === 'downloading' || i.status === 'paused');
  const activeTasks = downloads.filter(i => i.status === 'fetching' || i.status === 'downloading');
  const completedTasks = downloads.filter(i => !i.status || i.status === 'completed');
  const errorTasks = downloads.filter(i => i.status === 'error');
  const totalStorageBytes = completedTasks.reduce((acc, item) => acc + (item.size || 0), 0);

  return (
    <div className="space-y-6 pb-28 animate-slide-up w-full max-w-full overflow-hidden box-border">
      {/* HEADER */}
      <div className="flex items-center gap-3 pb-1">
        <div className={`w-10 h-10 rounded-2xl ${isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : `${resolvedAccent.badgeBg} border ${resolvedAccent.badgeBorder} ${resolvedAccent.text} shadow-lg ${resolvedAccent.glow}`} border flex items-center justify-center flex-shrink-0`}>
          <Download className={`w-5 h-5 ${isLight ? resolvedAccent.text : 'animate-pulse'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`text-base font-black uppercase tracking-wider ${resolvedStyle.textPrimary} flex items-center gap-1.5 truncate`}>
            <span>YouTube Downloader</span>
          </h2>
          <p className={`text-[10px] ${resolvedStyle.textMuted} truncate`}>Download any YouTube Video, Shorts, Song or Podcast to offline library</p>
        </div>
      </div>

      {/* PASTE LINK CARD (MATCHED THEME) */}
      <div className={`p-4 sm:p-5 rounded-3xl border ${isLight ? 'bg-white border-zinc-200 shadow-sm text-zinc-900' : `${resolvedStyle.border} ${resolvedStyle.card}`} space-y-4 w-full max-w-full box-border overflow-hidden`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-bold uppercase tracking-wider ${resolvedStyle.textSecondary} flex items-center gap-2`}>
              <span className={`p-1.5 rounded-lg ${isLight ? 'bg-white border border-zinc-200 text-zinc-800 shadow-xs' : `${resolvedAccent.badgeBg} ${resolvedAccent.text} border ${resolvedAccent.badgeBorder}`} flex items-center justify-center`}>
                <Download className="w-3.5 h-3.5" />
              </span>
              <span>Paste YouTube Link or Search Query</span>
            </label>
            {currentUrl && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className={`text-[11px] font-semibold ${resolvedStyle.textMuted} hover:${resolvedStyle.textPrimary} transition-colors cursor-pointer`}
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <div className={`absolute left-3.5 ${resolvedAccent.text} flex items-center pointer-events-none`}>
              <Download className="w-4 h-4 opacity-90" />
            </div>
            <input
              type="text"
              placeholder="Paste any YouTube link (Videos, Shorts, Music) or type name..."
              value={currentUrl}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQueueDownload();
              }}
              className={`w-full pl-10 pr-4 py-3.5 border ${resolvedStyle.border} ${resolvedStyle.inputBg} rounded-2xl text-xs font-medium outline-none ${resolvedAccent.ring} transition-all`}
            />
          </div>
        </div>

        {/* FORMAT SELECTION (SONG AUDIO VS FULL VIDEO/SHORTS) */}
        <div className={`space-y-2 pt-1 border-t ${resolvedStyle.borderSubtle}`}>
          <div className={`flex items-center justify-between text-[11px] font-bold ${resolvedStyle.textMuted}`}>
            <span>Download Format:</span>
            <span className={`text-[10px] ${resolvedStyle.textDim} font-normal`}>
              {currentFormat === 'mp4' ? 'Full Video & Shorts (MP4)' : 'High-Fidelity Audio (MP3)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('mp3')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                currentFormat === 'mp3'
                  ? (isLight ? `bg-white border-2 ${resolvedAccent.border} shadow-sm text-zinc-900` : `${resolvedAccent.badgeBg} ${resolvedAccent.border} ${resolvedStyle.textPrimary} shadow-md ${resolvedAccent.glow}`)
                  : (isLight ? 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300 shadow-xs' : `${resolvedStyle.cardSecondary} ${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted} hover:${resolvedStyle.textPrimary}`)
              }`}
            >
              <div className={`p-2 rounded-xl ${
                currentFormat === 'mp3'
                  ? (isLight ? `${resolvedAccent.badgeBg} border ${resolvedAccent.badgeBorder} ${resolvedAccent.text} shadow-xs` : `${resolvedAccent.bg} shadow`)
                  : (isLight ? 'bg-white border border-zinc-200 text-zinc-600 shadow-xs' : `${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted}`)
              }`}>
                <Music className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">🎵 Song / Audio</p>
                <p className={`text-[10px] ${resolvedStyle.textMuted}`}>MP3 320kbps</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('mp4')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                currentFormat === 'mp4'
                  ? (isLight ? `bg-white border-2 ${resolvedAccent.border} shadow-sm text-zinc-900` : `${resolvedAccent.badgeBg} ${resolvedAccent.border} ${resolvedStyle.textPrimary} shadow-md ${resolvedAccent.glow}`)
                  : (isLight ? 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300 shadow-xs' : `${resolvedStyle.cardSecondary} ${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted} hover:${resolvedStyle.textPrimary}`)
              }`}
            >
              <div className={`p-2 rounded-xl ${
                currentFormat === 'mp4'
                  ? (isLight ? `${resolvedAccent.badgeBg} border ${resolvedAccent.badgeBorder} ${resolvedAccent.text} shadow-xs` : `${resolvedAccent.bg} shadow`)
                  : (isLight ? 'bg-white border border-zinc-200 text-zinc-600 shadow-xs' : `${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted}`)
              }`}>
                <Video className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">🎬 Video & Shorts</p>
                <p className={`text-[10px] ${resolvedStyle.textMuted}`}>MP4 720p HD</p>
              </div>
            </button>
          </div>

          {/* QUALITY PRESET */}
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className={`${resolvedStyle.textMuted} font-medium`}>Quality:</span>
            {currentFormat === 'mp3' ? (
              <div className="flex items-center gap-1.5">
                {(['320', '192', '128'] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      currentQuality === q
                        ? `${resolvedAccent.bg} shadow-sm`
                        : (isLight ? 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted} hover:${resolvedStyle.textPrimary}`)
                    }`}
                  >
                    {q}kbps {q === '320' ? '★' : ''}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className={`px-2.5 py-1 rounded-lg ${resolvedAccent.bg} shadow-sm`}>720p HD</span>
                <span className={`px-2 py-1 rounded-lg ${isLight ? 'bg-white border border-zinc-200 text-zinc-700 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted}`}`}>Synced Audio</span>
              </div>
            )}
          </div>
        </div>

        {/* CONVERT / DOWNLOAD BUTTON */}
        <button
          onClick={handleQueueDownload}
          disabled={!currentUrl.trim()}
          className={`w-full py-3.5 bg-gradient-to-r ${resolvedAccent.gradient} ${resolvedAccent.glow} disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer`}
        >
          <Download className="w-4 h-4" />
          <span>{currentFormat === 'mp4' ? 'Download YouTube Video / Short (MP4)' : 'Download YouTube Song / Track (MP3)'}</span>
        </button>
      </div>

      {/* QUICK QUEUED TOAST NOTIFICATION */}
      {toastMsg && (
        <div className={`p-3 rounded-2xl ${resolvedAccent.badgeBg} border ${resolvedAccent.badgeBorder} ${resolvedAccent.text} text-xs font-medium flex items-center gap-2.5 animate-slide-up shadow-lg w-full max-w-full box-border`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* DOWNLOAD SECTION (ACTIVE DOWNLOADS + COMPLETED) */}
      <div className="space-y-4 pt-1 w-full max-w-full box-border">
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <Download className={`w-4 h-4 ${resolvedAccent.text}`} />
            <h3 className={`text-xs font-black uppercase tracking-wider ${resolvedStyle.textPrimary}`}>
              Download Section
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {totalStorageBytes > 0 && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isLight ? 'bg-white border border-zinc-200 text-zinc-800 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted}`}`} title="Offline Local Storage Used">
                💾 {formatSize(totalStorageBytes)}
              </span>
            )}
            {activeTasks.length > 0 && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${resolvedAccent.badgeBg} border ${resolvedAccent.badgeBorder} ${resolvedAccent.text} animate-pulse flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                {activeTasks.length} Downloading
              </span>
            )}
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isLight ? 'bg-white border border-zinc-200 text-zinc-800 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle} ${resolvedStyle.textMuted}`}`}>
              {downloads.length} Total
            </span>
          </div>
        </div>

        {/* 1. IN-PROGRESS & PAUSED DOWNLOADS QUEUE */}
        {inProgressTasks.length > 0 && (
          <div className="space-y-2.5 w-full max-w-full box-border">
            <div className={`flex items-center justify-between text-[11px] font-bold ${resolvedAccent.text}`}>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Active & Paused Downloads ({inProgressTasks.length})</span>
              </div>
              <span className={`text-[10px] ${resolvedStyle.textDim} font-normal`}>Stop / Continue anytime</span>
            </div>
            
            {inProgressTasks.map((task) => {
              const isPaused = task.status === 'paused';
              const isRunning = task.status === 'downloading' || task.status === 'fetching';

              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 shadow-md transition-all w-full max-w-full box-border overflow-hidden ${
                    isPaused 
                      ? (isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : `${resolvedStyle.cardSecondary} ${resolvedStyle.borderSubtle}`)
                      : (isLight ? `bg-white border-2 ${resolvedAccent.border} shadow-md text-zinc-900` : `${resolvedStyle.card} ${resolvedAccent.border} shadow-lg ${resolvedAccent.glow} animate-pulse-subtle`)
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl ${isLight ? 'bg-white border border-zinc-200 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle}`} flex items-center justify-center relative overflow-hidden flex-shrink-0`}>
                        {task.thumbnail ? (
                          <img src={task.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Download className={`w-4 h-4 ${isPaused ? (isLight ? 'text-zinc-500' : resolvedStyle.textMuted) : `${resolvedAccent.text} animate-bounce`}`} />
                        )}
                        {isPaused && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Pause className="w-3.5 h-3.5 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-bold ${resolvedStyle.textPrimary} truncate`}>
                          {task.title}
                        </h4>
                        <p className={`text-[10px] truncate flex items-center gap-1.5 mt-0.5 ${isPaused ? (isLight ? 'text-zinc-500' : resolvedStyle.textMuted) : resolvedAccent.text}`}>
                          <span className={`font-mono ${isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle}`} px-1.5 py-0.5 rounded text-[8px] uppercase`}>
                            {task.format || 'MP3'}
                          </span>
                          <span>•</span>
                          <span>{task.stageText || (isPaused ? 'Stopped (Paused)' : 'Converting...')}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-mono font-black ${resolvedAccent.text}`}>
                        {task.progress || 15}%
                      </span>

                      {/* STOP / CONTINUE CONTROL BUTTONS */}
                      {isRunning && (
                        <button
                          onClick={() => stopTask(task.id)}
                          className={`px-2.5 py-1.5 rounded-xl ${resolvedAccent.badgeBg} border ${resolvedAccent.badgeBorder} ${resolvedAccent.text} text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm`}
                          title="Stop / Pause Download"
                        >
                          <Pause className="w-3 h-3 fill-current" />
                          <span>Stop</span>
                        </button>
                      )}

                      {isPaused && (
                        <button
                          onClick={() => continueTask(task.id)}
                          className={`px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm`}
                          title="Continue / Resume Download"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Continue</span>
                        </button>
                      )}

                      {/* DELETE / CANCEL BUTTON */}
                      <button
                        onClick={() => setDeleteConfirmItem(task)}
                        className={`p-1.5 ${resolvedStyle.textMuted} hover:text-rose-500 transition-colors cursor-pointer`}
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className={`w-full h-1.5 ${resolvedStyle.cardSecondary} rounded-full overflow-hidden border ${resolvedStyle.borderSubtle}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 shadow-sm ${
                        isPaused 
                          ? 'bg-zinc-500' 
                          : `bg-gradient-to-r ${resolvedAccent.gradient} ${resolvedAccent.glow}`
                      }`}
                      style={{ width: `${task.progress || 15}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. FAILED TASKS (WITH RETRY BUTTON) */}
        {errorTasks.length > 0 && (
          <div className="space-y-2 w-full max-w-full box-border">
            {errorTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-3 text-rose-500 text-xs w-full max-w-full box-border overflow-hidden"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold truncate ${resolvedStyle.textPrimary}`}>{task.title}</p>
                    <p className="text-[10px] text-rose-400 truncate">{task.errorMessage || 'Conversion failed'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => retryTask(task.id)}
                    className={`px-2.5 py-1.5 ${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle} ${resolvedStyle.textPrimary} text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer`}
                  >
                    <RotateCcw className="w-3 h-3 text-rose-500" />
                    <span>Retry</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmItem(task)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. COMPLETED DOWNLOADS LIST */}
        <div className="space-y-2 w-full max-w-full box-border">
          {downloads.length === 0 ? (
            <div className={`text-center py-10 rounded-3xl border border-dashed ${isLight ? 'bg-white border-zinc-200 text-zinc-800 shadow-sm' : `${resolvedStyle.borderSubtle} ${resolvedStyle.emptyCardBg} ${resolvedStyle.textMuted}`} text-xs space-y-1 w-full max-w-full box-border overflow-hidden`}>
              <Download className={`w-8 h-8 mx-auto opacity-35 ${isLight ? resolvedAccent.text : resolvedStyle.textMuted} animate-bounce`} />
              <p className={`font-bold ${resolvedStyle.textPrimary}`}>No downloads yet!</p>
              <p className={`text-[10px] ${resolvedStyle.textMuted} px-8 leading-relaxed`}>
                Paste link above and tap "Download" — it will download right here while you paste the next song!
              </p>
            </div>
          ) : (
            <>
              {completedTasks.length > 0 && (
                <div className="space-y-2.5 w-full max-w-full box-border">
                  {completedTasks.map((item) => {
                    const isCurrent = player.isCurrentSong(item.id);
                    const isPlaying = isCurrent && player.state.isPlaying;

                    const handlePlay = (e?: React.MouseEvent) => {
                      if (e) e.stopPropagation();
                      if (item.format === 'mp4') {
                        setPreviewVideoItem(item);
                      } else {
                        player.playOrToggle(item.id);
                      }
                    };

                    return (
                      <div
                        key={item.id}
                        onClick={handlePlay}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer w-full max-w-full box-border overflow-hidden ${
                          isCurrent 
                            ? (isLight ? `bg-white border-2 ${resolvedAccent.border} shadow-md` : `${resolvedStyle.card} ${resolvedAccent.border} shadow-lg ${resolvedAccent.glow}`)
                            : (isLight ? 'bg-white border-zinc-200 shadow-sm hover:border-zinc-300' : `${resolvedStyle.card} ${resolvedStyle.border} ${resolvedStyle.cardHover}`)
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${isLight ? 'bg-white border border-zinc-200 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle}`} flex items-center justify-center relative overflow-hidden flex-shrink-0`}>
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : item.format === 'mp4' ? (
                              <Video className={`w-4 h-4 ${resolvedAccent.text}`} />
                            ) : (
                              <Music className={`w-4 h-4 ${isCurrent ? resolvedAccent.text : isLight ? 'text-zinc-700' : resolvedStyle.textMuted}`} />
                            )}
                            {item.format === 'mp4' ? (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 fill-current text-white" />
                              </div>
                            ) : isCurrent ? (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                {isPlaying ? (
                                  <Pause className={`w-3.5 h-3.5 fill-current ${resolvedAccent.text} animate-pulse`} />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                                )}
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs font-bold truncate ${isCurrent ? resolvedAccent.text : resolvedStyle.textPrimary}`}>
                              {item.title}
                            </h4>
                            <p className={`text-[10px] ${resolvedStyle.textMuted} mt-0.5 truncate flex items-center gap-1.5 min-w-0`}>
                              {item.duration > 0 && <span className="flex-shrink-0">{formatDuration(item.duration)}</span>}
                              {item.duration > 0 && <span className="flex-shrink-0">•</span>}
                              <span className={`font-mono ${isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle}`} px-1.5 py-0.5 rounded text-[8px] uppercase flex-shrink-0`}>
                                {item.format || 'MP3'}
                              </span>
                              {item.size > 0 && <span className="flex-shrink-0">•</span>}
                              {item.size > 0 && (
                                <span className={`font-mono ${isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-700' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle}`} px-1.5 py-0.5 rounded text-[8px] flex-shrink-0`}>
                                  {formatSize(item.size)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* SAVE TO DEVICE BUTTON */}
                          <button
                            onClick={() => handleSaveToDevice(item)}
                            className={`p-2 ${isLight ? 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle}`} hover:${resolvedAccent.text} rounded-xl transition-all cursor-pointer`}
                            title="Save to Phone / Device Downloads"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>

                          {/* WATCH VIDEO BUTTON (FOR MP4) */}
                          {item.format === 'mp4' && (
                            <button
                              onClick={() => setPreviewVideoItem(item)}
                              className={`px-2.5 py-1.5 ${isLight ? 'bg-white border border-zinc-200 text-zinc-900 shadow-xs hover:bg-zinc-50' : `${resolvedAccent.badgeBg} ${resolvedAccent.text} border ${resolvedAccent.badgeBorder}`} rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer`}
                              title="Watch Video"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Play</span>
                            </button>
                          )}

                          {/* DELETE BUTTON */}
                          <button
                            onClick={() => setDeleteConfirmItem(item)}
                            className={`p-2 ${isLight ? 'bg-white border border-zinc-200 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 shadow-xs' : `${resolvedStyle.textMuted} hover:text-rose-500 border border-transparent`} rounded-xl transition-all cursor-pointer`}
                            title="Delete Options"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {downloads.length > 0 && (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className={`w-full py-2.5 ${isLight ? 'bg-white border border-zinc-200 text-rose-600 hover:bg-rose-50 shadow-xs' : `${resolvedStyle.cardSecondary} border ${resolvedStyle.borderSubtle} text-rose-500 hover:text-rose-600`} font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer box-border`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Downloads (Free Storage)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* OFFLINE VIDEO PLAYER MODAL */}
      {previewVideoItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-lg ${resolvedStyle.modalBg} rounded-3xl overflow-hidden space-y-3 p-4`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <Video className={`w-4 h-4 ${resolvedAccent.text} flex-shrink-0`} />
                <h3 className={`text-xs font-bold ${resolvedStyle.textPrimary} truncate`}>{previewVideoItem.title}</h3>
              </div>
              <button
                onClick={() => setPreviewVideoItem(null)}
                className={`p-1.5 rounded-full ${resolvedStyle.cardSecondary} ${resolvedStyle.textMuted} hover:${resolvedStyle.textPrimary} transition-all cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-900 relative flex items-center justify-center">
              <video
                src={previewVideoItem.filePath}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className={`text-[10px] ${resolvedStyle.textMuted}`}>Offline YouTube Video</span>
              <button
                onClick={() => handleSaveToDevice(previewVideoItem)}
                className={`px-4 py-2 bg-gradient-to-r ${resolvedAccent.gradient} text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer`}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Save to Device</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE ITEM PERMANENT DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl border bg-zinc-950 border-zinc-800 text-white space-y-4 shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Permanently Delete Song?</h3>
              <p className="text-xs font-bold text-rose-400 truncate px-2">{deleteConfirmItem.title}</p>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Yeh song Sur app ke offline database aur local memory se hamesha ke liye delete ho jayega. Storage free ho jayegi.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl border bg-zinc-950 border-zinc-800 text-white space-y-4 shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Clear All Local Downloads?</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Aapke saare downloaded audio tracks app ke offline database aur history se permanently delete ho jayenge aur device storage free ho jayegi.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DownloadScreen;

