import { useState, useEffect, useCallback, useRef } from 'react';

const SOUND_PATHS = {
  ambient: '/sounds/ambient.mp3',
  flip: '/sounds/flip.mp3',
  shuffle: '/sounds/shuffle.mp3',
  pop: '/sounds/pop.mp3',
};

export const useSoundManager = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5); // Default volume
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const effectAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    ambientAudioRef.current = new Audio(SOUND_PATHS.ambient);
    ambientAudioRef.current.loop = true;
    return () => {
      ambientAudioRef.current?.pause();
      ambientAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const playAmbientSound = useCallback(() => {
    if (ambientAudioRef.current && ambientAudioRef.current.paused) {
      ambientAudioRef.current.play().catch(error => console.error("Error playing ambient sound:", error));
    }
  }, []);

  const pauseAmbientSound = useCallback(() => {
    if (ambientAudioRef.current && !ambientAudioRef.current.paused) {
      ambientAudioRef.current.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setGlobalVolume = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  const playSoundEffect = useCallback((effectName: keyof typeof SOUND_PATHS) => {
    if (isMuted) return;
    if (effectAudioRef.current) {
      effectAudioRef.current.pause();
    }
    effectAudioRef.current = new Audio(SOUND_PATHS[effectName]);
    effectAudioRef.current.volume = volume;
    effectAudioRef.current.play().catch(error => console.error(`Error playing ${effectName} sound:`, error));
  }, [isMuted, volume]);

  return {
    isMuted,
    volume,
    playAmbientSound,
    pauseAmbientSound,
    toggleMute,
    setGlobalVolume,
    playSoundEffect,
  };
}; 