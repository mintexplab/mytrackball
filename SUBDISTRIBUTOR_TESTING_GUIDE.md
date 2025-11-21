# Subdistributor Invitation Flow - Testing Guide

## Overview
This guide walks through testing the complete subdistributor white-label system with path-based routing and isolated data.

## Architecture Summary
- **Path-based routing**: `/subdistributor/{slug}` for login, `/subdistributor/{slug}/accept?token={token}` for invitations
- **Isolated data**: Each subdistributor has completely separate users, releases, and data (RLS enforced)
- **Invitation-only**: Subdistributor users can ONLY be created via invitation (no open signup)
- **Custom branding**: Each subdistributor gets custom colors and logo that load automatically

---

## Step-by-Step Testing

### 1. Login as Master Admin
```
Email: distribution@xz1recordings.ca
Password: Backformore123!!!
```

Navigate to: `/dashboard` → Admin Portal → Subdistributors tab

---

### 2. Create a Test Subdistributor

Fill in the form:
- **Name**: "Test Music Distribution"
- **Slug**: "test-music" (this becomes the URL path)
- **Primary Color**: #3b82f6 (blue, to verify branding)
- **Background Color**: #1a1a1a (dark grey)
- **Owner Email**: your-test-email@example.com

Click "Create Sub-Distributor"

**Expected Results:**
- ✅ Subdistributor appears in the list below
- ✅ Toast notification: "Sub-distributor created and invitation sent"
- ✅ Email sent to the owner email address

---

### 3. Check the Invitation Email

Open your test email inbox and find the invitation email.

**What to verify:**
- ✅ Email subject: "Invitation to manage Test Music Distribution"
- ✅ Email is styled with the custom primary color (#3b82f6)
- ✅ Contains an "Accept Invitation" button
- ✅ Button links to: `/subdistributor/test-music/accept?token={unique-token}`

**Debugging tip:** Check console logs in the admin portal - edge function calls should show success

---

### 4. Click the Invitation Link

Click "Accept Invitation" in the email.

**Expected Results:**
- ✅ Redirects to: `/subdistributor/test-music/accept?token={token}`
- ✅ Page shows custom branding (blue primary color, dark grey background)
- ✅ Shows "Join Test Music Distribution" header
- ✅ Email field is pre-filled and disabled
- ✅ Form has Full Name and Password fields
- ✅ Submit button styled with custom primary color

**Debugging tip:** 
- Open browser console and check for logs starting with "Loading invitation with token:"
- Should see invitation data logged
- No errors should appear

---

### 5. Create Subdistributor Admin Account

Fill in the form:
- **Full Name**: "Test Admin"
- **Password**: "TestPass123!"

Click "Accept Invitation & Create Account"

**Expected Results:**
- ✅ Toast: "Account created successfully! Redirecting to dashboard..."
- ✅ After 2 seconds, redirects to `/dashboard`
- ✅ Dashboard shows the subdistributor branding (blue theme)
- ✅ Dashboard shows AdminPortal (not artist dashboard)
- ✅ Top shows subdistributor name and logo

**Database Changes:**
- ✅ New user created in auth.users
- ✅ Profile created with subdistributor_id set
- ✅ user_roles entry with role='subdistributor_admin'
- ✅ subdistributors.owner_id set to new user
- ✅ invitation status changed to 'accepted'

---

### 6. Verify Subdistributor Admin Portal

While logged in as the subdistributor admin:

**UI Verification:**
- ✅ Name displays "Test Music Distribution" (not "Trackball Distribution")
- ✅ Logo displays custom logo if uploaded
- ✅ Color scheme is blue/grey (not red/black)
- ✅ Footer still shows XZ1 copyright

**Access Verification:**
- ✅ Can see Admin Portal tabs (Users, Releases, Royalties, etc.)
- ✅ Cannot see any Trackball users or releases
- ✅ User list is empty (only invitation-based)
- ✅ Release list is empty

**Try to:**
- ✅ Cannot access other subdistributor data
- ✅ Cannot see Trackball Distribution data

---

### 7. Test Subdistributor Login Page

Log out, then navigate to: `/subdistributor/test-music`

**Expected Results:**
- ✅ Shows custom branded login page
- ✅ Blue theme applied
- ✅ Shows "Test Music Distribution" name
- ✅ Message: "Invitation only. Contact your administrator to get access."
- ✅ NO signup option visible
- ✅ Only login form visible

**Test login:**
- Use the subdistributor admin credentials you just created
- ✅ Should successfully log in
- ✅ Should redirect to dashboard with branding

---

### 8. Test Data Isolation

**As master admin:**
1. Create a test user in main Trackball
2. Create a test release

**Then as subdistributor admin:**
- ✅ CANNOT see the Trackball user
- ✅ CANNOT see the Trackball release
- ✅ Completely isolated data

**Test attempting to access wrong subdistributor:**
1. Create a second subdistributor "other-test"
2. Try logging in to `/subdistributor/test-music` with "other-test" credentials
- ✅ Should fail with: "This account does not belong to this subdistributor"

---

## Common Issues & Debugging

### Issue: "Invitation not found or has expired"
**Check:**
- Token is valid in subdistributor_invitations table
- Status is 'pending'
- expires_at is in the future
- Slug in URL matches subdistributor slug

### Issue: Black screen on acceptance page
**Check:**
- Console logs for errors
- Network tab for failed API calls
- Subdistributor slug exists in database
- Token is present in URL

### Issue: Email not sending
**Check:**
- RESEND_API_KEY is configured
- Domain is verified in Resend
- Check edge function logs (backend)
- Console logs for edge function errors

### Issue: Branding not applying
**Check:**
- Console logs show "Invitation loaded successfully"
- Colors are valid hex codes
- CSS variables are being set (inspect element)

### Issue: User sees Trackball data instead of isolated data
**Check:**
- User has subdistributor_id set in profiles table
- RLS policies are enabled on all tables
- User has subdistributor_admin role

---

## Database Queries for Verification

```sql
-- Check subdistributor was created
SELECT * FROM subdistributors WHERE slug = 'test-music';

-- Check invitation was created
SELECT * FROM subdistributor_invitations WHERE subdistributor_id = '{subdist-id}';

-- Check user was created with correct subdistributor
SELECT p.*, ur.role 
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.subdistributor_id = '{subdist-id}';

-- Check subdistributor owner was set
SELECT owner_id, name FROM subdistributors WHERE slug = 'test-music';
```

---

## Success Criteria

✅ All steps complete without errors
✅ Custom branding visible throughout
✅ Data is completely isolated
✅ No signup option on subdistributor login
✅ Invitation-only access enforced
✅ RLS policies preventing cross-subdistributor access
