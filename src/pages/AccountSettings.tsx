import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, Lock, Upload, X, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TwoFactorAuth } from "@/components/TwoFactorAuth";
import { useS3Upload } from "@/hooks/useS3Upload";
const TIMEZONES = [{
  value: "America/New_York",
  label: "Eastern Time (ET)"
}, {
  value: "America/Chicago",
  label: "Central Time (CT)"
}, {
  value: "America/Denver",
  label: "Mountain Time (MT)"
}, {
  value: "America/Los_Angeles",
  label: "Pacific Time (PT)"
}, {
  value: "America/Toronto",
  label: "Toronto"
}, {
  value: "America/Vancouver",
  label: "Vancouver"
}, {
  value: "Europe/London",
  label: "London"
}, {
  value: "Europe/Paris",
  label: "Paris"
}, {
  value: "Asia/Tokyo",
  label: "Tokyo"
}, {
  value: "Australia/Sydney",
  label: "Sydney"
}];
const AccountSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<any>(null);
  const { uploadFile, deleteFile, uploading } = useS3Upload();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
    display_name: "",
    label_name: "",
    user_timezone: "America/New_York",
    current_password: "",
    new_password: ""
  });
  useEffect(() => {
    fetchProfile();
  }, []);
  const fetchProfile = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const {
      data: profileData
    } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const {
      data: planData
    } = await supabase.from("user_plans").select(`
        *,
        plan:plans(*)
      `).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (profileData) {
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || "",
        email: profileData.email,
        avatar_url: profileData.avatar_url || "",
        display_name: profileData.display_name || "",
        label_name: profileData.label_name || "",
        user_timezone: profileData.user_timezone || "America/New_York",
        current_password: "",
        new_password: ""
      });
    }
    setUserPlan(planData);
  };
  const updateProfile = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if label_name update is allowed
      const canEditLabel = userPlan?.plan?.name === "Trackball Signature" || userPlan?.plan?.name === "Trackball Prestige";
      const updateData: any = {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url,
        display_name: formData.display_name,
        user_timezone: formData.user_timezone
      };

      // Handle label creation/update if allowed
      if (canEditLabel && formData.label_name) {
        // Check if label already exists
        const {
          data: existingLabel
        } = await supabase.from("labels").select("id").eq("user_id", user.id).maybeSingle();
        if (existingLabel) {
          // Update existing label
          await supabase.from("labels").update({
            name: formData.label_name
          }).eq("id", existingLabel.id);
          updateData.label_id = existingLabel.id;
        } else {
          // Create new label
          const {
            data: newLabel,
            error: labelError
          } = await supabase.from("labels").insert({
            name: formData.label_name,
            user_id: user.id
          }).select().single();
          if (labelError) throw labelError;
          updateData.label_id = newLabel.id;
        }
      }
      const {
        error
      } = await supabase.from("profiles").update(updateData).eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  const updateEmail = async () => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        email: formData.email
      });
      if (error) throw error;
      toast.success("Email update initiated - check your inbox");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  const updatePassword = async () => {
    if (!formData.new_password) {
      toast.error("Please enter a new password");
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: formData.new_password
      });
      if (error) throw error;
      toast.success("Password updated successfully");
      setFormData({
        ...formData,
        current_password: "",
        new_password: ""
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  const uploadProfilePicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPG, PNG, or WEBP)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5242880) {
        toast.error('File size must be less than 5MB');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const s3Path = `profile-pictures/${user.id}/avatar.${fileExt}`;
      
      // Extract old path from URL if exists
      const oldPath = formData.avatar_url ? extractS3PathFromUrl(formData.avatar_url) : undefined;

      // Upload to S3
      const publicUrl = await uploadFile({ file, path: s3Path, oldPath });
      
      if (!publicUrl) {
        throw new Error('Upload failed');
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase.from('profiles').update({
        avatar_url: publicUrl
      }).eq('id', user.id);
      
      if (updateError) throw updateError;

      setFormData({
        ...formData,
        avatar_url: publicUrl
      });

      // Refresh profile to update UI
      await fetchProfile();
      
      toast.success('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    }
  };
  const removeProfilePicture = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      if (formData.avatar_url) {
        const s3Path = extractS3PathFromUrl(formData.avatar_url);
        await deleteFile(s3Path);
      }

      const { error } = await supabase.from('profiles').update({
        avatar_url: null
      }).eq('id', user.id);
      
      if (error) throw error;

      setFormData({
        ...formData,
        avatar_url: ""
      });

      // Refresh profile to update UI
      await fetchProfile();
      
      toast.success('Profile picture removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove profile picture');
    }
  };

  const extractS3PathFromUrl = (url: string): string => {
    // Extract path from S3 URL: https://bucket.s3.region.amazonaws.com/path/to/file
    const urlParts = url.split('.amazonaws.com/');
    return urlParts[1] || url;
  };
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="hover:bg-muted">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and security</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your public profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                    {formData.full_name?.substring(0, 2).toUpperCase() || formData.email?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={uploading} className="border-primary/20">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Picture"}
                    </Button>
                    {formData.avatar_url && <Button type="button" variant="outline" onClick={removeProfilePicture} disabled={uploading} className="border-destructive/20 text-destructive hover:text-destructive">
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>}
                  </div>
                  <input id="avatar-upload" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={uploadProfilePicture} className="hidden" />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, or WEBP. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" placeholder="John Doe" value={formData.full_name} onChange={e => setFormData({
              ...formData,
              full_name: e.target.value
            })} className="bg-background/50 border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input id="display_name" placeholder="Artist Name" value={formData.display_name} onChange={e => setFormData({
              ...formData,
              display_name: e.target.value
            })} className="bg-background/50 border-border" />
              <p className="text-xs text-muted-foreground">This will be shown in the top bar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label_name">Label Name</Label>
              <Input id="label_name" placeholder="Your Label" value={formData.label_name} onChange={e => setFormData({
              ...formData,
              label_name: e.target.value
            })} className="bg-background/50 border-border" disabled={!(userPlan?.plan?.name === "Trackball Signature" || userPlan?.plan?.name === "Trackball Prestige")} />
              <p className="text-xs text-muted-foreground">
                {userPlan?.plan?.name === "Trackball Signature" || userPlan?.plan?.name === "Trackball Prestige" ? "Available for Signature and Prestige members" : "Only available for Signature and Prestige members"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_timezone" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Your Timezone
              </Label>
              <Select value={formData.user_timezone} onValueChange={value => setFormData({
              ...formData,
              user_timezone: value
            })}>
                <SelectTrigger id="user_timezone" className="bg-background/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used to show your account manager's local time
              </p>
            </div>

            <Button onClick={updateProfile} disabled={loading} className="bg-gradient-primary hover:opacity-90 transition-opacity">
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Address
            </CardTitle>
            <CardDescription>Change your account email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData({
              ...formData,
              email: e.target.value
            })} className="bg-background/50 border-border" />
            </div>

            <Button onClick={updateEmail} disabled={loading} variant="outline" className="border-primary/20">
              Update Email
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Password
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" placeholder="Enter new password" value={formData.new_password} onChange={e => setFormData({
              ...formData,
              new_password: e.target.value
            })} className="bg-background/50 border-border" />
            </div>

            <Button onClick={updatePassword} disabled={loading} variant="outline" className="border-primary/20">
              Update Password
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Force disable MFA if you're locked out (Admin only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you have MFA enabled but can't access your authentication app, use this button to force-disable MFA using admin privileges.
            </p>
            <Button 
              onClick={async () => {
                if (!window.confirm("Force disable MFA for your account? This will remove all authentication factors.")) {
                  return;
                }
                
                setLoading(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error("Not authenticated");

                  const response = await supabase.functions.invoke('disable-mfa-admin', {
                    headers: {
                      Authorization: `Bearer ${session.access_token}`
                    }
                  });

                  if (response.error) throw response.error;

                  toast.success("MFA disabled successfully! You can now change your email or password.");
                  await fetchProfile();
                } catch (error: any) {
                  console.error('Error disabling MFA:', error);
                  toast.error(error.message || "Failed to disable MFA");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              Force Disable MFA (Admin)
            </Button>
          </CardContent>
        </Card>

        <TwoFactorAuth />

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Permanently delete your account and all associated data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. All your releases, royalty data, and account information will be permanently removed.
            </p>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (window.confirm("Are you absolutely sure? This action cannot be undone. Type 'DELETE' to confirm.")) {
                  const confirmation = window.prompt("Type 'DELETE' to confirm account deletion:");
                  if (confirmation === "DELETE") {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      const { data: { session } } = await supabase.auth.getSession();
                      
                      if (!user || !session) throw new Error("Not authenticated");
                      
                      // Call edge function to delete user completely
                      const { data, error } = await supabase.functions.invoke('delete-user', {
                        body: { userId: user.id },
                        headers: {
                          Authorization: `Bearer ${session.access_token}`
                        }
                      });

                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      
                      // Sign out and redirect
                      await supabase.auth.signOut();
                      toast.success("Account deleted successfully");
                      navigate("/auth");
                    } catch (error: any) {
                      toast.error(error.message || "Failed to delete account");
                    }
                  }
                }
              }}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your distribution plan details</CardDescription>
          </CardHeader>
          <CardContent>
            {userPlan ? <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg">{userPlan.plan.name}</p>
                    <p className="text-sm text-muted-foreground">{userPlan.plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">${userPlan.plan.price}</p>
                    <p className="text-sm text-muted-foreground">per year  </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-2">Plan Features:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {userPlan.plan.features?.map((feature: string, index: number) => <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>)}
                  </ul>
                </div>
              </div> : <p className="text-muted-foreground">No active plan</p>}
          </CardContent>
        </Card>
      </main>
    </div>;
};
export default AccountSettings;