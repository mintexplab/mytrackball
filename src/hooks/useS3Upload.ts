import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadOptions {
  file: File;
  path: string;
  oldPath?: string;
}

export const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async ({ file, path, oldPath }: UploadOptions): Promise<string | null> => {
    setUploading(true);
    
    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      // Call edge function
      const { data, error } = await supabase.functions.invoke('upload-to-s3', {
        body: {
          file: {
            name: file.name,
            type: file.type,
            base64: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
          },
          path,
          oldPath,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Upload failed');

      return data.url;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    setUploading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('upload-to-s3', {
        body: {
          action: 'delete',
          oldPath: path,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Delete failed');

      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete file');
      return false;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, deleteFile, uploading };
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
