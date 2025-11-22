import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Smartphone, CheckCircle2, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface TwoFactorAuthProps {
  onSetupComplete?: () => void;
  autoStartEnrollment?: boolean;
}

export const TwoFactorAuth = ({ onSetupComplete, autoStartEnrollment = false }: TwoFactorAuthProps = {}) => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState("");

  useEffect(() => {
    checkMfaStatus();
    if (autoStartEnrollment && !mfaEnabled) {
      startEnrollment();
    }
  }, [autoStartEnrollment]);

  const checkMfaStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasMfa = factors?.totp && factors.totp.length > 0;
      setMfaEnabled(hasMfa);
    } catch (error) {
      console.error("Error checking MFA status:", error);
    }
  };

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "My Trackball Authenticator",
      });

      if (error) throw error;

      if (data) {
        setFactorId(data.id);
        setSecret(data.totp.secret);
        
        // Generate QR code
        const qrCodeUrl = data.totp.qr_code;
        setQrCode(qrCodeUrl);
        setEnrolling(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start 2FA enrollment");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verificationCode,
      });

      if (verify.error) throw verify.error;

      toast.success("Two-factor authentication enabled successfully!");
      setMfaEnabled(true);
      setEnrolling(false);
      setQrCode("");
      setSecret("");
      setVerificationCode("");
      
      // Call optional callback for setup completion
      if (onSetupComplete) {
        onSetupComplete();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (factors?.totp && factors.totp.length > 0) {
        const factor = factors.totp[0];
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        
        if (error) throw error;

        toast.success("Two-factor authentication disabled");
        setMfaEnabled(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret key copied to clipboard");
  };

  if (mfaEnabled && !enrolling) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Enhanced security with authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              Two-factor authentication is currently <strong>enabled</strong>. Your account is protected.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              When signing in, you'll be required to enter a verification code from your authenticator app.
            </p>
          </div>

          <Button
            onClick={disableMfa}
            disabled={loading}
            variant="outline"
            className="border-destructive/20 text-destructive hover:text-destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Disable 2FA
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (enrolling) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Set Up Two-Factor Authentication
          </CardTitle>
          <CardDescription>Scan the QR code with your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to scan the QR code below.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center space-y-4">
            {qrCode && (
              <img 
                src={qrCode} 
                alt="QR Code for 2FA setup"
                className="w-64 h-64 border-2 border-border rounded-lg"
              />
            )}

            <div className="w-full space-y-2">
              <Label className="text-sm text-muted-foreground">
                Can't scan? Enter this code manually:
              </Label>
              <div className="flex gap-2">
                <Input
                  value={secret}
                  readOnly
                  className="bg-muted/50 border-border font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification_code">Enter Verification Code</Label>
            <Input
              id="verification_code"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="bg-background/50 border-border text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={verifyAndEnable}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verify & Enable
            </Button>
            <Button
              onClick={() => {
                setEnrolling(false);
                setQrCode("");
                setSecret("");
                setVerificationCode("");
              }}
              disabled={loading}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an extra layer of security to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Two-factor authentication (2FA) adds an extra layer of security by requiring both your password and a verification code from your phone.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You'll need an authenticator app like:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Google Authenticator</li>
            <li>Microsoft Authenticator</li>
            <li>Authy</li>
            <li>1Password</li>
          </ul>
        </div>

        <Button
          onClick={startEnrollment}
          disabled={loading}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Shield className="w-4 h-4 mr-2" />
          Enable Two-Factor Authentication
        </Button>
      </CardContent>
    </Card>
  );
};
