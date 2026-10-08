/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Heart,
  Search,
  Settings as SettingsIcon,
  Music,
  Disc,
  Folder,
  ListMusic,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Sliders,
  Timer,
  UploadCloud,
  Edit3,
  Info,
  Moon,
  Sun,
  Sparkles,
  Check,
  MoreVertical,
  PlayCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { usePlayer, useLibrary } from './store/usePlayerStore';
import { useDownloadStore } from './store/downloadStore';
import { Song } from './store/useLibraryStore';
import { EQUALIZER_PRESETS } from './utils/audioEngine';
import { DownloadScreen } from './screens/DownloadScreen';
import { fetchLyricsFromLRCLIB, searchLyricsList, LyricSearchResult } from './services/lyricsService';
import { AboutSection } from './components/AboutSection';
import { AppTheme, AccentColor, AccentStyle, ThemeStyle, ACCENT_MAP, getThemeClasses } from './types/theme';

export default function App() {
  // Navigation & Screen Control
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'downloads' | 'search' | 'settings'>('home');
  const [showNowPlaying, setShowNowPlaying] = useState<boolean>(false);
  const [showEqModal, setShowEqModal] = useState<boolean>(false);
  const [showTimerModal, setShowTimerModal] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
  
  // Custom states
  const [theme, setTheme] = useState<AppTheme>('amoled');
  const [accent, setAccent] = useState<AccentColor>('emerald');
  
  // Modals / Input states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState<boolean>(false);
  const [selectedPlaylistDetail, setSelectedPlaylistDetail] = useState<string | null>(null);

  // Folder browser, album, artist states
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [librarySubTab, setLibrarySubTab] = useState<'songs' | 'albums' | 'artists' | 'playlists' | 'folders'>('songs');

  // Scanner UI
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scannedCount, setScannedCount] = useState<number>(0);
  
  // Metadata tags editor modal
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editArtist, setEditArtist] = useState<string>('');
  const [editAlbum, setEditAlbum] = useState<string>('');
  const [editGenre, setEditGenre] = useState<string>('');
  
  // Context menu
  const [contextSong, setContextSong] = useState<Song | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  // Synced Lyrics real-time states
  const [isFetchingLyrics, setIsFetchingLyrics] = useState<boolean>(false);
  const [showLyricsSearch, setShowLyricsSearch] = useState<boolean>(false);
  const [lyricsSearchInput, setLyricsSearchInput] = useState<string>('');
  const [lyricsSearchResults, setLyricsSearchResults] = useState<LyricSearchResult[]>([]);
  const [isSearchingLyrics, setIsSearchingLyrics] = useState<boolean>(false);
  const [showManualLyrics, setShowManualLyrics] = useState<boolean>(false);
  const [manualLyricsText, setManualLyricsText] = useState<string>('');

  // Connect to stores
  const player = usePlayer();
  const library = useLibrary();
  const downloadState = useDownloadStore();

  const accentStyle = ACCENT_MAP[accent];

  // Load settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('sur_theme') as AppTheme;
    const savedAccent = localStorage.getItem('sur_accent') as AccentColor;
    if (savedTheme) setTheme(savedTheme);
    if (savedAccent) setAccent(savedAccent);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('amoled-theme');
    } else if (theme === 'amoled') {
      document.documentElement.classList.add('amoled-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme', 'amoled-theme');
    }
  }, [theme]);

  const handleSetTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('sur_theme', newTheme);
  };

  const handleSetAccent = (newAccent: AccentColor) => {
    setAccent(newAccent);
    localStorage.setItem('sur_accent', newAccent);
  };

  const activeSong: Song | null = library.songs.find(s => s.id === player.state.currentSongId || player.isCurrentSong(s.id)) ||
    (() => {
      if (!player.state.currentSongId) return null;
      const dl = downloadState.downloads.find(d => d.id === player.state.currentSongId || player.isCurrentSong(d.id));
      if (!dl) return null;
      return {
        id: dl.id,
        title: dl.title,
        artist: 'YouTube Audio',
        album: 'YouTube Downloads',
        duration: dl.duration || player.state.duration || 0,
        url: dl.filePath,
        size: dl.size ? `${(dl.size / (1024 * 1024)).toFixed(1)} MB` : '3.5 MB',
        format: dl.format || 'MP3',
        isFavorite: false,
        folderName: 'YouTube Downloads',
        isYoutubeDownload: true,
        colorTheme: accentStyle.cardGradient,
        thumbnail: dl.thumbnail,
        lyrics: `[00:00.00] Playing: ${dl.title}\n[00:05.00] Offline downloaded audio`
      } as Song;
    })();

  const activeSongThumbnail = activeSong?.thumbnail ||
    (activeSong ? downloadState.downloads.find(d => d.id === activeSong.id || d.title.toLowerCase().trim() === activeSong.title.toLowerCase().trim())?.thumbnail : undefined);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Directory Scan
  const triggerFolderScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = e.target.files;
    
    setIsScanning(true);
    setScanProgress(5);
    setScannedCount(0);

    let progress = 5;
    const interval = setInterval(async () => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        clearInterval(interval);
        setScanProgress(100);
        
        const count = await library.addScannedSongs(fileList);
        setScannedCount(count);
        
        setTimeout(() => {
          setIsScanning(false);
          setScanProgress(0);
          setActiveTab('library');
          setLibrarySubTab('songs');
        }, 1500);
      } else {
        setScanProgress(progress);
      }
    }, 120);
  };

  const openTagEditor = (song: Song) => {
    setEditingSong(song);
    setEditTitle(song.title);
    setEditArtist(song.artist);
    setEditAlbum(song.album);
    setEditGenre(song.genre || 'Offline');
    setContextMenuPos(null);
  };

  const saveTagChanges = () => {
    if (!editingSong) return;
    library.editSongTags(editingSong.id, {
      title: editTitle,
      artist: editArtist,
      album: editAlbum,
      genre: editGenre
    });
    setEditingSong(null);
  };

  const style = getThemeClasses(theme);

  useEffect(() => {
    const handleOutsideClick = () => {
      if (contextMenuPos) setContextMenuPos(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [contextMenuPos]);

  // Audio Equalizer visualizer canvas
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!showNowPlaying) return;
    
    let animationId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderFrame = () => {
      animationId = requestAnimationFrame(renderFrame);
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const bars = 24;
      const barWidth = (width / bars) - 2;
      const accentRGB = accent === 'gold' ? '245, 158, 11' :
                        accent === 'emerald' ? '16, 185, 129' :
                        accent === 'cyan' ? '6, 182, 212' :
                        accent === 'rose' ? '244, 63, 94' :
                        accent === 'violet' ? '139, 92, 246' : '236, 72, 153';

      for (let i = 0; i < bars; i++) {
        const timeFactor = Date.now() * 0.003;
        const baseHeight = Math.sin(i * 0.3 + timeFactor) * Math.cos(i * 0.1 - timeFactor * 0.5);
        const randomSpike = Math.random() * 0.15;
        let scale = Math.max(0.1, (baseHeight + 1.2) / 2 + randomSpike);
        
        if (!player.state.isPlaying) scale = 0.05 + Math.sin(i * 0.5) * 0.03;

        const barHeight = scale * height * 0.85;
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, `rgba(${accentRGB}, 0.2)`);
        grad.addColorStop(0.5, `rgba(${accentRGB}, 0.7)`);
        grad.addColorStop(1, `rgba(${accentRGB}, 0.95)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
      }
    };

    renderFrame();
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [showNowPlaying, player.state.isPlaying, accent]);

  // Synced LRC parser with auto-timing distribution for plain lyrics
  const parseLyrics = (lyricsStr?: string, songDuration: number = 0) => {
    if (!lyricsStr) return [];
    const lines = lyricsStr.split('\n').map(l => l.trim()).filter(Boolean);
    const result: { time: number; text: string }[] = [];
    const timeReg = /\[(\d+):(\d+)(?:\.(\d+))?\]/;

    let hasTimeTags = false;
    lines.forEach(line => {
      const match = timeReg.exec(line);
      if (match) {
        hasTimeTags = true;
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const ms = match[3] ? parseInt(match[3]) / (match[3].length === 3 ? 1000 : 100) : 0;
        const time = min * 60 + sec + ms;
        const text = line.replace(timeReg, '').trim();
        if (text) {
          result.push({ time, text });
        }
      }
    });

    // If plain lyrics without timestamps, auto-space across song duration so it still auto-scrolls!
    if (!hasTimeTags && lines.length > 0) {
      const songLen = songDuration > 0 ? songDuration : 180;
      const interval = Math.max(3.5, songLen / lines.length);
      lines.forEach((text, i) => {
        result.push({ time: i * interval, text });
      });
    }

    return result.sort((a, b) => a.time - b.time);
  };

  const hasRealLyrics = Boolean(
    activeSong?.lyrics && 
    !activeSong.lyrics.includes('Enjoy offline music with Sur player...') &&
    !activeSong.lyrics.includes('Playing YouTube Offline Track:') &&
    !activeSong.lyrics.includes('Dynamic 5-Band Equalizer active!') &&
    activeSong.lyrics.trim().length > 15
  );

  // Auto-fetch real synchronized lyrics from LRCLIB when a song is active and has no real cached lyrics
  useEffect(() => {
    if (!activeSong) return;
    const isMock = !activeSong.lyrics || 
      activeSong.lyrics.includes('Enjoy offline music with Sur player...') ||
      activeSong.lyrics.includes('Playing YouTube Offline Track:') ||
      activeSong.lyrics.includes('Dynamic 5-Band Equalizer active!') ||
      activeSong.lyrics.trim().length < 15;

    if (isMock) {
      setIsFetchingLyrics(true);
      fetchLyricsFromLRCLIB(activeSong.title, activeSong.artist, activeSong.duration)
        .then((res) => {
          if (res?.syncedLyrics || res?.plainLyrics) {
            library.updateSongLyrics(activeSong.id, res.syncedLyrics || res.plainLyrics!);
          }
        })
        .catch(() => {})
        .finally(() => setIsFetchingLyrics(false));
    }
  }, [activeSong?.id]);

  const handleRefetchLyrics = async () => {
    if (!activeSong) return;
    setIsFetchingLyrics(true);
    try {
      const res = await fetchLyricsFromLRCLIB(activeSong.title, activeSong.artist, activeSong.duration);
      if (res?.syncedLyrics || res?.plainLyrics) {
        library.updateSongLyrics(activeSong.id, res.syncedLyrics || res.plainLyrics!);
      }
    } catch (e) {}
    setIsFetchingLyrics(false);
  };

  const handleSearchLyricsOnline = async () => {
    if (!lyricsSearchInput.trim()) return;
    setIsSearchingLyrics(true);
    try {
      const results = await searchLyricsList(lyricsSearchInput.trim());
      setLyricsSearchResults(results);
    } catch (e) {}
    setIsSearchingLyrics(false);
  };

  const handleApplySearchResult = (item: LyricSearchResult) => {
    if (!activeSong) return;
    const lyricsToApply = item.syncedLyrics || item.plainLyrics;
    if (lyricsToApply) {
      library.updateSongLyrics(activeSong.id, lyricsToApply);
      setShowLyricsSearch(false);
      setLyricsSearchResults([]);
    }
  };

  const handleSaveManualLyrics = () => {
    if (!activeSong || !manualLyricsText.trim()) return;
    library.updateSongLyrics(activeSong.id, manualLyricsText.trim());
    setShowManualLyrics(false);
  };

  const parsedLyrics = parseLyrics(activeSong?.lyrics, activeSong?.duration || player.state.duration || 0);
  const currentLyricIndex = parsedLyrics.reduce((acc, line, idx) => {
    if (player.state.currentTime >= line.time) {
      return idx;
    }
    return acc;
  }, -1);

  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (lyricsContainerRef.current && currentLyricIndex !== -1) {
      const activeElement = lyricsContainerRef.current.children[currentLyricIndex] as HTMLElement;
      if (activeElement) {
        lyricsContainerRef.current.scrollTo({
          top: activeElement.offsetTop - lyricsContainerRef.current.clientHeight / 2 + 30,
          behavior: 'smooth'
        });
      }
    }
  }, [currentLyricIndex]);

  const folders = Array.from(new Set(library.songs.map(s => s.folderName || 'Internal Storage')));
  const albums = Array.from(new Set(library.songs.map(s => s.album)));
  const artists = Array.from(new Set(library.songs.map(s => s.artist)));

  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab]);

  return (
    <div className={`h-[100dvh] w-full overflow-hidden ${style.bg} transition-colors duration-300 font-sans antialiased`}>
      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(120, 120, 120, 0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(120, 120, 120, 0.4);
        }
      `}</style>

      {/* Frame Mockup Container */}
      <div className={`max-w-md mx-auto relative h-full w-full flex flex-col border-x border-dashed md:border-solid ${style.borderSubtle} shadow-2xl bg-inherit overflow-hidden`}>
        
        {/* APP BAR HEADER */}
        <header className={`sticky top-0 z-30 px-5 py-4 flex items-center justify-between ${style.headerBg} border-b`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-tr ${accentStyle.gradient} ${accentStyle.glow} shadow-md`}>
              <Disc className="w-4 h-4 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Sur</h1>
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${accentStyle.text}`}>Offline Music</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className={`cursor-pointer min-h-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold border ${style.border} ${style.cardSecondary} hover:${style.cardHover} active:scale-95 transition-transform`}>
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Audio</span>
              <span className="sm:hidden">Scan</span>
              <input 
                type="file" 
                multiple 
                accept="audio/*" 
                onChange={triggerFolderScan} 
                className="hidden" 
              />
            </label>
          </div>
        </header>

        {/* SCANNING OVERLAY */}
        {isScanning && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke="url(#accentGrad)" strokeWidth="6" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * scanProgress) / 100}
                  strokeLinecap="round"
                  fill="transparent" 
                />
                <defs>
                  <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={accentStyle.primaryHex} />
                    <stop offset="100%" stopColor={accentStyle.primaryHex} stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold font-mono tracking-tighter">{scanProgress}%</span>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-widest">Scanning</span>
              </div>
            </div>
            
            <h3 className="text-lg font-bold mt-6 text-white">Searching Local Folders...</h3>
            <p className="text-xs text-zinc-400 mt-2 max-w-xs">
              Indexing MP3, FLAC and M4A audio files from your media library storage. Keep the app open.
            </p>
          </div>
        )}

        {/* CONTAINER VIEW SCROLLER */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto px-5 pt-4 pb-36">

          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              
              {/* WELCOME BANNER WITH LOCAL STATS */}
              <div className={`p-5 rounded-3xl bg-gradient-to-br ${accentStyle.gradient} text-white shadow-xl relative overflow-hidden`}>
                <div className="absolute -right-6 -bottom-6 opacity-10">
                  <Disc className="w-36 h-36 rotate-45" />
                </div>
                
                <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
                  Premium Offline
                </span>
                
                <h2 className="text-2xl font-bold mt-3 leading-tight tracking-tight">
                  Sangeet Bina Safar Adhura Hai
                </h2>
                <p className="text-xs text-white/80 mt-1 max-w-[220px]">
                  Play high fidelity local audio, customize equalizers and timers.
                </p>

                <div className="flex gap-4 mt-6 pt-4 border-t border-white/10 text-center">
                  <div>
                    <p className="text-lg font-bold font-mono">{library.songs.length}</p>
                    <p className="text-[9px] uppercase tracking-wider text-white/70">Songs Loaded</p>
                  </div>
                  <div className="w-[1px] bg-white/10" />
                  <div>
                    <p className="text-lg font-bold font-mono">{folders.length}</p>
                    <p className="text-[9px] uppercase tracking-wider text-white/70">Audio Folders</p>
                  </div>
                  <div className="w-[1px] bg-white/10" />
                  <div>
                    <p className="text-lg font-bold font-mono">{library.playlists.length}</p>
                    <p className="text-[9px] uppercase tracking-wider text-white/70">Playlists</p>
                  </div>
                </div>
              </div>

              {/* SEARCH SCANNER TRIGGER */}
              {library.songs.length === 0 ? (
                <div className="space-y-4">
                  <div className={`p-6 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center ${style.card}`}>
                    <UploadCloud className={`w-10 h-10 ${accentStyle.text} mb-3 opacity-90 animate-pulse`} />
                    <p className="text-sm font-extrabold text-inherit">Your music library is currently empty</p>
                    <p className={`text-xs mt-1.5 mb-5 max-w-[280px] leading-relaxed ${style.textMuted}`}>
                      Sur is a 100% offline player. Select audio folders or files from your phone or device to begin.
                    </p>
                    <label className={`cursor-pointer px-5 py-2.5 rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-md ${accentStyle.bg} ${accentStyle.glow}`}>
                      Browse Files & Folders
                      <input 
                        type="file" 
                        multiple 
                        accept="audio/*" 
                        onChange={triggerFolderScan} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* MINIMALIST GUIDE CARD FOR EMPTY HOME SCREEN */}
                  <div className={`p-5 rounded-3xl border ${style.card} space-y-3`}>
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${accentStyle.text}`} />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-inherit">Sur Kaise Chalayein?</h4>
                    </div>
                    <ul className={`text-xs space-y-2 leading-relaxed ${style.textMuted}`}>
                      <li className="flex gap-2.5">
                        <span className={`font-bold ${accentStyle.text}`}>1.</span>
                        <span>Apne phone ke sangeet ya downloads folder ko select karein.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className={`font-bold ${accentStyle.text}`}>2.</span>
                        <span>Equalizer (Aawaaz) aur Sleep Timer se playback customize karein.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className={`font-bold ${accentStyle.text}`}>3.</span>
                        <span>Bina kisi ads aur bina internet ke pure offline playback ka anand lein.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  {/* FAVORITES CAROUSEL */}
                  {library.songs.filter(s => s.isFavorite).length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider">Favorites (Sada-Bahar)</h3>
                        <button 
                          onClick={() => { setActiveTab('library'); setLibrarySubTab('playlists'); setSelectedPlaylistDetail('playlist_favs'); }} 
                          className={`text-xs font-bold hover:underline ${accentStyle.text}`}
                        >
                          See All
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {library.songs.filter(s => s.isFavorite).slice(0, 4).map((song) => {
                          const isCurrent = player.isCurrentSong(song.id);
                          const isPlaying = isCurrent && player.state.isPlaying;
                          return (
                            <div 
                              key={song.id}
                              onClick={() => player.playOrToggle(song.id)}
                              className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${style.card} ${style.cardHover} active:scale-98`}
                            >
                              <div className={`w-11 h-11 rounded-xl ${theme === 'light' ? 'bg-white border border-zinc-200 shadow-xs text-zinc-800' : `bg-gradient-to-br ${song.colorTheme || 'from-zinc-800 to-zinc-900'} text-white`} flex-shrink-0 flex items-center justify-center relative`}>
                                <Disc className={`w-5 h-5 ${theme === 'light' ? accentStyle.text : 'opacity-40'}`} />
                                {isPlaying && (
                                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                    <span className="flex gap-0.5 items-end justify-center h-4">
                                      <span className={`w-1 ${accentStyle.bgSolid} h-2 animate-bounce`} style={{ animationDelay: '0.1s' }} />
                                      <span className={`w-1 ${accentStyle.bgSolid} h-3 animate-bounce`} style={{ animationDelay: '0.3s' }} />
                                      <span className={`w-1 ${accentStyle.bgSolid} h-1 animate-bounce`} style={{ animationDelay: '0.5s' }} />
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : ''}`}>
                                  {song.title}
                                </p>
                                <p className={`text-[10px] truncate ${style.textMuted}`}>{song.artist}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ALBUM COMPASS */}
                  {albums.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Suhane Albums</h3>
                      <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                        {albums.map((albumName) => {
                          const firstSong = library.songs.find(s => s.album === albumName);
                          return (
                            <div 
                              key={albumName}
                              onClick={() => {
                                setSelectedAlbum(albumName);
                                setActiveTab('library');
                                setLibrarySubTab('albums');
                              }}
                              className="snap-start flex-shrink-0 w-28 cursor-pointer group"
                            >
                              <div className={`w-28 h-28 rounded-2xl bg-gradient-to-tr ${firstSong?.colorTheme || 'from-zinc-800 to-zinc-950'} flex items-center justify-center relative shadow-md group-hover:scale-98 transition-transform`}>
                                <Disc className="w-10 h-10 text-white/20" />
                                <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
                                  <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                </div>
                              </div>
                              <h4 className="text-xs font-bold mt-2 truncate text-inherit">{albumName}</h4>
                              <p className={`text-[10px] truncate ${style.textMuted}`}>{firstSong?.artist}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* QUICK SLIDERS */}
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setShowEqModal(true)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all ${style.card} ${style.cardHover} active:scale-95`}
                >
                  <Sliders className={`w-5 h-5 ${accentStyle.text}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Equalizer</span>
                </button>

                <button 
                  onClick={() => setShowTimerModal(true)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all ${style.card} ${style.cardHover} active:scale-95 relative`}
                >
                  <Timer className={`w-5 h-5 ${accentStyle.text}`} />
                  {player.state.sleepTimer.active && (
                    <span className={`absolute top-1 right-2 ${accentStyle.bgSolid} text-[8px] font-mono font-bold text-black px-1 rounded-full animate-pulse`}>
                      On
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sleep Timer</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('library'); setLibrarySubTab('folders'); }}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all ${style.card} ${style.cardHover} active:scale-95`}
                >
                  <Folder className={`w-5 h-5 ${accentStyle.text}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Folders</span>
                </button>
              </div>

              {/* ABOUT SUR MUSIC QUICK CARD ON HOME */}
              <div 
                onClick={() => {
                  setActiveTab('settings');
                }}
                className={`p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition-all ${style.card} ${style.cardHover} active:scale-98 group shadow-lg`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${accentStyle.badgeBg} border ${accentStyle.badgeBorder} flex items-center justify-center ${accentStyle.text} group-hover:scale-105 transition-transform`}>
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>About Sur Music</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded ${accentStyle.badgeBg} ${accentStyle.badgeText} font-mono`}>v1.3.0</span>
                    </h4>
                    <p className={`text-[10px] ${style.textMuted}`}>Core Features, Downloader, Storage & Privacy</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold ${accentStyle.text}`}>
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              
              {/* SUB TABS HEADER */}
              <div className={`flex gap-1 p-1 ${style.cardSecondary} border ${style.border} rounded-xl overflow-x-auto`}>
                {(['songs', 'albums', 'artists', 'playlists', 'folders'] as const).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      setLibrarySubTab(sub);
                      setSelectedFolder(null);
                      setSelectedAlbum(null);
                      setSelectedArtist(null);
                      setSelectedPlaylistDetail(null);
                    }}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex-shrink-0 ${
                      librarySubTab === sub 
                        ? `${accentStyle.bg} shadow-sm` 
                        : `${style.textMuted} hover:${style.textPrimary}`
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* SONGS LIST */}
              {librarySubTab === 'songs' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <p className={`text-xs ${style.textMuted}`}>{library.songs.length} audio tracks found</p>
                    <button 
                      onClick={() => player.playSong(library.songs[0]?.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full ${style.cardSecondary} border ${style.border} hover:${style.cardHover} ${style.textPrimary} text-xs font-bold transition-all`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Play All</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {library.songs.map((song) => {
                      const isCurrent = player.isCurrentSong(song.id);
                      const isPlaying = isCurrent && player.state.isPlaying;
                      const thumb = song.thumbnail || downloadState.downloads.find(d => d.id === song.id || d.title.toLowerCase().trim() === song.title.toLowerCase().trim())?.thumbnail;

                      return (
                        <div 
                          key={song.id}
                          onClick={() => player.playOrToggle(song.id)}
                          className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                            isCurrent 
                              ? `${style.card} border ${accentStyle.border} shadow-lg ${accentStyle.glow}` 
                              : `${style.card} ${style.cardHover}`
                          }`}
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${theme === 'light' ? 'bg-white border border-zinc-200 shadow-xs' : `${style.cardSecondary} border ${style.borderSubtle}`} flex items-center justify-center relative overflow-hidden flex-shrink-0`}>
                              {thumb ? (
                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full ${theme === 'light' ? 'bg-white' : `bg-gradient-to-br ${song.colorTheme || 'from-zinc-800 to-zinc-900'}`} flex items-center justify-center`}>
                                  <Music className={`w-4 h-4 ${isCurrent ? `${accentStyle.text} animate-pulse` : theme === 'light' ? accentStyle.text : style.textMuted}`} />
                                </div>
                              )}
                              {isCurrent && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  {isPlaying ? (
                                    <Pause className={`w-3.5 h-3.5 fill-current ${accentStyle.text} animate-pulse`} />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 fill-current text-white" />
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : 'text-inherit'}`}>
                                {song.title}
                              </h4>
                              <p className={`text-[10px] ${style.textMuted} mt-0.5 truncate flex items-center gap-1.5`}>
                                <span>{song.artist || 'Local Track'}</span>
                                {song.duration > 0 && <span className={style.textDim}>•</span>}
                                {song.duration > 0 && <span>{formatTime(song.duration)}</span>}
                                <span className={style.textDim}>•</span>
                                <span className={`font-mono ${style.cardSecondary} border ${style.borderSubtle} px-1.5 py-0.5 rounded text-[8px] ${style.textMuted} uppercase`}>
                                  {song.format || 'MP3'}
                                </span>
                                {song.size && (
                                  <>
                                    <span className={style.textDim}>•</span>
                                    <span className={`font-mono ${style.cardSecondary} border ${style.borderSubtle} px-1.5 py-0.5 rounded text-[8px] ${style.textMuted}`}>
                                      {song.size}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => library.toggleFavorite(song.id)}
                              className="p-2 hover:text-rose-500 text-zinc-500 transition-colors cursor-pointer"
                              title="Favorite"
                            >
                              <Heart className={`w-3.5 h-3.5 ${song.isFavorite ? 'text-rose-500 fill-rose-500' : 'opacity-40'}`} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextSong(song);
                                setContextMenuPos({ x: e.clientX - 120, y: e.clientY });
                              }}
                              className="p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                              title="Options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ALBUMS */}
              {librarySubTab === 'albums' && (
                <div>
                  {!selectedAlbum ? (
                    <div className="grid grid-cols-2 gap-4">
                      {albums.map((album) => {
                        const albumSongs = library.songs.filter(s => s.album === album);
                        const firstSong = albumSongs[0];
                        return (
                          <div 
                            key={album}
                            onClick={() => setSelectedAlbum(album)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all ${style.card} ${style.cardHover}`}
                          >
                            <div className={`aspect-square w-full rounded-xl bg-gradient-to-tr ${firstSong?.colorTheme || 'from-zinc-800 to-zinc-950'} flex items-center justify-center text-white relative mb-3 shadow-md`}>
                              <Disc className="w-12 h-12 opacity-30 animate-spin-slow" />
                            </div>
                            <h4 className="text-xs font-bold truncate">{album}</h4>
                            <p className={`text-[10px] mt-1 ${style.textMuted}`}>{albumSongs.length} Songs</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button 
                        onClick={() => setSelectedAlbum(null)}
                        className={`flex items-center gap-1.5 text-xs font-bold py-1 px-3 border rounded-full ${style.border}`}
                      >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        <span>Back to Albums</span>
                      </button>

                      <div className="flex gap-4 items-end p-2">
                        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${library.songs.find(s => s.album === selectedAlbum)?.colorTheme || 'from-zinc-800 to-zinc-950'} flex-shrink-0 flex items-center justify-center text-white shadow-lg`}>
                          <Disc className="w-10 h-10 opacity-40" />
                        </div>
                        <div>
                          <span className={`text-[9px] uppercase font-extrabold tracking-wider ${accentStyle.text}`}>Album</span>
                          <h3 className="text-lg font-extrabold tracking-tight mt-1">{selectedAlbum}</h3>
                          <p className={`text-xs ${style.textMuted}`}>
                            By {library.songs.find(s => s.album === selectedAlbum)?.artist || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        {library.songs.filter(s => s.album === selectedAlbum).map((song) => {
                          const isCurrent = player.isCurrentSong(song.id);
                          return (
                            <div 
                              key={song.id}
                              onClick={() => player.playOrToggle(song.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-900/10 ${
                                isCurrent ? `${accentStyle.badgeBg} border ${accentStyle.badgeBorder}` : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : ''}`}>
                                  {song.title}
                                </p>
                                <p className={`text-[10px] ${style.textMuted}`}>{song.artist}</p>
                              </div>
                              <span className="text-[10px] font-mono font-bold opacity-60">
                                {formatTime(song.duration)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ARTISTS */}
              {librarySubTab === 'artists' && (
                <div>
                  {!selectedArtist ? (
                    <div className="space-y-2">
                      {artists.map((artist) => (
                        <div 
                          key={artist}
                          onClick={() => setSelectedArtist(artist)}
                          className={`p-3 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all ${style.card} ${style.cardHover}`}
                        >
                          <div className={`w-12 h-12 rounded-2xl ${theme === 'light' ? 'bg-white border-2 border-zinc-200 text-zinc-900 shadow-sm' : 'bg-zinc-800 text-zinc-400'} flex items-center justify-center font-black text-sm flex-shrink-0`}>
                            {artist.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold">{artist}</h4>
                            <p className={`text-[10px] ${style.textMuted}`}>
                              {library.songs.filter(s => s.artist === artist).length} Songs
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button 
                        onClick={() => setSelectedArtist(null)}
                        className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 border rounded-full ${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 shadow-xs hover:bg-zinc-50' : style.border}`}
                      >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        <span>Back to Artists</span>
                      </button>

                      <div className="flex gap-4 items-center p-2">
                        <div className={`w-16 h-16 rounded-2xl ${theme === 'light' ? 'bg-white border-2 border-zinc-200 shadow-md text-zinc-900' : `bg-gradient-to-tr ${accentStyle.gradient} text-white shadow-md`} font-extrabold text-xl flex items-center justify-center flex-shrink-0`}>
                          <span className={theme === 'light' ? accentStyle.text : 'text-white'}>
                            {selectedArtist.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[9px] uppercase font-extrabold tracking-wider ${accentStyle.text}`}>Artist</span>
                          <h3 className="text-lg font-extrabold tracking-tight mt-1">{selectedArtist}</h3>
                          <p className={`text-xs ${style.textMuted}`}>
                            {library.songs.filter(s => s.artist === selectedArtist).length} Tracks in device
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        {library.songs.filter(s => s.artist === selectedArtist).map((song) => {
                          const isCurrent = player.isCurrentSong(song.id);
                          return (
                            <div 
                              key={song.id}
                              onClick={() => player.playOrToggle(song.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-900/10 ${
                                isCurrent ? `${accentStyle.badgeBg} border ${accentStyle.badgeBorder}` : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : ''}`}>
                                  {song.title}
                                </p>
                                <p className={`text-[10px] ${style.textMuted}`}>{song.album}</p>
                              </div>
                              <span className="text-[10px] font-mono font-bold opacity-60">
                                {formatTime(song.duration)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PLAYLISTS */}
              {librarySubTab === 'playlists' && (
                <div>
                  {!selectedPlaylistDetail ? (
                    <div className="space-y-3">
                      <button 
                        onClick={() => setShowCreatePlaylist(true)}
                        className={`w-full p-4 rounded-2xl border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          theme === 'light'
                            ? 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400 shadow-xs'
                            : `${style.card} hover:${accentStyle.border} hover:bg-zinc-800/10`
                        }`}
                      >
                        <Plus className={`w-5 h-5 ${accentStyle.text}`} />
                        <span className="text-xs font-bold uppercase tracking-wider">Create New Playlist</span>
                      </button>

                      {showCreatePlaylist && (
                        <div className={`p-4 rounded-2xl border space-y-3 ${style.card}`}>
                          <h4 className="text-xs font-bold uppercase tracking-wider">New Playlist Name</h4>
                          <input 
                            type="text" 
                            placeholder="e.g. Purani Yaadein" 
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-xl text-xs border ${style.inputBg} outline-none`}
                          />
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => { setShowCreatePlaylist(false); setNewPlaylistName(''); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold opacity-60 hover:opacity-100"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => {
                                if (newPlaylistName.trim()) {
                                  library.createPlaylist(newPlaylistName);
                                  setShowCreatePlaylist(false);
                                  setNewPlaylistName('');
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${accentStyle.bg}`}
                            >
                              Create
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {library.playlists.map((playlist) => (
                          <div 
                            key={playlist.id}
                            onClick={() => setSelectedPlaylistDetail(playlist.id)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${style.card} ${style.cardHover}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-xl ${theme === 'light' ? 'bg-white border-zinc-200 shadow-sm text-zinc-900' : `bg-zinc-900 border-zinc-800 ${accentStyle.text}`} border flex items-center justify-center flex-shrink-0`}>
                                {playlist.id === 'playlist_youtube' ? (
                                  <Download className={`w-5 h-5 ${theme === 'light' ? accentStyle.text : ''}`} />
                                ) : (
                                  <ListMusic className={`w-5 h-5 ${theme === 'light' ? accentStyle.text : ''}`} />
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold">{playlist.name}</h4>
                                <p className={`text-[10px] ${style.textMuted}`}>{playlist.songIds.length} Songs</p>
                              </div>
                            </div>
                            
                            {playlist.id !== 'playlist_favs' && playlist.id !== 'playlist_youtube' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  library.deletePlaylist(playlist.id);
                                }}
                                className="p-2 text-zinc-500 hover:text-rose-500 hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const playlist = library.playlists.find(p => p.id === selectedPlaylistDetail);
                        if (!playlist) return null;
                        return (
                          <>
                            <button 
                              onClick={() => setSelectedPlaylistDetail(null)}
                              className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 border rounded-full ${theme === 'light' ? 'bg-white border-zinc-200 text-zinc-800 shadow-xs hover:bg-zinc-50' : style.border}`}
                            >
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              <span>Back to Playlists</span>
                            </button>

                            <div className="flex justify-between items-end p-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl ${theme === 'light' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900 border-zinc-800'} border flex items-center justify-center flex-shrink-0 ${accentStyle.text}`}>
                                  {playlist.id === 'playlist_youtube' ? (
                                    <Download className="w-6 h-6" />
                                  ) : (
                                    <ListMusic className="w-6 h-6" />
                                  )}
                                </div>
                                <div>
                                  <span className={`text-[9px] uppercase font-extrabold tracking-wider ${accentStyle.text}`}>Playlist</span>
                                  <h3 className="text-lg font-extrabold tracking-tight mt-0.5">{playlist.name}</h3>
                                  <p className={`text-xs ${style.textMuted}`}>{playlist.songIds.length} Songs loaded</p>
                                </div>
                              </div>

                              {playlist.songIds.length > 0 && (
                                <button 
                                  onClick={() => player.playSong(playlist.songIds[0], playlist.songIds)}
                                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md ${accentStyle.bg}`}
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Play Playlist</span>
                                </button>
                              )}
                            </div>

                            <div className="space-y-2 mt-4">
                              {playlist.songIds.map((songId) => {
                                const song = library.songs.find(s => s.id === songId);
                                if (!song) return null;
                                const isCurrent = player.isCurrentSong(song.id);
                                return (
                                  <div 
                                    key={song.id}
                                    className={`p-2.5 rounded-xl flex items-center justify-between hover:bg-zinc-900/10 ${
                                      isCurrent ? `${accentStyle.badgeBg} border ${accentStyle.badgeBorder}` : ''
                                    }`}
                                  >
                                    <div 
                                      className="min-w-0 flex-1 cursor-pointer"
                                      onClick={() => player.playOrToggle(song.id, playlist.songIds)}
                                    >
                                      <p className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : ''}`}>
                                        {song.title}
                                      </p>
                                      <p className={`text-[10px] ${style.textMuted}`}>{song.artist}</p>
                                    </div>
                                    
                                    <button 
                                      onClick={() => library.removeSongFromPlaylist(playlist.id, song.id)}
                                      className="p-2 opacity-55 hover:opacity-100 text-rose-500"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}

                              {playlist.songIds.length === 0 && (
                                <div className={`p-8 text-center border border-dashed rounded-2xl ${style.textMuted} text-xs`}>
                                  Playlist is empty. Add songs from list view.
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* FOLDERS */}
              {librarySubTab === 'folders' && (
                <div>
                  {!selectedFolder ? (
                    <div className="space-y-2">
                      {folders.map((folderName) => (
                        <div 
                          key={folderName}
                          onClick={() => setSelectedFolder(folderName)}
                          className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${style.card} ${style.cardHover}`}
                        >
                          <Folder className={`w-5 h-5 ${accentStyle.text}`} />
                          <div>
                            <h4 className="text-xs font-bold">{folderName}</h4>
                            <p className={`text-[10px] ${style.textMuted}`}>
                              {library.songs.filter(s => s.folderName === folderName || (!s.folderName && folderName === 'Internal Storage')).length} Songs
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button 
                        onClick={() => setSelectedFolder(null)}
                        className={`flex items-center gap-1.5 text-xs font-bold py-1 px-3 border rounded-full ${style.border}`}
                      >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        <span>Back to Folders</span>
                      </button>

                      <div className="flex gap-3 items-center p-2">
                        <Folder className={`w-8 h-8 ${accentStyle.text}`} />
                        <div>
                          <span className={`text-[9px] uppercase font-extrabold tracking-wider ${accentStyle.text}`}>Directory Folder</span>
                          <h3 className="text-base font-extrabold tracking-tight">{selectedFolder}</h3>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        {library.songs.filter(s => s.folderName === selectedFolder || (!s.folderName && selectedFolder === 'Internal Storage')).map((song) => {
                          const isCurrent = player.isCurrentSong(song.id);
                          return (
                            <div 
                              key={song.id}
                              onClick={() => player.playOrToggle(song.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-900/10 ${
                                isCurrent ? `${accentStyle.badgeBg} border ${accentStyle.badgeBorder}` : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : ''}`}>
                                  {song.title}
                                </p>
                                <p className={`text-[10px] ${style.textMuted}`}>{song.artist}</p>
                              </div>
                              <span className="text-[10px] font-mono font-bold opacity-60">
                                {formatTime(song.duration)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${style.textMuted}`} />
                <input 
                  type="text"
                  placeholder="Songs, artists, or albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-xs outline-none ${accentStyle.ring} ${style.inputBg}`}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(() => {
                  const query = searchQuery.toLowerCase().trim();
                  if (!query) {
                    return (
                      <div className="space-y-6 pt-2">
                        {/* LOCAL LIBRARY PROMPT */}
                        <div className="text-center text-zinc-500 py-4 space-y-1">
                          <Search className="w-7 h-7 mx-auto opacity-30" />
                          <p className="text-xs">Apni library search karein</p>
                          <p className="text-[10px]">Type above to search your offline songs list.</p>
                        </div>
                      </div>
                    );
                  }

                  const filtered = library.songs.filter(
                    s => s.title.toLowerCase().includes(query) ||
                         s.artist.toLowerCase().includes(query) ||
                         s.album.toLowerCase().includes(query)
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-zinc-500 space-y-2">
                        <Disc className="w-8 h-8 mx-auto opacity-30 animate-spin-slow" />
                        <p className="text-xs">No matching audio files found</p>
                        <p className="text-[10px]">Try searching another keyword or scan more directories.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-zinc-900/50">
                      <p className={`text-[10px] font-bold uppercase tracking-wider pb-2 px-1 ${style.textMuted}`}>
                        Found {filtered.length} matching songs
                      </p>
                      {filtered.map((song) => {
                        const isCurrent = player.isCurrentSong(song.id);
                        return (
                          <div 
                            key={song.id}
                            onClick={() => player.playOrToggle(song.id)}
                            className={`p-3 flex items-center gap-3 cursor-pointer rounded-xl hover:bg-zinc-900/10 ${
                              isCurrent ? `${accentStyle.badgeBg} border ${accentStyle.badgeBorder}` : ''
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${song.colorTheme || 'from-zinc-800 to-zinc-900'} flex-shrink-0 flex items-center justify-center text-white relative`}>
                              <Disc className="w-5 h-5 opacity-40" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : ''}`}>
                                {song.title}
                              </h4>
                              <p className={`text-[10px] truncate ${style.textMuted}`}>
                                {song.artist} <span className="opacity-40">·</span> {song.album}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono opacity-60">
                              {formatTime(song.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOADS SCREEN */}
          {activeTab === 'downloads' && <DownloadScreen theme={theme} style={style} accentStyle={accentStyle} />}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4 pb-20 animate-slide-up">
              
              {/* SETTINGS HEADER */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${accentStyle.badgeBg} border ${accentStyle.badgeBorder} flex items-center justify-center ${accentStyle.text} shadow-lg ${accentStyle.glow}`}>
                    <SettingsIcon className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider text-inherit">Settings & About</h2>
                    <p className={`text-[10px] ${style.textMuted}`}>App overview, core features, and personalization</p>
                  </div>
                </div>
              </div>

              {/* 1. COMPLETE ABOUT SECTION & APP DETAILS (ALL 12 REQUIREMENTS) */}
              <AboutSection accentColor={accent} theme={theme} style={style} />

              {/* 2. THEMES & PERSONALIZATION */}
              <div className="space-y-4 pt-2">
                {/* ACCENT COLOR SELECTOR */}
                <div className={`p-4 rounded-3xl border ${style.card} space-y-3`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${accentStyle.text}`} />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider">Accent Theme (Color)</h4>
                  </div>
                  <p className={`text-[11px] ${style.textMuted}`}>
                    Select your personal favorite tint color used across Sur player controls and indicators.
                  </p>
                  <div className="flex gap-2.5 pt-2">
                    {(Object.keys(ACCENT_MAP) as AccentColor[]).map((colorKey) => {
                      const actStyle = ACCENT_MAP[colorKey];
                      return (
                        <button
                          key={colorKey}
                          onClick={() => handleSetAccent(colorKey)}
                          className={`w-7 h-7 rounded-full bg-gradient-to-tr ${actStyle.gradient} relative active:scale-90 transition-transform ${
                            accent === colorKey ? 'ring-2 ring-offset-2 ring-zinc-500' : ''
                          }`}
                        >
                          {accent === colorKey && (
                            <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* APPEARANCE */}
                <div className={`p-4 rounded-3xl border ${style.card} space-y-3`}>
                  <div className="flex items-center gap-2">
                    <Sun className={`w-4 h-4 ${accentStyle.text}`} />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider">Appearance (Display Mode)</h4>
                  </div>
                  <p className={`text-[11px] ${style.textMuted}`}>
                    Switch between deep pitch black AMOLED, rich cosmic dark slate, or soft daylight theme.
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {[
                      { key: 'amoled', name: 'AMOLED', icon: Moon },
                      { key: 'dark', name: 'Cosmic Dark', icon: Moon },
                      { key: 'light', name: 'Daylight', icon: Sun }
                    ].map((tOption) => {
                      const TIcon = tOption.icon;
                      return (
                        <button
                          key={tOption.key}
                          onClick={() => handleSetTheme(tOption.key as AppTheme)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                            theme === tOption.key 
                              ? `${accentStyle.bg} border-transparent shadow-md` 
                              : `${style.border} hover:bg-zinc-800/20 text-inherit`
                          }`}
                        >
                          <TIcon className="w-4 h-4" />
                          <span>{tOption.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>

        {/* BOTTOM FLOATING PLAY BAR */}
        {activeSong && !showNowPlaying && (
          <div 
            onClick={() => setShowNowPlaying(true)}
            className="fixed bottom-[74px] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[400px] p-3 rounded-2xl border-0 shadow-[0_14px_45px_rgba(0,0,0,0.85)] flex items-center justify-between cursor-pointer group active:scale-98 transition-all bg-zinc-950/98 text-white backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border-0 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                {activeSongThumbnail ? (
                  <img src={activeSongThumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${activeSong.colorTheme || 'from-zinc-800 to-zinc-900'} flex items-center justify-center`}>
                    <Music className={`w-4 h-4 ${accentStyle.text}`} />
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold truncate text-white group-hover:${accentStyle.text} transition-colors`}>
                  {activeSong.title}
                </p>
                <p className="text-[10px] truncate text-zinc-400">
                  {activeSong.artist}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={player.prev} className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-transform">
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
              
              <button 
                onClick={player.togglePlay}
                className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-md ${accentStyle.bg}`}
              >
                {player.state.isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button onClick={player.next} className="p-2 text-zinc-400 hover:text-white active:scale-90 transition-transform">
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        )}

        {/* NAVIGATION BOTTOM BAR */}
        <nav className={`fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto grid grid-cols-5 items-center h-[68px] border-t ${style.bottomNavBg} select-none`}>
          {[
            { key: 'home', label: 'Home', icon: PlayCircle },
            { key: 'library', label: 'Library', icon: ListMusic },
            { key: 'downloads', label: 'Downloads', icon: Download },
            { key: 'search', label: 'Search', icon: Search },
            { key: 'settings', label: 'Settings', icon: SettingsIcon }
          ].map((tabItem) => {
            const TabIcon = tabItem.icon;
            const isActive = activeTab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                onClick={() => {
                  setActiveTab(tabItem.key as any);
                  setShowNowPlaying(false);
                }}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer transition-colors ${
                  isActive ? accentStyle.text : style.textMuted
                }`}
              >
                <TabIcon className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wider mt-1">{tabItem.label}</span>
              </button>
            );
          })}
        </nav>

        {/* FULL SCREEN NOW PLAYING DISPLAY */}
        {showNowPlaying && activeSong && (
          <div className="fixed inset-0 z-50 max-w-md mx-auto bg-black text-white flex flex-col justify-between p-6 animate-slide-up select-none overflow-y-auto">
            
            <div className={`absolute inset-0 opacity-20 bg-gradient-to-b ${activeSong.colorTheme || accentStyle.cardGradient} pointer-events-none`} />

            {/* HEADER */}
            <div className="flex justify-between items-center z-10">
              <button 
                onClick={() => setShowNowPlaying(false)}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-zinc-800 cursor-pointer"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-400">Now Playing</span>
                <p className="text-xs font-extrabold text-white truncate max-w-[180px]">{activeSong.album}</p>
              </div>

              <button 
                onClick={() => setShowQueueModal(true)}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-zinc-800 cursor-pointer"
              >
                <ListMusic className="w-4 h-4" />
              </button>
            </div>

            {/* ALBUM COVER ARTWORK */}
            <div className="my-auto py-6 flex flex-col items-center text-center z-10 gap-6">
              
              <div className="relative w-52 h-52 xs:w-60 xs:h-60 sm:w-64 sm:h-64 flex items-center justify-center group">
                {/* Dynamic Ambient Background Glow */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-tr ${activeSong.colorTheme || accentStyle.cardGradient} opacity-35 blur-2xl group-hover:scale-105 transition-transform duration-700`} />
                
                {/* Modern Square Album Art Card */}
                <div className={`w-full h-full rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:${accentStyle.glow} transition-shadow`}>
                  {activeSongThumbnail ? (
                    <img 
                      src={activeSongThumbnail} 
                      alt={activeSong.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-tr ${activeSong.colorTheme || 'from-zinc-800 to-zinc-950'} flex flex-col items-center justify-center p-6 text-white relative`}>
                      <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-3 shadow-lg">
                        <Music className={`w-8 h-8 ${accentStyle.text}`} />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/80 line-clamp-1">{activeSong.album || 'Sur Offline'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full px-4 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-left min-w-0 flex-1">
                    <h2 className="text-xl font-black text-white truncate">{activeSong.title}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{activeSong.artist}</p>
                  </div>
                  
                  <button 
                    onClick={() => library.toggleFavorite(activeSong.id)}
                    className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-rose-500 active:scale-90 transition-transform cursor-pointer"
                  >
                    <Heart className={`w-5 h-5 ${activeSong.isFavorite ? 'text-rose-500 fill-rose-500' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="w-full h-12 flex items-center justify-center px-4">
                <canvas ref={visualizerCanvasRef} width={340} height={48} className="w-full h-full opacity-80" />
              </div>

            </div>

            {/* PROGRESS SEEK */}
            <div className="space-y-2 z-10 px-2">
              <input 
                type="range"
                min="0"
                max={player.state.duration || 100}
                value={player.state.currentTime}
                onChange={(e) => player.seek(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-zinc-800 outline-none appearance-none cursor-pointer"
                style={{
                  accentColor: accentStyle.primaryHex,
                  background: `linear-gradient(to right, ${accentStyle.primaryHex} 0%, ${accentStyle.primaryHex} ${
                    (player.state.currentTime / (player.state.duration || 100)) * 100
                  }%, #27272a ${(player.state.currentTime / (player.state.duration || 100)) * 100}%, #27272a 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 font-bold">
                <span>{formatTime(player.state.currentTime)}</span>
                <span>{formatTime(player.state.duration)}</span>
              </div>
            </div>

            {/* REPEAT, SHUFFLE AND DIRECT PLAYBACK CONTROLS */}
            <div className="flex justify-between items-center py-4 z-10 px-2">
              <button 
                onClick={player.toggleRepeat}
                className={`p-3 rounded-full hover:bg-zinc-900 relative transition-colors cursor-pointer ${
                  player.state.repeat !== 'none' ? accentStyle.text : 'text-zinc-400'
                }`}
              >
                <Repeat className="w-5 h-5" />
                {player.state.repeat === 'one' && (
                  <span className={`absolute top-1.5 right-1.5 ${accentStyle.bgSolid} text-[7px] font-bold text-black px-1 rounded-full scale-75 font-mono`}>
                    1
                  </span>
                )}
              </button>

              <div className="flex items-center gap-6">
                <button onClick={player.prev} className="w-12 h-12 rounded-full hover:bg-zinc-900 flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer">
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>

                <button 
                  onClick={player.togglePlay}
                  className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg cursor-pointer ${accentStyle.bg} ${accentStyle.glow}`}
                >
                  {player.state.isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current ml-1" />
                  )}
                </button>

                <button onClick={player.next} className="w-12 h-12 rounded-full hover:bg-zinc-900 flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer">
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
              </div>

              <button 
                onClick={player.toggleShuffle}
                className={`p-3 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer ${
                  player.state.shuffle ? accentStyle.text : 'text-zinc-400'
                }`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
            </div>

            {/* SHEETS TOGGLES */}
            <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-4 z-10 px-1 mt-2">
              <button 
                onClick={() => setShowEqModal(true)}
                className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-zinc-300 hover:text-white cursor-pointer"
              >
                <Sliders className={`w-3.5 h-3.5 ${accentStyle.text}`} />
                <span>Equalizer</span>
              </button>

              <button 
                onClick={() => setShowLyricsModal(true)}
                className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-zinc-300 hover:text-white cursor-pointer"
              >
                <Disc className={`w-3.5 h-3.5 ${accentStyle.text}`} />
                <span>Lyrics</span>
              </button>

              <button 
                onClick={() => setShowTimerModal(true)}
                className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-zinc-300 hover:text-white relative cursor-pointer"
              >
                <Timer className={`w-3.5 h-3.5 ${accentStyle.text}`} />
                {player.state.sleepTimer.active && (
                  <span className={`absolute -top-1 -right-1 ${accentStyle.bgSolid} text-[7px] text-black font-bold px-1.5 py-0.5 rounded-full`}>
                    {Math.ceil(player.state.sleepTimer.timeLeft / 60)}m
                  </span>
                )}
                <span>Timer</span>
              </button>
            </div>

          </div>
        )}

        {/* EQUALIZER BOARD */}
        {showEqModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-t-3xl border-t border-x border-zinc-800 bg-zinc-950 text-white space-y-6 animate-slide-up shadow-2xl">
              
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Sliders className={`w-5 h-5 ${accentStyle.text}`} />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">5-Band Equalizer (Aawaaz)</h3>
                </div>
                <button 
                  onClick={() => setShowEqModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Presets</span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {EQUALIZER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => player.applyPreset(preset.name)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex-shrink-0 ${
                        player.state.currentPresetName === preset.name
                          ? `${accentStyle.bg} border-transparent shadow-md`
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3.5 h-44 py-2 text-center select-none">
                {player.state.equalizer.map((gainValue, index) => {
                  const label = index === 0 ? '60Hz' : index === 1 ? '230Hz' : index === 2 ? '910Hz' : index === 3 ? '4kHz' : '14kHz';
                  return (
                    <div key={index} className="flex flex-col items-center justify-between h-full">
                      <span className="text-[9px] font-mono font-bold text-zinc-400">{gainValue > 0 ? `+${gainValue}` : gainValue}dB</span>
                      
                      <div className="relative flex-1 w-2 flex items-center justify-center bg-zinc-900 rounded-full my-2">
                        <input 
                          type="range"
                          min="-12"
                          max="12"
                          value={gainValue}
                          onChange={(e) => player.setEqualizerBand(index, parseInt(e.target.value))}
                          className="absolute w-28 h-2 transform -rotate-90 origin-center bg-transparent outline-none appearance-none cursor-pointer"
                        />
                        <div 
                          className={`absolute bottom-0 w-full ${accentStyle.bgSolid} rounded-full pointer-events-none shadow-sm`}
                          style={{
                            height: `${((gainValue + 12) / 24) * 100}%`
                          }}
                        />
                      </div>

                      <span className="text-[10px] font-bold tracking-tight text-zinc-300">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2 text-[10px] text-zinc-400 border-t border-zinc-800">
                <span>Maximum Cut: -12dB</span>
                <span className={`font-bold ${accentStyle.text}`}>Preset: {player.state.currentPresetName}</span>
                <span>Maximum Boost: +12dB</span>
              </div>
            </div>
          </div>
        )}

        {/* SLEEP TIMER */}
        {showTimerModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-t-3xl border-t border-x border-zinc-800 bg-zinc-950 text-white space-y-6 animate-slide-up shadow-2xl">
              
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Timer className={`w-5 h-5 ${accentStyle.text}`} />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Sleep Timer (Lori Timer)</h3>
                </div>
                <button 
                  onClick={() => setShowTimerModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {player.state.sleepTimer.active ? (
                <div className={`p-4 rounded-2xl ${accentStyle.badgeBg} border ${accentStyle.badgeBorder} flex justify-between items-center`}>
                  <div>
                    <p className={`text-xs font-bold ${accentStyle.textBold}`}>Sleep Timer is running</p>
                    <p className="text-[11px] text-zinc-400 mt-1">App will pause playback when countdown ends.</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-white tracking-tight">
                      {formatTime(player.state.sleepTimer.timeLeft)}
                    </p>
                    <button 
                      onClick={player.cancelSleepTimer}
                      className="text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:underline mt-1"
                    >
                      Turn Off
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Select a duration. When the timer runs out, playback will auto pause to save battery.
                </p>
              )}

              <div className="grid grid-cols-4 gap-2.5">
                {[5, 15, 30, 45, 60].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => {
                      player.startSleepTimer(minutes);
                      setShowTimerModal(false);
                    }}
                    className={`py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:${accentStyle.border} text-zinc-200 hover:text-white text-xs font-bold transition-all`}
                  >
                    {minutes} Min
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PLAY QUEUE */}
        {showQueueModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
            <div className="w-full max-w-md p-6 h-[80vh] rounded-t-3xl border-t border-x border-zinc-800 bg-zinc-950 text-white flex flex-col justify-between animate-slide-up shadow-2xl">
              
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <ListMusic className={`w-5 h-5 ${accentStyle.text}`} />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Play Queue / Up Next</h3>
                </div>
                <button 
                  onClick={() => setShowQueueModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-2 scrollbar-hide">
                {player.state.queue.map((songId, index) => {
                  const song = library.songs.find(s => s.id === songId);
                  if (!song) return null;
                  const isCurrent = player.state.currentSongId === songId;
                  return (
                    <div 
                      key={`${songId}_${index}`}
                      className={`p-2.5 rounded-xl flex items-center justify-between hover:bg-zinc-900 ${
                        isCurrent ? `${accentStyle.badgeBg} border ${accentStyle.badgeBorder}` : ''
                      }`}
                    >
                      <div 
                        className="min-w-0 flex-1 flex items-center gap-3 cursor-pointer"
                        onClick={() => player.playOrToggle(songId)}
                      >
                        <span className="text-xs font-mono font-bold text-zinc-500 w-5 text-right">{index + 1}</span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isCurrent ? accentStyle.text : 'text-white'}`}>
                            {song.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className={`text-[9px] uppercase font-extrabold tracking-widest ${accentStyle.text} mr-2`}>Now playing</span>
                        )}
                        <button 
                          onClick={() => player.removeSongFromQueue(songId)}
                          className="p-2 opacity-55 hover:opacity-100 text-zinc-500 hover:text-rose-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-800 pt-3 flex justify-between items-center text-xs">
                <span className="text-zinc-400">Queue contains {player.state.queue.length} songs</span>
                <button 
                  onClick={() => {
                    player.setQueue([]);
                    setShowQueueModal(false);
                  }}
                  className="text-rose-500 font-bold uppercase tracking-wider text-[10px] hover:underline"
                >
                  Clear Queue
                </button>
              </div>

            </div>
          </div>
        )}

        {/* SCREEN 21: SYNCED LRC LYRICS MODAL DRAWER */}
        {showLyricsModal && activeSong && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-3 sm:p-4">
            <div className="w-full max-w-md p-5 h-[68vh] rounded-t-3xl border-t border-x border-zinc-800 bg-zinc-950 text-white flex flex-col justify-between animate-slide-up shadow-2xl">
              
              {/* HEADER */}
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className={`w-4 h-4 ${accentStyle.text} animate-pulse flex-shrink-0`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white truncate">Synced Lyrics</h3>
                  {hasRealLyrics ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex-shrink-0">
                      💾 Offline Saved
                    </span>
                  ) : isFetchingLyrics ? (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${accentStyle.badgeBg} border ${accentStyle.badgeBorder} ${accentStyle.badgeText} font-bold animate-pulse flex items-center gap-1 flex-shrink-0`}>
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span>Fetching...</span>
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex-shrink-0">
                      Offline Mode
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setLyricsSearchInput(activeSong.title);
                      setShowLyricsSearch(!showLyricsSearch);
                      setShowManualLyrics(false);
                      if (!showLyricsSearch && activeSong.title) {
                        searchLyricsList(activeSong.title).then(setLyricsSearchResults).catch(() => {});
                      }
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      showLyricsSearch ? `${accentStyle.bg} shadow-sm` : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Search Lyrics Online"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleRefetchLyrics}
                    disabled={isFetchingLyrics}
                    className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    title="Re-fetch Online Lyrics"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLyrics ? `animate-spin ${accentStyle.text}` : ''}`} />
                  </button>

                  <button
                    onClick={() => {
                      setManualLyricsText(hasRealLyrics ? activeSong.lyrics || '' : '');
                      setShowManualLyrics(!showManualLyrics);
                      setShowLyricsSearch(false);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      showManualLyrics ? `${accentStyle.bg} shadow-sm` : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Paste / Edit Custom Lyrics"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button 
                    onClick={() => {
                      setShowLyricsModal(false);
                      setShowLyricsSearch(false);
                      setShowManualLyrics(false);
                    }}
                    className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* VIEW 1: SEARCH ONLINE DRAWER */}
              {showLyricsSearch ? (
                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lyricsSearchInput}
                      onChange={(e) => setLyricsSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchLyricsOnline()}
                      placeholder="Enter song name (e.g. Kesariya)..."
                      className={`flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none ${accentStyle.ring}`}
                    />
                    <button
                      onClick={handleSearchLyricsOnline}
                      disabled={isSearchingLyrics || !lyricsSearchInput.trim()}
                      className={`px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md ${accentStyle.bg}`}
                    >
                      {isSearchingLyrics ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      <span>Search</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {lyricsSearchResults.length > 0 ? (
                      lyricsSearchResults.map((res) => (
                        <div
                          key={res.id}
                          className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-900/60 hover:border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{res.trackName}</p>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {res.artistName} {res.albumName && `• ${res.albumName}`}
                            </p>
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block ${
                              res.syncedLyrics ? `${accentStyle.badgeBg} ${accentStyle.badgeText} border ${accentStyle.badgeBorder}` : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {res.syncedLyrics ? '⚡ Real Synced Lyrics' : 'Plain Text'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleApplySearchResult(res)}
                            className={`px-3 py-1.5 font-bold text-[10px] rounded-lg transition-all cursor-pointer flex-shrink-0 shadow-sm ${accentStyle.bg}`}
                          >
                            Save Offline
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-zinc-400 py-6">
                        {isSearchingLyrics ? 'Searching lyrics on LRCLIB...' : 'Search for a song name to download real synced lyrics!'}
                      </p>
                    )}
                  </div>
                </div>
              ) : showManualLyrics ? (
                /* VIEW 2: MANUAL LRC / TEXT PASTER */
                <div className="flex-1 flex flex-col py-3 space-y-2">
                  <p className="text-[10px] text-zinc-400">
                    Paste your synchronized LRC format (with timestamps) or plain lyrics:
                  </p>
                  <textarea
                    value={manualLyricsText}
                    onChange={(e) => setManualLyricsText(e.target.value)}
                    placeholder="[00:12.34] Your first line lyrics here...&#10;[00:18.50] Second line..."
                    className={`flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white placeholder:text-zinc-600 outline-none ${accentStyle.ring} resize-none`}
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowManualLyrics(false)}
                      className="flex-1 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 text-xs font-bold hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveManualLyrics}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold shadow-lg ${accentStyle.bg}`}
                    >
                      Save to Offline Storage
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW 3: SYNCED LRC SCROLLING BODY */
                <div className="flex-1 overflow-y-auto py-4 select-none relative">
                  {parsedLyrics.length > 0 && hasRealLyrics ? (
                    <div 
                      ref={lyricsContainerRef}
                      className="h-full overflow-y-auto space-y-3.5 scrollbar-hide px-2 text-center"
                      style={{ maskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)' }}
                    >
                      {parsedLyrics.map((line, idx) => {
                        const isActive = currentLyricIndex === idx;
                        return (
                          <p 
                            key={idx}
                            onClick={() => player.seek(line.time)}
                            className={`text-sm transition-all duration-300 font-bold py-1.5 cursor-pointer rounded-xl px-2 ${
                              isActive 
                                ? `${accentStyle.text} text-base scale-105 opacity-100 font-black bg-zinc-900/40 shadow-sm` 
                                : 'text-zinc-500 hover:text-zinc-300 opacity-60 hover:opacity-100'
                            }`}
                            title="Tap to jump audio to this line"
                          >
                            {line.text}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                      <Disc className="w-10 h-10 text-zinc-700 animate-spin-slow" />
                      <div>
                        <p className="text-xs font-bold text-zinc-300">
                          {isFetchingLyrics ? 'Fetching real lyrics from online...' : 'Real lyrics not downloaded yet'}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-1 max-w-xs">
                          {isFetchingLyrics 
                            ? 'Syncing with LRCLIB database — lyrics will be permanently saved offline once loaded.' 
                            : 'Search or re-fetch to download real synchronized lyrics for offline listening.'}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleRefetchLyrics}
                          disabled={isFetchingLyrics}
                          className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-850 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLyrics ? `animate-spin ${accentStyle.text}` : ''}`} />
                          <span>{isFetchingLyrics ? 'Fetching...' : 'Auto-Fetch'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setLyricsSearchInput(activeSong.title);
                            setShowLyricsSearch(true);
                            searchLyricsList(activeSong.title).then(setLyricsSearchResults).catch(() => {});
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${accentStyle.bg}`}
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Search Online</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER */}
              <div className="border-t border-zinc-800 pt-2.5 text-center text-[9px] text-zinc-400 uppercase font-extrabold tracking-widest flex-shrink-0 flex items-center justify-center gap-1.5">
                <span>Tap any line to seek</span>
                <span>•</span>
                <span>Synced Lyrics Auto-Scroll</span>
              </div>

            </div>
          </div>
        )}

        {/* SONG CONTEXT MENU */}
        {contextSong && contextMenuPos && (
          <div 
            className={`fixed z-50 w-52 rounded-2xl border ${style.card} shadow-2xl p-2 animate-scale-up`}
            style={{
              left: `${Math.min(window.innerWidth - 220, contextMenuPos.x)}px`,
              top: `${Math.min(window.innerHeight - 300, contextMenuPos.y)}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-3 py-2 border-b ${style.border} mb-1`}>
              <p className="text-xs font-bold truncate text-white">{contextSong.title}</p>
              <p className={`text-[9px] ${style.textMuted} truncate`}>{contextSong.artist}</p>
            </div>

            <button
              onClick={() => {
                player.playSong(contextSong.id);
                setContextSong(null);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900/60 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Play Now</span>
            </button>

            <div className={`border-t ${style.border} my-1 pt-1`}>
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold px-3 py-1">Add to Playlist</p>
              {library.playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => {
                    library.addSongToPlaylist(pl.id, contextSong.id);
                    setContextSong(null);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-900/60 truncate cursor-pointer"
                >
                  + {pl.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => openTagEditor(contextSong)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900/60 border-t ${style.border} mt-1 flex items-center gap-2 cursor-pointer`}
            >
              <Edit3 className={`w-3.5 h-3.5 ${accentStyle.text}`} />
              <span>Edit Tags / Lyrics</span>
            </button>

            <button
              onClick={() => {
                if (player.state.currentSongId === contextSong.id) {
                  player.pause();
                }
                library.deleteSong(contextSong.id, false); // false = local file delete nahi hoga!
                setContextSong(null);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900/60 mt-1 flex items-center gap-2 cursor-pointer"
              title="Removes track from player view without deleting from storage"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Delete Track</span>
            </button>

            <button
              onClick={() => {
                setSongToDelete(contextSong);
                setContextSong(null);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-950/20 mt-0.5 flex items-center gap-2 cursor-pointer"
              title="Permanently erase file from local device storage"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Permanently</span>
            </button>
          </div>
        )}

        {/* PERMANENT DELETE CONFIRMATION MODAL */}
        {songToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm p-6 rounded-3xl border bg-zinc-950 border-zinc-800 text-white space-y-4 shadow-2xl animate-scale-up">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Permanently Delete Song?</h3>
                <p className="text-xs font-bold text-rose-400 truncate px-2">{songToDelete.title}</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Yeh song Sur app ke offline database (IndexedDB) aur local memory se hamesha ke liye delete ho jayega. Storage free ho jayegi.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSongToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (player.state.currentSongId === songToDelete.id) {
                      player.pause();
                    }
                    await library.deleteSong(songToDelete.id);
                    setSongToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT METADATA MODAL */}
        {editingSong && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`w-full max-w-md p-6 rounded-3xl border ${style.modalBg} space-y-4 shadow-2xl animate-scale-up overflow-y-auto max-h-[90vh]`}>
              
              <div className={`flex justify-between items-center border-b ${style.border} pb-3`}>
                <div className="flex items-center gap-2">
                  <Edit3 className={`w-4 h-4 ${accentStyle.text}`} />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Metadata Tag Editor</h3>
                </div>
                <button onClick={() => setEditingSong(null)} className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Song Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={`w-full px-4 py-2 rounded-xl text-xs border outline-none ${style.inputBg} ${accentStyle.ring}`} />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Artist Name</label>
                  <input type="text" value={editArtist} onChange={(e) => setEditArtist(e.target.value)} className={`w-full px-4 py-2 rounded-xl text-xs border outline-none ${style.inputBg} ${accentStyle.ring}`} />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Album</label>
                  <input type="text" value={editAlbum} onChange={(e) => setEditAlbum(e.target.value)} className={`w-full px-4 py-2 rounded-xl text-xs border outline-none ${style.inputBg} ${accentStyle.ring}`} />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">Genre</label>
                  <input type="text" value={editGenre} onChange={(e) => setEditGenre(e.target.value)} className={`w-full px-4 py-2 rounded-xl text-xs border outline-none ${style.inputBg} ${accentStyle.ring}`} />
                </div>
              </div>

              <div className={`flex gap-2 justify-end pt-3 border-t ${style.border}`}>
                <button onClick={() => setEditingSong(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-400 hover:text-white">Cancel</button>
                <button onClick={saveTagChanges} className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md ${accentStyle.bg}`}>Save Tags</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
