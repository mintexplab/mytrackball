import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TwoFactorAuth } from "@/components/TwoFactorAuth";
import { Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import trackballLogo from "@/assets/trackball-logo.png";

const SetupTwoFactor = () => {
  const [loading, setLoading] = useState(false);
  const [mfaCompleted, setMfaCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      // Check if user already has MFA enabled
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasMfa = factors?.totp && factors.totp.length > 0;
      
      if (hasMfa) {
        // Update profile and redirect
        await supabase
          .from("profiles")
          .update({ mfa_setup_completed: true })
          .eq("id", user.id);
        
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking MFA status:", error);
    }
  };

  const handleMfaSetupComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ mfa_setup_completed: true })
          .eq("id", user.id);
      }
      
      setMfaCompleted(true);
      toast.success("Security setup complete!");
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error completing MFA setup:", error);
      navigate("/dashboard");
    }
  };

  if (mfaCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md backdrop-blur-sm bg-card border-primary/30 shadow-glow">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">All Set!</h2>
            <p className="text-muted-foreground">
              Your account is now secured with two-factor authentication.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="backdrop-blur-sm bg-card border-primary/30 shadow-glow">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow overflow-hidden">
              <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <CardTitle className="text-3xl bg-gradient-primary bg-clip-text text-transparent font-normal">
                Secure Your Account
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Add an extra layer of security to your Trackball account with two-factor authentication.
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Why 2FA is Important</h4>
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication prevents unauthorized access even if someone knows your password. 
                    You'll use an authenticator app to generate secure codes when logging in.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <TwoFactorAuth 
            onSetupComplete={handleMfaSetupComplete}
            autoStartEnrollment={true}
          />
        </div>
      </div>
    </div>
  );
};

export default SetupTwoFactor;