import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface MfaVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

export const MfaVerification = ({ onVerified, onCancel }: MfaVerificationProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const verifyMfaCode = async () => {
    if (!code || code.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (!factors?.totp || factors.totp.length === 0) {
        throw new Error("No MFA factors found");
      }

      const factorId = factors.totp[0].id;

      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) throw verify.error;

      // Store trusted device if remember me is checked
      if (rememberDevice) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          localStorage.setItem('mfa_trusted_device', JSON.stringify({
            userId: user.id,
            expires: expirationDate.toISOString()
          }));
        }
      }

      toast.success("Verification successful!");
      onVerified();
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-red-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
            <CardDescription className="mt-2">
              Enter the verification code from your authenticator app
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Open your authenticator app and enter the 6-digit code to continue
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="mfa_code">Verification Code</Label>
            <Input
              id="mfa_code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length === 6) {
                  verifyMfaCode();
                }
              }}
              maxLength={6}
              autoFocus
              className="bg-background/50 border-border text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember-device" 
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
            />
            <Label 
              htmlFor="remember-device" 
              className="text-sm font-normal cursor-pointer"
            >
              Remember me for 30 days
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={verifyMfaCode}
              disabled={loading || code.length !== 6}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
            <Button
              onClick={onCancel}
              disabled={loading}
              variant="outline"
              className="border-border"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
