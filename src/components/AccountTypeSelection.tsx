import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AccountTypeSelectionProps {
  onComplete: () => void;
}

export default function AccountTypeSelection({ onComplete }: AccountTypeSelectionProps) {
  const [selecting, setSelecting] = useState(false);
  const [selectedType, setSelectedType] = useState<'artist' | 'label' | null>(null);

  const handleSelectType = async (type: 'artist' | 'label') => {
    try {
      setSelecting(true);
      setSelectedType(type);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Update profile with account type
      const { error } = await supabase
        .from("profiles")
        .update({ account_type: type })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`Account registered as ${type === 'artist' ? 'Artist' : 'Label'}`);
      
      // Small delay before completing to show success message
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error: any) {
      console.error("Error selecting account type:", error);
      toast.error(error.message || "Failed to set account type");
    } finally {
      setSelecting(false);
      setSelectedType(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to Trackball</h1>
          <p className="text-muted-foreground text-lg">Choose your account type to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Artist Account */}
          <Card 
            className="border-border bg-card hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => !selecting && handleSelectType('artist')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                <Music className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-foreground">Artist Account</CardTitle>
              <CardDescription className="text-base">
                Perfect for independent artists and musicians
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Distribute your music to all major platforms</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Track royalties and earnings</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Access to Free tier features</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Upgrade anytime for more features</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={selecting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectType('artist');
                }}
              >
                {selecting && selectedType === 'artist' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue as Artist"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Label Account */}
          <Card 
            className="border-border bg-card hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => !selecting && handleSelectType('label')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-foreground">Label Account</CardTitle>
              <CardDescription className="text-base">
                For record labels and music companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Manage multiple artists and releases</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Advanced catalog management tools</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Requires Signature or Prestige plan</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Partner deals available - contact support</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={selecting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectType('label');
                }}
              >
                {selecting && selectedType === 'label' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue as Label"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}