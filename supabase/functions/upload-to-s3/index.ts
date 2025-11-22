import { S3Bucket } from "https://deno.land/x/s3@0.5.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  file: {
    name: string;
    type: string;
    base64: string;
  };
  path: string;
  bucket?: string;
  oldPath?: string;
  action?: string;
}

interface DeleteRequest {
  path: string;
  bucket?: string;
  oldPath?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, path, bucket, action, oldPath }: UploadRequest & DeleteRequest & { action?: string } = await req.json();

    // Initialize S3 bucket using Deno-native library
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

    // Handle upload action
    if (!file || !path) {
      throw new Error('Missing required fields: file and path');
    }

    console.log('Uploading file to S3:', path);

    // Decode base64 file data
    const fileData = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));

    // Delete old file if oldPath is provided
    if (oldPath) {
      try {
        await s3Bucket.deleteObject(oldPath);
        console.log('Old file deleted:', oldPath);
      } catch (error) {
        console.error('Error deleting old file:', error);
      }
    }

    // Upload new file to S3
    await s3Bucket.putObject(path, fileData, {
      contentType: file.type,
    });

    // Construct the public URL
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
