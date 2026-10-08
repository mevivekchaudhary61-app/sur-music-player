/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Accurately extracts the real duration in seconds from any audio or video Blob, File, or URL.
 */
export function getMediaDuration(mediaSource: Blob | File | string, isVideo = false): Promise<number> {
  return new Promise((resolve) => {
    if (!mediaSource) {
      return resolve(0);
    }

    let url = '';
    let isCreatedUrl = false;

    if (typeof mediaSource === 'string') {
      url = mediaSource;
    } else {
      try {
        url = URL.createObjectURL(mediaSource);
        isCreatedUrl = true;
      } catch (e) {
        return resolve(0);
      }
    }

    const media: HTMLMediaElement = isVideo ? document.createElement('video') : new Audio();
    media.preload = 'metadata';

    let resolved = false;
    const cleanupAndResolve = (seconds: number) => {
      if (resolved) return;
      resolved = true;
      if (isCreatedUrl) {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }
      media.src = '';
      const finalSec = seconds && isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
      resolve(finalSec);
    };

    media.onloadedmetadata = () => {
      cleanupAndResolve(media.duration);
    };

    media.onerror = () => {
      cleanupAndResolve(0);
    };

    media.src = url;

    // Timeout safety fallback
    setTimeout(() => {
      cleanupAndResolve(0);
    }, 4000);
  });
}
