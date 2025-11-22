import { useState } from 'react';
import { toast } from 'sonner';

interface UploadOptions {
  file: File;
  path: string;
  oldPath?: string;
  onProgress?: (progress: number) => void;
}

export const useS3Upload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async ({ file, path, oldPath, onProgress }: UploadOptions): Promise<string | null> => {
    setUploading(true);
    setUploadProgress(0);
    
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

      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            if (onProgress) {
              onProgress(progress);
            }
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.success) {
                resolve(data.url);
              } else {
                reject(new Error('Upload failed'));
              }
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        // Send request
        xhr.open('POST', `${supabaseUrl}/functions/v1/upload-to-s3`);
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
        xhr.send(formData);
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  return { uploadFile, deleteFile, uploading, uploadProgress };
};
