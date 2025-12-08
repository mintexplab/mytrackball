import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export const useSavedPaymentMethod = () => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethod = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "stripe-billing-details"
      );

      if (invokeError) throw invokeError;

      if (data?.paymentMethods && data.paymentMethods.length > 0) {
        // Use the first payment method (default)
        setPaymentMethod(data.paymentMethods[0]);
      } else {
        setPaymentMethod(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch payment method:", err);
      setError(err.message || "Failed to fetch payment method");
      setPaymentMethod(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethod();
  }, [fetchPaymentMethod]);

  return {
    paymentMethod,
    loading,
    error,
    refetch: fetchPaymentMethod,
    hasPaymentMethod: !!paymentMethod,
  };
};
