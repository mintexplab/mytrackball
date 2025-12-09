import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { TrackballBeads } from "@/components/TrackballBeads";

import trackballLogo from "@/assets/trackball-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Auth submit", { isLogin, email });
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        console.log("signInWithPassword result", { data, error });
        if (error) throw error;

        // Check if user is locked
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_banned, is_locked, full_name, user_id")
            .eq("id", data.user.id)
            .single();
          console.log("Profile after login", profile);
          
          if (profile?.is_locked) {
            await supabase.auth.signOut();
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
        
        setIsZooming(true);
        setLoading(false);
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const fadeOverlay = document.createElement('div');
        fadeOverlay.className = 'fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-4';
        fadeOverlay.style.opacity = '0';
        fadeOverlay.style.transition = 'opacity 1s ease-in-out';
        fadeOverlay.innerHTML = `
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p class="text-muted-foreground animate-pulse">Loading your dashboard...</p>
        `;
        document.body.appendChild(fadeOverlay);
        
        setTimeout(() => {
          fadeOverlay.style.opacity = '1';
        }, 50);
        
        const loadingDuration = 5000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, loadingDuration));
        
        fadeOverlay.remove();
        navigate("/dashboard");
        return;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            },
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        console.log("signUp result", { data, error });
        if (error) throw error;
        
        // Auto-login after successful signup
        if (data.user && data.session) {
          toast.success("Account created! Logging you in...");
          
          setIsZooming(true);
          setLoading(false);
          await new Promise(resolve => setTimeout(resolve, 1200));
          
          const fadeOverlay = document.createElement('div');
          fadeOverlay.className = 'fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-4';
          fadeOverlay.style.opacity = '0';
          fadeOverlay.style.transition = 'opacity 1s ease-in-out';
          fadeOverlay.innerHTML = `
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p class="text-muted-foreground animate-pulse">Setting up your account...</p>
          `;
          document.body.appendChild(fadeOverlay);
          
          setTimeout(() => {
            fadeOverlay.style.opacity = '1';
          }, 50);
          
          const loadingDuration = 3000 + Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, loadingDuration));
          
          fadeOverlay.remove();
          navigate("/dashboard");
          return;
        } else {
          // Email confirmation required
          toast.success("Account created! Please check your email to confirm, then sign in.");
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      console.error("Auth error", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <TrackballBeads />
      </div>
      
      <Card 
        className={`w-full max-w-md relative backdrop-blur-sm bg-black border-primary/30 ${isZooming ? 'scale-[3] opacity-0' : 'scale-100 opacity-100'}`}
        style={{
          transition: isZooming ? 'all 1.2s ease-in-out' : 'all 0.3s ease-in-out',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.3), 0 0 80px rgba(239, 68, 68, 0.15)'
        }}
      >
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow overflow-hidden">
            <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-3xl font-normal font-sans text-center text-foreground">Trackball Distribution</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {isLogin ? "Sign in to My Trackball" : "Create your account"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
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
                onChange={e => setEmail(e.target.value)}
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
                onChange={e => setPassword(e.target.value)}
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
            
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 transition-all duration-300 hover:scale-105"
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
