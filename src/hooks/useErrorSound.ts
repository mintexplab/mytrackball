import { useRef, useCallback } from 'react';
import errorSound from '@/assets/error-sound.mp3';

export const useErrorSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playErrorSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(errorSound);
      audioRef.current.volume = 0.4;
    }
    
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.error('Error playing sound:', e));
  }, []);

  return { playErrorSound };
};

// Standalone function for use outside of React components
let globalAudioInstance: HTMLAudioElement | null = null;

export const playErrorSound = () => {
  if (!globalAudioInstance) {
    globalAudioInstance = new Audio(errorSound);
    globalAudioInstance.volume = 0.4;
  }
  
  globalAudioInstance.currentTime = 0;
  globalAudioInstance.play().catch(e => console.error('Error playing sound:', e));
};
