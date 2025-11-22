import { useState } from 'react';
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
      // Use FormData for efficient streaming upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      if (oldPath) {
        formData.append('oldPath', oldPath);
      }

      // Get the Supabase URL and anon key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Make direct fetch call to edge function with FormData
      const response = await fetch(`${supabaseUrl}/functions/v1/upload-to-s3`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/upload-to-s3`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          oldPath: path,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const data = await response.json();
      
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
