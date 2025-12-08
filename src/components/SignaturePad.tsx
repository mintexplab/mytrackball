import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (signatureDataUrl: string | null) => void;
  disabled?: boolean;
}

export const SignaturePad = ({ onSignatureChange, disabled = false }: SignaturePadProps) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 150 });

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.offsetWidth - 4, 500);
        setCanvasSize({ width, height: 150 });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleEnd = () => {
    if (sigCanvas.current) {
      const isCanvasEmpty = sigCanvas.current.isEmpty();
      setIsEmpty(isCanvasEmpty);
      if (!isCanvasEmpty) {
        // Use getCanvas() instead of getTrimmedCanvas() to avoid trim-canvas error
        const canvas = sigCanvas.current.getCanvas();
        const dataUrl = canvas.toDataURL("image/png");
        onSignatureChange(dataUrl);
      } else {
        onSignatureChange(null);
      }
    }
  };

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      onSignatureChange(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Your Signature
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="text-muted-foreground hover:text-foreground"
        >
          <Eraser className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>
      
      <div 
        ref={containerRef}
        className={`relative border-2 rounded-lg bg-card ${
          disabled 
            ? "border-muted opacity-50 cursor-not-allowed" 
            : "border-primary/50 hover:border-primary"
        } transition-colors`}
      >
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            width: canvasSize.width,
            height: canvasSize.height,
            className: `signature-canvas ${disabled ? "pointer-events-none" : "cursor-crosshair"}`,
            style: {
              borderRadius: "6px",
              width: "100%",
              height: "150px",
            }
          }}
          penColor="#ffffff"
          backgroundColor="transparent"
          onEnd={handleEnd}
        />
        
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground/50 text-sm">
              Sign here with your mouse or touch
            </p>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        By signing above, you are providing a legally binding electronic signature.
      </p>
    </div>
  );
};
