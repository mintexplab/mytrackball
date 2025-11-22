import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LabelUpgradePrompt() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full border-border bg-card">
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

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              className="flex-1 bg-gradient-primary hover:opacity-90"
              onClick={() => navigate("/subscription-management")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              View Subscription Plans
            </Button>
            
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = "mailto:distribution@xz1recordings.ca?subject=Partner Deal Inquiry"}
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact for Partner Deal
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already purchased a plan? It may take a few moments to activate. Refresh this page or{" "}
            <a href="mailto:distribution@xz1recordings.ca" className="text-primary hover:underline">
              contact support
            </a>
            {" "}if you need assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}