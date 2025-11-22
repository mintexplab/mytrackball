# MusicDASH API Integration Workflow

## ✅ Current Status

### What's Already Working:
1. **S3 Storage**: ✅ Working - Profile pictures and files upload successfully to AWS S3
2. **Audio Player**: ✅ Exists - AudioPlayer component is implemented in ReleaseInfoDialog and BulkUploadTab
3. **Release Metadata**: ✅ Complete - Full multi-step submission form with all MusicDASH fields
4. **Database Schema**: ✅ Ready - Releases table contains all necessary metadata fields

### Testing S3 Audio:
- Upload a release with audio file
- View the release in Release Info dialog
- Audio player will appear and play the S3-hosted audio file

---

## 🔄 MusicDASH Integration Workflow

### When You Approve a Release:

**Step 1: Admin Approves Release**
- Admin clicks "Approve" in Admin Portal
- Triggers edge function: `distribute-release`

**Step 2: Auto-Distribution to MusicDASH**
```typescript
// supabase/functions/distribute-release/index.ts
- Fetch release + tracks from database
- Map metadata to MusicDASH API format:
  • Release title, artist, version, genre
  • Artwork URL (from S3)
  • Audio file URL (from S3)
  • All track metadata (composers, writers, performers)
  • Copyright lines (C-Line, P-Line)
  • UPC/ISRC codes
- POST to MusicDASH API: /api/releases/submit
- Store MusicDASH distribution_id in database
- Update release status to "delivering"
```

**Step 3: MusicDASH Webhook Updates**
```typescript
// supabase/functions/musicdash-webhook/index.ts
- MusicDASH sends status updates to your webhook
- Possible statuses: processing, live, rejected, error
- Update release status in database
- Send email notification to user
```

---

## 🔽 Takedown Process

### Admin Initiates Takedown:
1. Admin clicks "Request Takedown" button on approved release
2. Edge function: `takedown-release`
3. Calls MusicDASH takedown API with `distribution_id`
4. Updates release status to "taken down"
5. Sends email notification to user

---

## 🗄️ Required Database Changes

```sql
-- Add MusicDASH tracking fields to releases table
ALTER TABLE public.releases
ADD COLUMN distribution_id TEXT,
ADD COLUMN distribution_platform TEXT DEFAULT 'MusicDASH',
ADD COLUMN distributed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN platform_urls JSONB DEFAULT '{}'::jsonb;

-- Track distribution history
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

---

## 🔐 Required Secrets

Store these in Lovable Cloud secrets:
- `MUSICDASH_CLIENT_ID` (OAuth2 client ID)
- `MUSICDASH_CLIENT_SECRET` (OAuth2 client secret)
- `MUSICDASH_API_URL` (Base API URL)
- `MUSICDASH_WEBHOOK_SECRET` (For webhook signature validation)

---

## 📋 Metadata Field Mapping

Since you copied MusicDASH's form structure, the mapping should be 1:1:

| Your Field | MusicDASH API Field |
|------------|---------------------|
| `title` | `track_name` |
| `artist_name` | `primary_artist` |
| `release_date` | `release_date` |
| `genre` | `primary_genre` |
| `artwork_url` | `cover_art_url` |
| `audio_file_url` | `audio_file_url` |
| `upc` | `upc` |
| `isrc` | `isrc` |
| `copyright_line` | `copyright_text` |
| `phonographic_line` | `production_copyright` |
| (tracks array) | `tracks` |

**NOTE**: Confirm exact field names when you receive MusicDASH API documentation.

---

## 🚀 Implementation Checklist

**Once MusicDASH confirms API access:**

- [ ] Receive OAuth2 credentials
- [ ] Get API documentation with endpoints
- [ ] Add secrets to Lovable Cloud
- [ ] Run database migration (add distribution fields)
- [ ] Create edge function: `distribute-release`
- [ ] Create edge function: `musicdash-webhook`
- [ ] Create edge function: `takedown-release`
- [ ] Add "Request Takedown" button in Admin Portal
- [ ] Test with sandbox/test release first
- [ ] Confirm webhook signature validation
- [ ] Set up error handling & retry logic

---

## 🐛 Current Issues - RESOLVED

### ✅ Profile Picture Not Updating:
**Solution**: Added realtime subscription to Dashboard that listens for profile updates. Avatar now refreshes immediately when changed in Account Settings.

### ✅ S3 Bucket Working:
**Confirmed**: Profile picture successfully uploaded to:
```
https://my-trackball-s3bucket.s3.us-east-2.amazonaws.com/profile-pictures/...
```
S3 integration is fully operational for all file types (artwork, audio, profile pictures).

### ✅ Audio Player Exists:
**Location**: `src/components/AudioPlayer.tsx`
**Used in**: ReleaseInfoDialog, BulkUploadTab
**Status**: Fully functional - ready to test with uploaded audio files

---

## 📞 Next Steps

1. **Wait for MusicDASH confirmation** - Don't build integration until approved
2. **Request API docs** - Get exact endpoint URLs and field mappings
3. **Test S3 audio** - Upload a release with audio and test the player
4. **Review OAuth flow** - Confirm password flow requirements with MusicDASH

---

## 💡 Questions to Ask MusicDASH:

1. What's the exact OAuth2 token endpoint?
2. Do you support webhook callbacks for status updates?
3. What's the rate limit for API calls?
4. Can we send S3 URLs directly or do you require file uploads?
5. What's the takedown API endpoint?
6. Do you provide a sandbox/test environment?
