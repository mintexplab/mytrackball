import { toast as sonnerToast } from 'sonner';
import { playErrorSound } from '@/hooks/useErrorSound';

// Wrapper around sonner toast that plays error sound on toast.error
export const toast = {
  ...sonnerToast,
  error: (message: string | React.ReactNode, data?: any) => {
    playErrorSound();
    return sonnerToast.error(message, data);
  },
};
