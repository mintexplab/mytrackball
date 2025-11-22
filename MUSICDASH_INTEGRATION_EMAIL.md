# MusicDASH API Integration - Technical Questions

**To:** MusicDASH Developer Team  
**From:** [Your Name/Company]  
**Subject:** Technical Integration Questions for MusicDASH API

---

Hello MusicDASH Team,

We're integrating MusicDASH's distribution API into our music distribution dashboard (Trackball Distribution) and need clarification on several technical implementation details. We'd prefer written documentation to ensure accuracy and avoid miscommunication.

## 1. Authentication & API Access

**OAuth2 Password Flow:**
- What is the exact token endpoint URL? (e.g., `https://api.musicdash.com/oauth/token`)
- What OAuth2 grant type should we use? (password flow, client credentials, etc.)
- What scopes are required for full distribution API access?
- How long do access tokens remain valid? Do you provide refresh tokens?
- Can you provide a sample authentication request/response?

**Credentials:**
- When will we receive our OAuth2 client ID and client secret?
- Are there separate credentials for sandbox/production environments?

---

## 2. File Handling (CRITICAL)

Our dashboard currently uploads audio files and artwork to our own AWS S3 bucket, generating publicly accessible HTTPS URLs like:
```
https://my-trackball-s3bucket.s3.us-east-2.amazonaws.com/audio/track123.wav
https://my-trackball-s3bucket.s3.us-east-2.amazonaws.com/artwork/cover456.jpg
```

**Question:** Which file handling method does MusicDASH support?

**Option A (Preferred):** You accept HTTPS URLs pointing to our S3 files
- We send you the public URL, you download the file from our S3
- Example API payload: `{ "audio_file_url": "https://...", "artwork_url": "https://..." }`

**Option B:** Direct file upload via multipart/form-data
- We upload files directly to your API as binary data
- What are the maximum file size limits?
- What audio formats do you accept? (WAV, FLAC, MP3, etc.)
- What image formats/dimensions for artwork?

**Option C:** Presigned S3 URLs or other method
- Please specify your preferred approach

**This is our most critical question** - please provide clear guidance on your expected file delivery method.

---

## 3. API Endpoints & Documentation

Please provide the complete API documentation, including:

**Release Submission:**
- Endpoint URL for submitting new releases (e.g., `POST /api/releases/submit`)
- Required headers (Content-Type, Authorization, etc.)
- Complete request body schema with all required/optional fields
- Sample successful response (especially the `distribution_id` or tracking ID you return)
- Error response format and common error codes

**Release Status Tracking:**
- Endpoint to check release status (e.g., `GET /api/releases/{distribution_id}/status`)
- What status values do you return? (processing, live, rejected, etc.)
- Response schema

**Takedown/Removal:**
- Endpoint to request release takedown (e.g., `DELETE /api/releases/{distribution_id}`)
- Request/response format

**Earnings/Analytics (if available):**
- Endpoint to retrieve streaming/sales data
- Response format

---

## 4. Webhook Configuration

**Status Update Webhooks:**
- Do you send webhook callbacks when release status changes? (processing → live → etc.)
- What is the webhook payload structure?
- What HTTP method do you use? (POST, PUT)
- Do you sign webhook requests? If so, what signature algorithm?
- What webhook secret will we receive for signature validation?
- What URL should we provide for webhook delivery?
- Do you support webhook retries if our endpoint is temporarily down?

---

## 5. Field Mapping & Metadata

Our release submission form captures the following metadata. Please confirm the exact API field names we should use:

| Our Field | MusicDASH API Field Name? |
|-----------|---------------------------|
| Track title | `track_name` or `title`? |
| Primary artist | `primary_artist` or `artist_name`? |
| Featured artists (array) | `featured_artists`? |
| Release date | `release_date` (format: YYYY-MM-DD?) |
| Genre | `primary_genre`? |
| Artwork URL | `cover_art_url` or `artwork_url`? |
| Audio file URL | `audio_file_url`? |
| UPC code | `upc`? |
| ISRC code | `isrc`? |
| Copyright line (©) | `copyright_text` or `copyright_line`? |
| Phonographic line (℗) | `production_copyright` or `phonographic_line`? |
| Label name | `label_name`? |
| Composers (array) | `composers`? |
| Writers (array) | `writers`? |
| Publishers (array with IPI) | `publishers`? How do you structure publisher data? |
| Language | `language`? (ISO 639-1 codes?) |
| Parental advisory | `parental_advisory`? (boolean or enum?) |

**Please provide your complete field schema or example JSON payload.**

---

## 6. UPC & ISRC Handling

**UPC Codes:**
- If we don't provide a UPC, do you auto-generate one?
- If yes, is it included in your API response after submission?
- Can we retrieve generated UPCs later via API?

**ISRC Codes:**
- Do you accept custom ISRC codes?
- Our system auto-generates ISRCs in format: `CBGNR25xxxxx` - is this compatible?
- If we don't provide ISRCs, do you generate them?

---

## 7. Testing Environment

**Sandbox/Staging:**
- Do you provide a sandbox environment for testing?
- What is the sandbox API base URL?
- Do we use the same credentials or separate test credentials?
- Can we submit test releases without them going live to DSPs?

---

## 8. Rate Limits & Error Handling

**Rate Limiting:**
- What are your API rate limits? (requests per minute/hour)
- How do you communicate rate limit errors? (HTTP 429 with Retry-After header?)

**Retry Logic:**
- For failed API calls, what's your recommended retry strategy?
- Are there specific error codes we should retry vs. fail immediately?

**Error Responses:**
- What HTTP status codes do you use for different error types?
- What is your error response format? (e.g., `{ "error": { "code": "...", "message": "..." } }`)

---

## 9. Platform URLs & Store Links

After a release goes live:
- Do you provide direct links to the release on each DSP (Spotify, Apple Music, etc.)?
- What API endpoint returns these links?
- Example response format?

---

## 10. Timeline & Next Steps

**When can we expect:**
1. API credentials (client ID/secret)
2. Complete API documentation
3. Sandbox environment access
4. Webhook secret for signature validation

**Our implementation timeline:**
Once we receive the above information, we estimate 1-2 weeks for integration development and testing.

---

## Technical Contact

Please send all technical documentation and credentials to:

**Email:** [Your email]  
**Dashboard:** Trackball Distribution (https://[your-domain])  
**Integration Lead:** [Your name]

We're excited to integrate MusicDASH and would greatly appreciate comprehensive written documentation to ensure a smooth, error-free integration.

Thank you for your support!

Best regards,  
[Your Name]  
[Your Title]  
Trackball Distribution
