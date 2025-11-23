import { S3Bucket } from "https://deno.land/x/s3@0.5.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FILE_TYPES = ['audio/', 'image/'];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);
    // ============================================

    const contentType = req.headers.get('content-type') || '';
    
    // Handle multipart/form-data for file uploads (new streaming approach)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const path = formData.get('path') as string;
      const oldPath = formData.get('oldPath') as string | null;
      const bucket = formData.get('bucket') as string | null;

      if (!file || !path) {
        throw new Error('Missing required fields: file and path');
      }

      // ============ FILE SIZE VALIDATION ============
      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ FILE TYPE VALIDATION ============
      if (!ALLOWED_FILE_TYPES.some(type => file.type.startsWith(type))) {
        return new Response(
          JSON.stringify({ error: 'Invalid file type. Only audio and image files are allowed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============ PATH VALIDATION ============
      // Ensure path includes user ID to prevent unauthorized access to other users' files
      if (!path.startsWith(`${user.id}/`) && !path.startsWith('public/')) {
        return new Response(
          JSON.stringify({ error: 'Invalid path. Path must start with your user ID' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Uploading file to S3: ${path}, size: ${file.size} bytes, type: ${file.type}`);

      // Initialize S3 bucket
      const s3Bucket = new S3Bucket({
        accessKeyID: Deno.env.get('AWS_ACCESS_KEY_ID')!,
        secretKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
        bucket: bucket || Deno.env.get('AWS_S3_BUCKET_NAME')!,
        region: Deno.env.get('AWS_REGION') || 'us-east-1',
      });

      // Delete old file if exists
      if (oldPath) {
        try {
          // Verify user owns the old file too
          if (oldPath.startsWith(`${user.id}/`) || oldPath.startsWith('public/')) {
            await s3Bucket.deleteObject(oldPath);
            console.log('Old file deleted:', oldPath);
          }
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
      }

      // Convert file to Uint8Array using streaming
      const fileData = new Uint8Array(await file.arrayBuffer());

      // Upload to S3 (bucket policy controls public access)
      await s3Bucket.putObject(path, fileData, {
        contentType: file.type,
      });

      // Construct public URL
      const bucketName = bucket || Deno.env.get('AWS_S3_BUCKET_NAME')!;
      const region = Deno.env.get('AWS_REGION') || 'us-east-1';
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${path}`;

      console.log('File uploaded successfully:', publicUrl);

      return new Response(
        JSON.stringify({
          success: true,
          url: publicUrl,
          path: path,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle JSON requests (for delete operations and backward compatibility)
    const body = await req.json();
    const { action, oldPath, path, bucket } = body;

    // Initialize S3 bucket
    const s3Bucket = new S3Bucket({
      accessKeyID: Deno.env.get('AWS_ACCESS_KEY_ID')!,
      secretKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
      bucket: bucket || Deno.env.get('AWS_S3_BUCKET_NAME')!,
      region: Deno.env.get('AWS_REGION') || 'us-east-1',
    });

    // Handle delete action
    if (action === 'delete' && oldPath) {
      // Verify user owns the file
      if (!oldPath.startsWith(`${user.id}/`) && !oldPath.startsWith('public/')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized to delete this file' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Deleting file from S3:', oldPath);
      await s3Bucket.deleteObject(oldPath);
      
      return new Response(
        JSON.stringify({ success: true, message: 'File deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we get here with JSON, it might be old base64 format (deprecated but supported)
    if (body.file?.base64) {
      console.warn('Using deprecated base64 upload - please switch to multipart/form-data');
      
      // Validate file size from base64
      const base64Length = body.file.base64.length;
      const fileSize = (base64Length * 3) / 4;
      if (fileSize > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate path
      if (!path.startsWith(`${user.id}/`) && !path.startsWith('public/')) {
        return new Response(
          JSON.stringify({ error: 'Invalid path. Path must start with your user ID' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const fileData = Uint8Array.from(atob(body.file.base64), c => c.charCodeAt(0));
      
      if (oldPath) {
        try {
          if (oldPath.startsWith(`${user.id}/`) || oldPath.startsWith('public/')) {
            await s3Bucket.deleteObject(oldPath);
          }
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
      }

      await s3Bucket.putObject(path, fileData, {
        contentType: body.file.type,
      });

      const bucketName = bucket || Deno.env.get('AWS_S3_BUCKET_NAME')!;
      const region = Deno.env.get('AWS_REGION') || 'us-east-1';
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${path}`;

      return new Response(
        JSON.stringify({ success: true, url: publicUrl, path }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid request format');

  } catch (error: any) {
    console.error('Error in upload-to-s3:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
