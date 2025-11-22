import { S3Bucket } from "https://deno.land/x/s3@0.5.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

      console.log(`Uploading file to S3 (streaming): ${path}, size: ${file.size} bytes`);

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
          await s3Bucket.deleteObject(oldPath);
          console.log('Old file deleted:', oldPath);
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
      
      const fileData = Uint8Array.from(atob(body.file.base64), c => c.charCodeAt(0));
      
      if (oldPath) {
        try {
          await s3Bucket.deleteObject(oldPath);
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
