import { S3Client, PutObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.490.0";

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

    // Initialize S3 client
    const s3Client = new S3Client({
      region: Deno.env.get('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    const bucketName = bucket || Deno.env.get('AWS_S3_BUCKET_NAME')!;

    // Handle delete action
    if (action === 'delete' && oldPath) {
      console.log('Deleting file from S3:', oldPath);
      
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: oldPath,
      });

      await s3Client.send(deleteCommand);
      
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
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: oldPath,
        });
        await s3Client.send(deleteCommand);
        console.log('Old file deleted:', oldPath);
      } catch (error) {
        console.error('Error deleting old file:', error);
      }
    }

    // Upload new file to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: path,
      Body: fileData,
      ContentType: file.type,
    });

    await s3Client.send(uploadCommand);

    // Construct the public URL
    const publicUrl = `https://${bucketName}.s3.${Deno.env.get('AWS_REGION')}.amazonaws.com/${path}`;

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
