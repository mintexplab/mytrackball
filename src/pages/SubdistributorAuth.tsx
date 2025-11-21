import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Music2 } from "lucide-react";

const SubdistributorAuth = () => {
  const { slug } = useParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [subdistributor, setSubdistributor] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSubdistributor();
  }, [slug]);

  const loadSubdistributor = async () => {
    if (!slug) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("subdistributors")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      toast.error("Subdistributor not found");
      navigate("/auth");
      return;
    }

    setSubdistributor(data);

    // Apply branding
    document.documentElement.style.setProperty(
      "--primary",
      hexToHSL(data.primary_color)
    );
    document.documentElement.style.setProperty(
      "--background",
      hexToHSL(data.background_color)
    );
  };

  const hexToHSL = (hex: string): string => {
    hex = hex.replace(/^#/, "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Verify user belongs to this subdistributor
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subdistributor_id, is_banned, is_locked")
          .eq("id", data.user.id)
          .single();

        if (profile?.subdistributor_id !== subdistributor.id) {
          await supabase.auth.signOut();
          toast.error("This account does not belong to this subdistributor");
          setLoading(false);
          return;
        }

        if (profile?.is_banned) {
          await supabase.auth.signOut();
          toast.error("Your account has been suspended. Please contact support.");
          setLoading(false);
          return;
        }

        if (profile?.is_locked) {
          await supabase.auth.signOut();
          toast.error("Your account is locked. Please contact support.");
          setLoading(false);
          return;
        }
      }

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!subdistributor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 opacity-30 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: subdistributor.primary_color, animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 opacity-20 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: subdistributor.primary_color, animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 opacity-25 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: subdistributor.primary_color, animationDuration: '6s', animationDelay: '2s' }} />
      </div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader className="space-y-4 text-center">
          {subdistributor.logo_url ? (
            <div className="mx-auto h-16 flex items-center justify-center">
              <img src={subdistributor.logo_url} alt={subdistributor.name} className="max-h-16" />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
              <Music2 className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <div>
            <CardTitle className="text-3xl font-bold" style={{ color: subdistributor.primary_color }}>
              {subdistributor.name}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sign in to your account
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full"
              style={{ backgroundColor: subdistributor.primary_color }}
              disabled={loading}
            >
              {loading ? "Loading..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Invitation only. Contact your administrator to get access.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubdistributorAuth;
