# Music Distribution API Integration Guide

## Overview
This document outlines the structure and potential integration points for music distribution APIs (e.g., DistroKid, TuneCore, CD Baby APIs) in the My Trackball platform.

## Current Database Schema
The platform is designed with API integration in mind:

### Releases Table
- Contains all metadata required by major distribution APIs:
  - Basic info: `title`, `artist_name`, `release_date`, `genre`
  - Rights management: `copyright_line`, `phonographic_line`, `courtesy_line`
  - Media: `artwork_url`, `audio_file_url`
  - Identifiers: `upc`, `isrc`
  - Multi-disc support: `is_multi_disc`, `disc_number`, `total_discs`
  - Status tracking: `status` (pending, approved, rejected, published)

### Tracks Table
- Individual track management for albums/EPs:
  - `track_number`, `title`, `duration`
  - `isrc` codes for each track
  - `audio_file_url` for track audio files
  - `featured_artists` array support

## Future API Integration Points

### 1. Distribution API Connection
**Purpose**: Automatically distribute approved releases to streaming platforms

**Implementation Steps**:
1. Create Edge Function: `distribute-release`
2. Store API credentials in Supabase Secrets
3. Map database fields to API payload
4. Handle webhook callbacks for distribution status

**Example Edge Function Structure**:
```typescript
// supabase/functions/distribute-release/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { release_id } = await req.json()
  
  // Fetch release and tracks from database
  // Map to distribution API format
  // Send to distribution platform
  // Update release status based on response
  
  return new Response(JSON.stringify({ success: true }))
})
```

### 2. Supported Distribution APIs

#### DistroKid API (Hypothetical)
- Endpoint: `/api/v1/releases`
- Required: Artist name, release title, tracks, artwork
- Returns: Distribution ID, platform-specific links

#### TuneCore API (Hypothetical)
- Endpoint: `/api/releases/submit`
- Required: UPC/ISRC codes, copyright info, tracks
- Returns: Submission ID, approval status

#### CD Baby API (Hypothetical)
- Endpoint: `/api/distribution/create`
- Required: Full metadata, audio files, artwork
- Returns: Distribution tracking number

### 3. Webhook Integration
**Purpose**: Receive status updates from distribution platforms

**Implementation**:
```typescript
// supabase/functions/distribution-webhook/index.ts
// Handles callbacks from distribution platforms
// Updates release status in database
// Notifies users via email
```

### 4. Analytics Integration
**Purpose**: Fetch streaming data from platforms

**Potential Integrations**:
- Spotify for Artists API
- Apple Music for Artists API
- YouTube Analytics API
- SoundCloud API

### 5. Automated Metadata Sync
When a release is approved in the admin portal:
1. Validate all required fields are present
2. Format data according to API specifications
3. Upload audio files and artwork to distribution CDN
4. Submit release metadata to distribution API
5. Store distribution ID for tracking
6. Set up webhook listener for status updates

## Database Modifications for API Integration

### Add to `releases` table:
```sql
ALTER TABLE public.releases
ADD COLUMN distribution_id TEXT,
ADD COLUMN distribution_platform TEXT,
ADD COLUMN distributed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN platform_urls JSONB DEFAULT '{}'::jsonb;
```

### Create `distribution_logs` table:
```sql
CREATE TABLE public.distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB,
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations
- Store all API keys in Supabase Secrets
- Use Edge Functions to keep API calls server-side
- Implement rate limiting for API calls
- Log all API interactions for debugging
- Validate webhook signatures

## Next Steps
1. Research specific distribution platform APIs
2. Obtain API credentials from chosen platforms
3. Implement basic Edge Function for one platform
4. Test with sample release data
5. Expand to multiple platforms
6. Build admin dashboard for API monitoring

## Notes
- This structure supports multiple distribution platforms simultaneously
- The flexible JSONB fields allow for platform-specific metadata
- Track-level metadata enables proper EP/Album distribution
- Status tracking allows users to monitor distribution progress
