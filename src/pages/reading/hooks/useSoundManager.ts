import { useEffect, useRef, useCallback, useState } from 'react';

interface SoundManager {
  playSound: (soundName: SoundName, loop?: boolean) => void;
  stopSound: (soundName: SoundName) => void;
  stopAllSounds: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  volume: number;
}

type SoundName = 'flip' | 'shuffle' | 'drop' | 'ambient' | 'uiPop'; // Added uiPop

const soundFiles: Record<SoundName, string> = {
  flip: '/sounds/flipcard.mp3',
  shuffle: '/sounds/tarot-shuffle.mp3',
  drop: '/sounds/ui-pop-sound.mp3', // Changed from a generic drop to ui-pop specifically
  uiPop: '/sounds/ui-pop-sound.mp3', // Explicitly add uiPop
  ambient: '/sounds/ambient-background-loop.mp3',
};

export const useSoundManager = (): SoundManager => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.75); // Default volume 75%

  const audioRefs = useRef<Record<SoundName, HTMLAudioElement | null>>({
    flip: null,
    shuffle: null,
    drop: null,
    uiPop: null, // Added uiPop
    ambient: null,
  });

  const applyVolumeToAllSounds = useCallback(() => {
    (Object.keys(audioRefs.current) as SoundName[]).forEach(soundName => {
      const audio = audioRefs.current[soundName];
      if (audio) {
        audio.volume = volume;
      }
    });
  }, [volume]);

  const loadSound = useCallback((soundName: SoundName, loop: boolean = false) => {
    if (typeof window !== 'undefined' && !audioRefs.current[soundName]) {
      const audio = new Audio(soundFiles[soundName]);
      audio.loop = loop;
      audio.preload = 'auto';
      audio.volume = volume; // Set initial volume
      audioRefs.current[soundName] = audio;
      audio.play().then(() => audio.pause()).catch(() => {}); // Pre-load hack for some browsers
    }
  }, [volume]);

  useEffect(() => {
    // Preload all sounds
    (Object.keys(soundFiles) as SoundName[]).forEach(soundName => {
      loadSound(soundName, soundName === 'ambient' || soundName === 'shuffle');
    });

    return () => {
      // Cleanup audio elements on unmount
      (Object.keys(audioRefs.current) as SoundName[]).forEach(soundName => {
        const audio = audioRefs.current[soundName];
        if (audio) {
          audio.pause();
          audio.src = ''; // Release resource
        }
      });
      audioRefs.current = { flip: null, shuffle: null, drop: null, uiPop: null, ambient: null };
    };
  }, [loadSound]);

  // Apply volume changes to already loaded sounds
  useEffect(() => {
    applyVolumeToAllSounds();
  }, [volume, applyVolumeToAllSounds]);

  const playSound = useCallback((soundName: SoundName, loop: boolean = false) => {
    if (isMuted) return;
    const audio = audioRefs.current[soundName];
    if (audio) {
      audio.loop = loop;
      audio.currentTime = 0;
      audio.volume = volume; // Ensure volume is set
      audio.play().catch(error => console.error(`Error playing sound ${soundName}:`, error));
    } else {
      // If not preloaded, load and play
      if (typeof window !== 'undefined') {
        const newAudio = new Audio(soundFiles[soundName]);
        newAudio.loop = loop;
        newAudio.preload = 'auto';
        newAudio.volume = volume;
        audioRefs.current[soundName] = newAudio;
        newAudio.play().catch(error => console.error(`Error playing sound ${soundName} (on-demand):`, error));
      }
    }
  }, [isMuted, volume]);

  const stopSound = useCallback((soundName: SoundName) => {
    const audio = audioRefs.current[soundName];
    if (audio) {
      audio.pause();
      audio.currentTime = 0; // Reset for next play
    }
  }, []);

  const stopAllSounds = useCallback(() => {
    (Object.keys(audioRefs.current) as SoundName[]).forEach(soundName => {
      stopSound(soundName);
    });
  }, [stopSound]);

  const toggleMute = useCallback(() => {
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      (Object.keys(audioRefs.current) as SoundName[]).forEach(soundName => {
        const audio = audioRefs.current[soundName];
        if (audio) {
          audio.muted = newMutedState;
        }
      });
      // If unmuting, and ambient sound was playing, resume it.
      if (!newMutedState && audioRefs.current.ambient?.paused && audioRefs.current.ambient.loop) {
         audioRefs.current.ambient.play().catch(e => console.error("Error resuming ambient sound:", e));
      }
      return newMutedState;
    });
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    // applyVolumeToAllSounds() is called by useEffect watching volume state
  }, []);

  return { playSound, stopSound, stopAllSounds, toggleMute, setVolume, isMuted, volume };
}; 