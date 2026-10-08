/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppTheme = 'dark' | 'light' | 'amoled';

export type AccentColor = 'gold' | 'emerald' | 'cyan' | 'rose' | 'violet' | 'pink';

export interface AccentStyle {
  name: string;
  primaryHex: string;
  text: string;
  textBold: string;
  bg: string;
  bgSolid: string;
  border: string;
  gradient: string;
  cardGradient: string;
  ambientGlow: string;
  glow: string;
  sliderTrack: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  ring: string;
}

export interface ThemeStyle {
  bg: string;
  card: string;
  cardSecondary: string;
  cardHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  border: string;
  borderSubtle: string;
  headerBg: string;
  bottomNavBg: string;
  inputBg: string;
  inputSecondary: string;
  modalBg: string;
  emptyCardBg: string;
}

export const ACCENT_MAP: Record<AccentColor, AccentStyle> = {
  emerald: {
    name: 'Spotify Emerald',
    primaryHex: '#10b981',
    text: 'text-emerald-400',
    textBold: 'text-emerald-500',
    bg: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    bgSolid: 'bg-emerald-500',
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-400 to-teal-500',
    cardGradient: 'from-emerald-950/50 to-zinc-950',
    ambientGlow: 'from-emerald-500/25 to-teal-900/10',
    glow: 'shadow-emerald-500/25',
    sliderTrack: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    ring: 'focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40'
  },
  cyan: {
    name: 'Electric Cyan',
    primaryHex: '#06b6d4',
    text: 'text-cyan-400',
    textBold: 'text-cyan-500',
    bg: 'bg-cyan-500 hover:bg-cyan-400 text-black',
    bgSolid: 'bg-cyan-500',
    border: 'border-cyan-500/30',
    gradient: 'from-cyan-400 to-blue-500',
    cardGradient: 'from-cyan-950/50 to-zinc-950',
    ambientGlow: 'from-cyan-500/25 to-blue-900/10',
    glow: 'shadow-cyan-500/25',
    sliderTrack: 'bg-cyan-500',
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400',
    ring: 'focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40'
  },
  violet: {
    name: 'Cosmic Violet',
    primaryHex: '#8b5cf6',
    text: 'text-violet-400',
    textBold: 'text-violet-500',
    bg: 'bg-violet-500 hover:bg-violet-400 text-white',
    bgSolid: 'bg-violet-500',
    border: 'border-violet-500/30',
    gradient: 'from-violet-400 to-purple-500',
    cardGradient: 'from-violet-950/50 to-zinc-950',
    ambientGlow: 'from-violet-500/25 to-purple-900/10',
    glow: 'shadow-violet-500/25',
    sliderTrack: 'bg-violet-500',
    badgeBg: 'bg-violet-500/15',
    badgeBorder: 'border-violet-500/30',
    badgeText: 'text-violet-400',
    ring: 'focus:border-violet-400 focus:ring-1 focus:ring-violet-400/40'
  },
  rose: {
    name: 'Sunset Rose',
    primaryHex: '#f43f5e',
    text: 'text-rose-400',
    textBold: 'text-rose-500',
    bg: 'bg-rose-500 hover:bg-rose-400 text-white',
    bgSolid: 'bg-rose-500',
    border: 'border-rose-500/30',
    gradient: 'from-rose-400 to-red-500',
    cardGradient: 'from-rose-950/50 to-zinc-950',
    ambientGlow: 'from-rose-500/25 to-red-900/10',
    glow: 'shadow-rose-500/25',
    sliderTrack: 'bg-rose-500',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-400',
    ring: 'focus:border-rose-400 focus:ring-1 focus:ring-rose-400/40'
  },
  gold: {
    name: 'Sunset Amber',
    primaryHex: '#f59e0b',
    text: 'text-amber-400',
    textBold: 'text-amber-500',
    bg: 'bg-amber-500 hover:bg-amber-400 text-black',
    bgSolid: 'bg-amber-500',
    border: 'border-amber-500/30',
    gradient: 'from-amber-400 to-yellow-500',
    cardGradient: 'from-amber-950/50 to-zinc-950',
    ambientGlow: 'from-amber-500/25 to-orange-900/10',
    glow: 'shadow-amber-500/25',
    sliderTrack: 'bg-amber-500',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    ring: 'focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
  },
  pink: {
    name: 'Neon Pink',
    primaryHex: '#ec4899',
    text: 'text-pink-400',
    textBold: 'text-pink-500',
    bg: 'bg-pink-500 hover:bg-pink-400 text-white',
    bgSolid: 'bg-pink-500',
    border: 'border-pink-500/30',
    gradient: 'from-pink-400 to-rose-500',
    cardGradient: 'from-pink-950/50 to-zinc-950',
    ambientGlow: 'from-pink-500/25 to-rose-900/10',
    glow: 'shadow-pink-500/25',
    sliderTrack: 'bg-pink-500',
    badgeBg: 'bg-pink-500/15',
    badgeBorder: 'border-pink-500/30',
    badgeText: 'text-pink-400',
    ring: 'focus:border-pink-400 focus:ring-1 focus:ring-pink-400/40'
  }
};

export function getThemeClasses(theme: AppTheme): ThemeStyle {
  switch (theme) {
    case 'amoled':
      return {
        bg: 'bg-black text-white',
        card: 'bg-zinc-950 border-zinc-900 text-white shadow-2xl',
        cardSecondary: 'bg-zinc-950/70 border-zinc-900 text-zinc-200',
        cardHover: 'hover:bg-zinc-900 hover:border-zinc-800',
        textPrimary: 'text-white',
        textSecondary: 'text-zinc-300',
        textMuted: 'text-zinc-400',
        textDim: 'text-zinc-600',
        border: 'border-zinc-900',
        borderSubtle: 'border-zinc-900/80',
        headerBg: 'bg-black/90 backdrop-blur-md border-zinc-900',
        bottomNavBg: 'bg-black/95 backdrop-blur-md border-zinc-900',
        inputBg: 'bg-zinc-950 border-zinc-900 text-white placeholder:text-zinc-600',
        inputSecondary: 'bg-black border-zinc-900 text-white',
        modalBg: 'bg-black border-zinc-900 text-white shadow-2xl',
        emptyCardBg: 'bg-zinc-950/50 border-zinc-900'
      };
    case 'light':
      return {
        bg: 'bg-white text-black',
        card: 'bg-white border-zinc-200 text-black shadow-sm',
        cardSecondary: 'bg-zinc-50 border-zinc-200 text-zinc-900',
        cardHover: 'hover:bg-zinc-100 hover:border-zinc-300',
        textPrimary: 'text-black',
        textSecondary: 'text-zinc-800',
        textMuted: 'text-zinc-600',
        textDim: 'text-zinc-500',
        border: 'border-zinc-200',
        borderSubtle: 'border-zinc-200',
        headerBg: 'bg-white/95 backdrop-blur-md border-zinc-200',
        bottomNavBg: 'bg-white/95 backdrop-blur-md border-zinc-200 shadow-md',
        inputBg: 'bg-zinc-50 border-zinc-200 text-black placeholder:text-zinc-400 focus:bg-white',
        inputSecondary: 'bg-white border-zinc-200 text-black',
        modalBg: 'bg-white border-zinc-200 text-black shadow-2xl',
        emptyCardBg: 'bg-zinc-50 border-zinc-200'
      };
    case 'dark':
    default:
      return {
        bg: 'bg-zinc-950 text-zinc-100',
        card: 'bg-zinc-900/90 border-zinc-800 text-zinc-100 shadow-xl backdrop-blur-md',
        cardSecondary: 'bg-zinc-900/60 border-zinc-800 text-zinc-200',
        cardHover: 'hover:bg-zinc-850 hover:border-zinc-700',
        textPrimary: 'text-white',
        textSecondary: 'text-zinc-300',
        textMuted: 'text-zinc-400',
        textDim: 'text-zinc-500',
        border: 'border-zinc-800',
        borderSubtle: 'border-zinc-800/60',
        headerBg: 'bg-zinc-950/85 backdrop-blur-md border-zinc-800/80',
        bottomNavBg: 'bg-zinc-950/90 backdrop-blur-md border-zinc-800/80',
        inputBg: 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500',
        inputSecondary: 'bg-zinc-950/80 border-zinc-800 text-white',
        modalBg: 'bg-zinc-950 border-zinc-800 text-white shadow-2xl',
        emptyCardBg: 'bg-zinc-900/40 border-zinc-800'
      };
  }
}
