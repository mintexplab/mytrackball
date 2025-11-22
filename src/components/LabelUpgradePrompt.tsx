import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Mail, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function LabelUpgradePrompt() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-red-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
      </div>
      <Card className="max-w-2xl w-full backdrop-blur-sm bg-black border-primary/20 relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Label Account Activation Required
          </CardTitle>
          <CardDescription className="text-base">
            Your account is registered as a Label, which requires an active Signature or Prestige subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Choose Your Plan:</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-foreground">Trackball Signature</p>
                  <p className="text-sm text-muted-foreground">$29.99 CAD/year - 100% royalty splits, priority support, and advanced features</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-foreground">Trackball Prestige</p>
                  <p className="text-sm text-muted-foreground">$51.29 CAD/year - Everything in Signature plus publishing administration</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-foreground">Trackball Partner</p>
                  <p className="text-sm text-muted-foreground">Custom deal - Contact Trackball for enterprise and partner arrangements</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              className="w-full bg-gradient-primary hover:opacity-90 text-lg py-6"
              onClick={() => navigate("/subscription")}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              View Subscription Plans
            </Button>
            
            <Button 
              variant="outline"
              className="w-full border-primary/30 hover:bg-primary/10 text-lg py-6"
              onClick={() => window.location.href = "mailto:contact@trackball.cc?subject=Partner%20Deal%20Inquiry"}
            >
              <Mail className="mr-2 h-5 w-5" />
              Contact for Partner Deal
            </Button>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full border-border hover:bg-muted"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already purchased a plan? It may take a few moments to activate. Refresh this page or{" "}
            <a href="mailto:contact@trackball.cc" className="text-primary hover:underline">
              contact support
            </a>
            {" "}if you need assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}