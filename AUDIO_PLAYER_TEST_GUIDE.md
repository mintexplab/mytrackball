# Audio Player Testing Guide

## ✅ Current Status

**S3 Audio Upload**: ✅ Working
**Audio Player Component**: ✅ Exists in `src/components/AudioPlayer.tsx`
**Database Integration**: ✅ Ready (`audio_file_url` column)

## 🎵 How to Test Audio Player

### Step 1: Create a Release
1. **Desktop**: Click "New Release" button (top right of dashboard)
   **Mobile**: Preview mode → "New Release" button
   
2. **Complete 6-Step Wizard**:
   - **Step 1**: Submission Details
     - Song title (required)
     - Artist name (required)
     - Genre (required)
   
   - **Step 2**: Upload Artwork (required)
     - Format: JPG/JPEG only
     - Size: 1500x1500 to 3000x3000 pixels
     - Max file size: 10MB
   
   - **Step 3**: Upload Audio File (required)
     - Formats: WAV, FLAC, AIFF, or WMA (Lossless)
     - Max file size: 500MB
     - Uploads to S3: `release-audio/{user_id}/{timestamp}.{ext}`
   
   - **Step 4**: Metadata Details
     - Preview start time
     - Languages
     - Release dates
     - Parental advisory
   
   - **Step 5**: Contributors
     - Authors, composers, publishers
     - Producers, performers
   
   - **Step 6**: Additional Notes
     - Optional notes for admin

3. **Submit Release**
   - Files upload to S3
   - Release saves to database with `audio_file_url`
   - Status set to "pending"

### Step 2: Access Audio Player
1. Return to dashboard
2. Navigate to **Overview** tab
3. **Click on release artwork** in gallery
4. **Click "Information" button**
5. **Scroll to "AUDIO PREVIEW" section**
6. **Audio player appears** if audio was uploaded

### Audio Player Features:
- Play/Pause button
- Progress slider (seek)
- Current time / Total duration
- Volume control
- Mute/unmute button
- **Bonus**: "Open in Floating Player" button (plays in persistent mini-player)

## 🔍 Where Audio Player Appears

### Current Locations:
1. **Release Information Dialog** (main location)
   - Gallery view → Click artwork → Information button
   - Catalog view → Information button

2. **Bulk Upload Tab** (admin/advanced)
   - Preview uploaded releases before submission

### Floating Audio Player:
- Click "Open in Floating Player" in release info
- Persists across tab changes
- Bottom-right corner with minimize/close

## 🐛 Troubleshooting

### "I don't see the audio player"
**Cause**: Release has no `audio_file_url` in database
**Solution**: 
- Upload audio file in Step 3 of release creation
- Verify upload completed (check for success toast)
- Check database: `SELECT audio_file_url FROM releases WHERE id = 'your-release-id'`

### "Audio file won't upload"
**Possible causes**:
1. Wrong format (must be WAV, FLAC, AIFF, or WMA)
2. File too large (max 500MB)
3. S3 credentials missing/incorrect
**Solution**:
- Check console logs for errors
- Verify S3 secrets are configured
- Test with smaller file first

### "Upload gets stuck at X%"
**Cause**: Network timeout or large file
**Solution**:
- Check network connection
- Try smaller file to isolate issue
- Check edge function logs: `upload-to-s3`

## 📊 Database Schema

```sql
-- Releases table
CREATE TABLE public.releases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  audio_file_url TEXT, -- S3 URL to audio file
  artwork_url TEXT,    -- S3 URL to artwork
  release_date DATE,
  status TEXT DEFAULT 'pending',
  -- ... other fields
);
```

## 🎯 Testing Checklist

- [ ] Create test release with audio file
- [ ] Verify audio uploads to S3
- [ ] Confirm `audio_file_url` saved in database
- [ ] Open release information dialog
- [ ] Verify audio player appears
- [ ] Test play/pause functionality
- [ ] Test seek slider
- [ ] Test volume controls
- [ ] Test floating player
- [ ] Test on mobile (if applicable)

## 🚀 Next Steps After Testing

Once audio player is confirmed working:
1. Test with various audio formats (WAV, FLAC, AIFF)
2. Test with different file sizes
3. Test playback quality
4. Consider adding:
   - Waveform visualization
   - Playback speed controls
   - Download button (for user's own releases)
   - Share functionality
