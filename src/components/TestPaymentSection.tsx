import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const TestPaymentSection = () => {
  const [amount, setAmount] = useState("10.00");
  const [description, setDescription] = useState("Test Payment");
  const [isLoading, setIsLoading] = useState(false);

  const handleTestPayment = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-test-checkout", {
        body: {
          amount: Math.round(amountNum * 100), // Convert to cents
          description,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Checkout session created - opening in new tab");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Test payment error:", error);
      toast.error(error.message || "Failed to create test checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="test-amount">Amount (CAD)</Label>
          <Input
            id="test-amount"
            type="number"
            step="0.01"
            min="0.50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-description">Description</Label>
          <Input
            id="test-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Test Payment"
          />
        </div>
      </div>
      <Button 
        onClick={handleTestPayment} 
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Checkout...
          </>
        ) : (
          `Create Test Checkout ($${parseFloat(amount || "0").toFixed(2)} CAD)`
        )}
      </Button>
    </div>
  );
};
