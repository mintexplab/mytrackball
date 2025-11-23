import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

      // Get the Supabase URL and user token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        throw new Error('Supabase configuration missing');
      }

      // Get current user session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const userToken = session?.access_token;

      if (!userToken) {
        throw new Error('Not authenticated - please log in');
      }

      console.log('Starting upload to:', `${supabaseUrl}/functions/v1/upload-to-s3`);
      console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);

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
            console.log(`Upload progress: ${progress}%`);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          console.log('Upload complete. Status:', xhr.status);
          console.log('Response:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.success) {
                console.log('Upload successful:', data.url);
                resolve(data.url);
              } else {
                console.error('Upload failed - no success flag:', data);
                reject(new Error(data.error || 'Upload failed'));
              }
            } catch (error) {
              console.error('Failed to parse response:', error, xhr.responseText);
              reject(new Error('Failed to parse response'));
            }
          } else {
            console.error('Upload failed with status:', xhr.status, xhr.responseText);
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        // Handle errors
        xhr.addEventListener('error', (e) => {
          console.error('Network error during upload:', e);
          console.error('XHR state:', {
            readyState: xhr.readyState,
            status: xhr.status,
            statusText: xhr.statusText
          });
          reject(new Error('Network error - check console for details'));
        });

        // Handle timeout
        xhr.addEventListener('timeout', () => {
          console.error('Upload timeout');
          reject(new Error('Upload timeout - file may be too large'));
        });

        // Set timeout to 10 minutes for large files
        xhr.timeout = 600000;

        // Send request with user session token
        xhr.open('POST', `${supabaseUrl}/functions/v1/upload-to-s3`);
        xhr.setRequestHeader('Authorization', `Bearer ${userToken}`);
        console.log('Sending upload request...');
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
      
      if (!supabaseUrl) {
        throw new Error('Supabase configuration missing');
      }

      // Get current user session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const userToken = session?.access_token;

      if (!userToken) {
        throw new Error('Not authenticated - please log in');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/upload-to-s3`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
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
