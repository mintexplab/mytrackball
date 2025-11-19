import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music2, Rocket, Shield, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 relative">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Music2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-title font-bold bg-gradient-primary bg-clip-text text-transparent">
              MY TRACKBALL
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 relative">
        <section className="text-center space-y-6 mb-20">
          <h1 className="text-5xl md:text-7xl font-title font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
            DISTRIBUTE YOUR MUSIC
            <br />
            TO THE WORLD
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional music distribution platform for artists, labels, and managers.
            Get your music on all major streaming platforms with ease.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow text-lg px-8"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary/20 hover:bg-primary/10 text-lg px-8"
            >
              Learn More
            </Button>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-6 backdrop-blur-sm bg-card/80 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 shadow-glow">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Fast Distribution</h3>
            <p className="text-muted-foreground">
              Get your music live on Spotify, Apple Music, and 150+ platforms in days, not weeks.
            </p>
          </Card>

          <Card className="p-6 backdrop-blur-sm bg-card/80 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center mb-4 shadow-accent-glow">
              <Shield className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Your Rights Protected</h3>
            <p className="text-muted-foreground">
              Keep 100% of your rights and royalties. We're here to help you succeed, not own your music.
            </p>
          </Card>

          <Card className="p-6 backdrop-blur-sm bg-card/80 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 shadow-glow">
              <Music2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Pro Features</h3>
            <p className="text-muted-foreground">
              Advanced analytics, pre-save campaigns, and dedicated support for serious artists.
            </p>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border backdrop-blur-sm bg-card/50 mt-20 relative">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2024 Trackball Distribution. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
