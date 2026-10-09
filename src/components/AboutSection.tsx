/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Music,
  Shield,
  HardDrive,
  Sliders,
  Disc,
  Download,
  Smartphone,
  Sparkles,
  Heart,
  FileText,
  Mail,
  Bug,
  Check,
  X,
  ChevronRight
} from 'lucide-react';
import { AccentColor, ACCENT_MAP, AppTheme, ThemeStyle } from '../types/theme';

interface AboutSectionProps {
  accentColor?: string;
  theme?: AppTheme;
  style?: ThemeStyle;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ 
  accentColor = 'emerald',
  theme = 'dark',
  style
}) => {
  const isLight = theme === 'light';
  const actStyle = ACCENT_MAP[(accentColor as AccentColor)] || ACCENT_MAP.emerald;
  const [showLicensesModal, setShowLicensesModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

  useEffect(() => {
    if (showLicensesModal || showPrivacyModal || showFeedbackModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLicensesModal, showPrivacyModal, showFeedbackModal]);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    // Trigger mailto with user diagnostics
    const subject = encodeURIComponent('Sur Music Player Feedback & Bug Report');
    const body = encodeURIComponent(
      `${feedbackText.trim()}\n\n---\nApp Version: v1.3.0\nPlatform: ${navigator.userAgent}\nTimestamp: ${new Date().toISOString()}`
    );
    window.location.href = `mailto:support@surmusic.com?subject=${subject}&body=${body}`;

    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackText('');
      setShowFeedbackModal(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. APP NAME + SHORT DESCRIPTION */}
      <div className={`p-5 rounded-3xl border ${isLight ? 'bg-white border-zinc-200 text-black shadow-sm' : 'bg-zinc-950/90 border-zinc-800 text-white shadow-xl'} space-y-4`}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-black uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}`}>Sur Music</h3>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${actStyle.badgeBg} border ${actStyle.badgeBorder} ${actStyle.badgeText}`}>
                v1.3.0
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-zinc-600' : 'text-zinc-400'} mt-1 leading-relaxed`}>
              Fast, high-fidelity offline audio player & media downloader with hardware EQ and synchronized lyrics.
            </p>
          </div>
        </div>

        {/* 2. MAIN FEATURES GRID */}
        <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-900'}`}>
          <h4 className={`text-[11px] font-extrabold uppercase tracking-wider ${isLight ? 'text-zinc-800' : 'text-zinc-400'} flex items-center gap-1.5`}>
            <Sparkles className={`w-3.5 h-3.5 ${actStyle.text}`} />
            <span>Core Audio Features</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className={`p-2.5 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/70' : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900/90'} border flex items-start gap-2.5 transition-colors`}>
              <Music className={`w-4 h-4 ${actStyle.text} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Local Music Playback</p>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Direct on-device scanning for MP3, FLAC, M4A, WAV audio files.</p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/70' : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900/90'} border flex items-start gap-2.5 transition-colors`}>
              <Heart className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Playlists & Favorites</p>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Custom user playlists, quick favorites, and automatic downloads collection.</p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/70' : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900/90'} border flex items-start gap-2.5 transition-colors`}>
              <Sliders className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>5-Band Web Audio EQ</p>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Hardware BiquadFilter equalizer with 10 presets and custom frequency gain control.</p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/70' : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900/90'} border flex items-start gap-2.5 transition-colors`}>
              <Disc className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Real Synced Lyrics</p>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Line-by-line LRC synchronized lyrics via LRCLIB with 1-tap seeking and offline cache.</p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/70' : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900/90'} border flex items-start gap-2.5 transition-colors`}>
              <Smartphone className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Background Playback</p>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Continuous audio in background tabs, minimized screen, and standalone PWA mode.</p>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/70' : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900/90'} border flex items-start gap-2.5 transition-colors`}>
              <Sparkles className={`w-4 h-4 ${actStyle.text} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Lock-Screen Controls</p>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Native MediaSession API with lock-screen artwork, scrub bar, and media keys.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DOWNLOAD FEATURE DETAILS */}
        <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-900'}`}>
          <h4 className={`text-[11px] font-extrabold uppercase tracking-wider ${isLight ? 'text-zinc-800' : 'text-zinc-400'} flex items-center gap-1.5`}>
            <Download className={`w-3.5 h-3.5 ${actStyle.text}`} />
            <span>High-Speed Audio Downloader</span>
          </h4>
          <div className={`p-3 rounded-2xl ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-zinc-900/60 border-zinc-850 text-zinc-300'} border space-y-1.5 text-[11px]`}>
            <p className={`${isLight ? 'text-zinc-700' : 'text-zinc-300'} font-medium leading-relaxed`}>
              <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>• Supported Links: </span>
              Converts online YouTube video & audio links into clean 320kbps MP3 audio files.
            </p>
            <p className={`${isLight ? 'text-zinc-700' : 'text-zinc-300'} font-medium leading-relaxed`}>
              <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>• Automatic Library Sync: </span>
              Downloaded songs are saved directly into your local offline library with cover art and synced lyrics, without triggering annoying browser download popups.
            </p>
            <p className={`${isLight ? 'text-zinc-700' : 'text-zinc-300'} font-medium leading-relaxed`}>
              <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>• Queue Control: </span>
              Full multi-task support with live Stop (Pause), Continue (Resume), and Delete options.
            </p>
          </div>
        </div>

        {/* 4. MUSIC STORAGE & PRIVACY */}
        <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-900'}`}>
          <h4 className={`text-[11px] font-extrabold uppercase tracking-wider ${isLight ? 'text-zinc-800' : 'text-zinc-400'} flex items-center gap-1.5`}>
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Storage & Privacy Architecture</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className={`p-3 rounded-2xl ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-850'} border space-y-1`}>
              <div className={`flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'} font-bold`}>
                <HardDrive className={`w-3.5 h-3.5 ${actStyle.text}`} />
                <span>On-Device Storage</span>
              </div>
              <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'} leading-relaxed`}>
                All audio files, album art, and lyrics are stored 100% locally on your device via HTML5 IndexedDB (<code className={`${isLight ? 'text-zinc-800 bg-zinc-200/70 px-1 py-0.5 rounded' : 'text-zinc-300'}`}>SurMusicDB_V2</code>). Zero cloud uploads.
              </p>
            </div>

            <div className={`p-3 rounded-2xl ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-850'} border space-y-1`}>
              <div className={`flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'} font-bold`}>
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Strict Offline Privacy</span>
              </div>
              <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'} leading-relaxed`}>
                No user account required, no telemetry, and zero tracking. Your listening habits and personal music files stay strictly on your device.
              </p>
            </div>
          </div>
        </div>

        {/* 5. APP INFO METRICS TABLE */}
        <div className={`pt-2 border-t ${isLight ? 'border-zinc-100 divide-zinc-100' : 'border-zinc-900 divide-zinc-900/80'} divide-y text-xs`}>
          <div className="py-2 flex items-center justify-between">
            <span className={`${isLight ? 'text-zinc-600' : 'text-zinc-400'} font-medium`}>App Version</span>
            <span className={`font-mono font-bold ${actStyle.text}`}>v1.3.0 (Stable Release)</span>
          </div>

          <div className="py-2 flex items-center justify-between">
            <span className={`${isLight ? 'text-zinc-600' : 'text-zinc-400'} font-medium`}>Developer</span>
            <span className={`font-semibold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Vivek</span>
          </div>

          <div className="py-2 flex items-center justify-between">
            <span className={`${isLight ? 'text-zinc-600' : 'text-zinc-400'} font-medium`}>Feedback & Support</span>
            <span className={`font-mono text-[11px] font-semibold ${actStyle.text}`}>support.surmusic.com</span>
          </div>

          <div className="py-2 flex items-center justify-between">
            <span className={`${isLight ? 'text-zinc-600' : 'text-zinc-400'} font-medium`}>Technology Stack</span>
            <span className={`${isLight ? 'text-zinc-700' : 'text-zinc-300'} font-mono text-[11px]`}>React 19 • Vite • Web Audio API</span>
          </div>
        </div>

        {/* 6. INTERACTIVE ACTION BUTTONS */}
        <div className={`pt-2 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-900'} grid grid-cols-1 sm:grid-cols-3 gap-2`}>
          <button
            onClick={() => setShowLicensesModal(true)}
            className={`py-2.5 px-3 rounded-xl border ${isLight ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800' : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-850 text-zinc-200'} text-xs font-bold flex items-center justify-between transition-all cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <FileText className={`w-3.5 h-3.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <span>Open Source</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} />
          </button>

          <button
            onClick={() => setShowPrivacyModal(true)}
            className={`py-2.5 px-3 rounded-xl border ${isLight ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800' : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-850 text-zinc-200'} text-xs font-bold flex items-center justify-between transition-all cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Privacy & Terms</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} />
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className={`py-2.5 px-3 rounded-xl border ${isLight ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800' : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-850 text-zinc-200'} text-xs font-bold flex items-center justify-between transition-all cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <Bug className={`w-3.5 h-3.5 ${actStyle.text}`} />
              <span>Feedback / Report</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} />
          </button>
        </div>

        {/* 7. COPYRIGHT NOTICE */}
        <div className={`pt-3 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-900'} text-center`}>
          <p className="text-[10px] text-zinc-500 font-medium">
            Copyright © 2026 Sur Music Player. All rights reserved.
          </p>
        </div>
      </div>

      {/* MODAL 1: OPEN SOURCE LICENSES */}
      {showLicensesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border ${isLight ? 'border-zinc-200 bg-white text-zinc-900 shadow-2xl' : 'border-zinc-800 bg-zinc-950 text-white shadow-2xl'} space-y-4 animate-scale-up max-h-[80vh] flex flex-col`}>
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-zinc-100' : 'border-zinc-900'} pb-3 flex-shrink-0`}>
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${actStyle.text}`} />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}`}>Third-Party Open Source Licenses</h3>
              </div>
              <button
                onClick={() => setShowLicensesModal(false)}
                className={`w-7 h-7 rounded-full ${isLight ? 'bg-zinc-100 text-zinc-600 hover:text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'} flex items-center justify-center`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto space-y-3 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'} pr-1`}>
              <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Sur Music is built upon foundational open-source libraries and APIs. We extend our sincere gratitude to the maintainers:
              </p>

              <div className={`p-3 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'} border space-y-1`}>
                <div className={`flex justify-between items-center font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  <span>React & React DOM</span>
                  <span className={`font-mono text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>MIT License</span>
                </div>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Copyright © Meta Platforms, Inc. and affiliates.</p>
              </div>

              <div className={`p-3 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'} border space-y-1`}>
                <div className={`flex justify-between items-center font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  <span>Lucide Icons</span>
                  <span className={`font-mono text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>ISC License</span>
                </div>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Copyright © Lucide Contributors.</p>
              </div>

              <div className={`p-3 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'} border space-y-1`}>
                <div className={`flex justify-between items-center font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  <span>LRCLIB Community API</span>
                  <span className={`font-mono text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Open Public Database</span>
                </div>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Free, community-driven synced lyrics provider.</p>
              </div>

              <div className={`p-3 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'} border space-y-1`}>
                <div className={`flex justify-between items-center font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  <span>Tailwind CSS</span>
                  <span className={`font-mono text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>MIT License</span>
                </div>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Copyright © Tailwind Labs, Inc.</p>
              </div>

              <div className={`p-3 rounded-xl ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'} border space-y-1`}>
                <div className={`flex justify-between items-center font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                  <span>Vite & Workbox PWA</span>
                  <span className={`font-mono text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>MIT License</span>
                </div>
                <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Fast frontend tooling & offline service worker runtime.</p>
              </div>
            </div>

            <div className={`pt-2 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-900'} flex-shrink-0`}>
              <button
                onClick={() => setShowLicensesModal(false)}
                className={`w-full py-2.5 rounded-xl ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900' : 'bg-zinc-900 hover:bg-zinc-800 text-white'} font-bold text-xs`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRIVACY POLICY & TERMS */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border ${isLight ? 'border-zinc-200 bg-white text-zinc-900 shadow-2xl' : 'border-zinc-800 bg-zinc-950 text-white shadow-2xl'} space-y-4 animate-scale-up max-h-[80vh] flex flex-col`}>
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-zinc-100' : 'border-zinc-900'} pb-3 flex-shrink-0`}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}`}>Privacy Policy & Terms of Use</h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className={`w-7 h-7 rounded-full ${isLight ? 'bg-zinc-100 text-zinc-600 hover:text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'} flex items-center justify-center`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto space-y-3 text-xs ${isLight ? 'text-zinc-700' : 'text-zinc-300'} pr-1 leading-relaxed`}>
              <div className="space-y-1">
                <h4 className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'} text-xs`}>1. Offline First & No Data Collection</h4>
                <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Sur Music does not collect, sell, or transmit any personal data, email addresses, or media files. All scanned songs, playlists, favorites, and settings exist entirely inside your local device storage.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'} text-xs`}>2. Local Storage & IndexedDB</h4>
                <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Audio tracks downloaded through the in-app tool are cached locally in your browser's IndexedDB database. You retain full control to clear individual tracks or erase the entire database at any time.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'} text-xs`}>3. Terms of Use & Fair Usage</h4>
                <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  The media download tool is provided strictly for personal offline listening, fair use, and authorized public domain or copyright-cleared content. Users are responsible for complying with applicable copyright laws.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'} text-xs`}>4. No Account Required</h4>
                <p className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Sur Music does not mandate any user login, sign-up, or third-party authentication to access full functionality.
                </p>
              </div>
            </div>

            <div className={`pt-2 border-t ${isLight ? 'border-zinc-100' : 'border-zinc-900'} flex-shrink-0`}>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className={`w-full py-2.5 rounded-xl ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900' : 'bg-zinc-900 hover:bg-zinc-800 text-white'} font-bold text-xs`}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FEEDBACK / REPORT A PROBLEM */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border ${isLight ? 'border-zinc-200 bg-white text-zinc-900 shadow-2xl' : 'border-zinc-800 bg-zinc-950 text-white shadow-2xl'} space-y-4 animate-scale-up`}>
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-zinc-100' : 'border-zinc-900'} pb-3`}>
              <div className="flex items-center gap-2">
                <Bug className={`w-4 h-4 ${actStyle.text}`} />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-black' : 'text-white'}`}>Feedback & Report a Problem</h3>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className={`w-7 h-7 rounded-full ${isLight ? 'bg-zinc-100 text-zinc-600 hover:text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'} flex items-center justify-center`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSent ? (
              <div className="py-8 text-center space-y-2">
                <div className={`w-12 h-12 rounded-full ${actStyle.badgeBg} border ${actStyle.badgeBorder} flex items-center justify-center ${actStyle.text} mx-auto`}>
                  <Check className="w-6 h-6" />
                </div>
                <h4 className={`text-sm font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Thank You!</h4>
                <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Sending feedback diagnostics to support.surmusic.com.</p>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-3">
                <p className={`text-[11px] ${isLight ? 'text-zinc-600' : 'text-zinc-400'} leading-relaxed`}>
                  Have an idea, found a bug, or facing an issue? Send a direct message to Vivek:
                </p>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Describe your issue, suggestion, or device model..."
                  required
                  rows={4}
                  className={`w-full ${isLight ? 'bg-zinc-50 border-zinc-200 text-black placeholder:text-zinc-400' : 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600'} border rounded-2xl p-3 text-xs outline-none ${actStyle.ring} transition-colors resize-none`}
                />

                <div className={`flex items-center justify-between text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-500'} font-mono`}>
                  <span>To: support.surmusic.com</span>
                  <span>Version: v1.3.0</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className={`flex-1 py-2.5 rounded-xl border ${isLight ? 'border-zinc-200 text-zinc-700 hover:bg-zinc-100' : 'border-zinc-800 text-zinc-400 hover:text-white'} font-bold text-xs`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!feedbackText.trim()}
                    className={`flex-1 py-2.5 rounded-xl ${actStyle.bg} disabled:opacity-50 font-bold text-xs shadow-lg ${actStyle.glow} flex items-center justify-center gap-1.5 cursor-pointer`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
