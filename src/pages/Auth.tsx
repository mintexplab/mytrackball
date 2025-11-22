import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MfaVerification } from "@/components/MfaVerification";
import trackballLogo from "@/assets/trackball-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Auth submit", { isLogin, email });
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        console.log("signInWithPassword result", { data, error });
        if (error) throw error;

        // Check if MFA is required
        const { data: { currentLevel, nextLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
          // User has MFA enabled, show verification screen
          setShowMfaVerification(true);
          setLoading(false);
          return;
        }

        // Check if user is banned or locked
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_banned, is_locked, full_name, user_id")
            .eq("id", data.user.id)
            .single();

          console.log("Profile after login", profile);

          if (profile?.is_banned) {
            await supabase.auth.signOut();
            toast.error("Your account has been suspended. Please contact support.");
            setLoading(false);
            return;
          }

          if (profile?.is_locked) {
            await supabase.auth.signOut();
            // Show locked account modal
            const lockedModal = document.createElement('div');
            lockedModal.innerHTML = `
              <div class="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
                <div class="absolute inset-0">
                  <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/30 rounded-full blur-3xl animate-pulse" style="animation-duration: 4s;"></div>
                  <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/20 rounded-full blur-3xl animate-pulse" style="animation-duration: 5s; animation-delay: 1s;"></div>
                  <div class="absolute top-1/2 right-1/3 w-64 h-64 bg-red-400/25 rounded-full blur-3xl animate-pulse" style="animation-duration: 6s; animation-delay: 2s;"></div>
                </div>
                <div class="relative backdrop-blur-sm bg-card border border-primary/20 rounded-lg p-8 max-w-md w-full shadow-glow">
                  <div class="text-center space-y-6">
                    <div class="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                    </div>
                    <div>
                      <h2 class="text-2xl font-bold mb-2">Account Temporarily Locked</h2>
                      <p class="text-muted-foreground mb-6">Your account has been temporarily locked. Please contact support for assistance.</p>
                    </div>
                    <div class="bg-muted/30 rounded-lg p-4 text-left space-y-2">
                      <p class="text-sm"><span class="font-medium">Name:</span> ${profile.full_name || 'Not set'}</p>
                      <p class="text-sm"><span class="font-medium">Email:</span> ${email}</p>
                      <p class="text-sm"><span class="font-medium">User ID:</span> ${profile.user_id}</p>
                    </div>
                    <a 
                      href="mailto:contact@trackball.cc?subject=Account%20Locked%20-%20${profile.user_id}"
                      class="inline-block w-full px-6 py-3 bg-gradient-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(lockedModal);
            setLoading(false);
            return;
          }
        }

        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        console.log("signUp result", { error });
        if (error) throw error;
        toast.success("Account created! Redirecting...");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Auth error", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showMfaVerification) {
    return (
      <MfaVerification
        onVerified={() => {
          setShowMfaVerification(false);
          navigate("/dashboard");
        }}
        onCancel={async () => {
          await supabase.auth.signOut();
          setShowMfaVerification(false);
          setLoading(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-red-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow p-2">
            <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              MY TRACKBALL
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {isLogin ? "Sign in to your account" : "Create your artist account"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="bg-background/50 border-border focus:border-primary transition-colors"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="artist@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-border focus:border-primary transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-background/50 border-border focus:border-primary transition-colors"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                  },
                });
                if (error) toast.error(error.message);
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
            
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
