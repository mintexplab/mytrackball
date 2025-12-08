import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, ExternalLink, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  status: string;
  created: number;
  description: string;
}

interface Invoice {
  id: string;
  number: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url: string;
  invoice_pdf: string;
}

const formatCurrency = (amount: number, currency: string = "cad") => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "succeeded":
    case "paid":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "pending":
    case "processing":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "failed":
    case "canceled":
      return "bg-destructive/20 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const PaymentHistory = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-details");
      if (error) throw error;
      
      setPayments(data?.recentPayments || []);
      setInvoices(data?.invoices || []);
    } catch (err) {
      console.error("Failed to fetch payment history:", err);
    } finally {
      setLoading(false);
    }
  };

  const allTransactions = [
    ...payments.map((p) => ({
      id: p.id,
      type: "payment" as const,
      amount: p.amount,
      status: p.status,
      created: p.created,
      description: p.description,
      currency: "cad",
    })),
    ...invoices.map((i) => ({
      id: i.id,
      type: "invoice" as const,
      amount: i.amount_paid,
      status: i.status,
      created: i.created,
      description: `Invoice ${i.number || i.id.slice(-8)}`,
      currency: i.currency,
      invoiceUrl: i.hosted_invoice_url,
      pdfUrl: i.invoice_pdf,
    })),
  ].sort((a, b) => b.created - a.created);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          Payment History
        </CardTitle>
        <CardDescription>
          View your past payments for releases and takedowns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">No payment history yet</p>
            <p className="text-sm text-muted-foreground">
              Your payments for releases and takedowns will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allTransactions.slice(0, 10).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created * 1000), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status === "succeeded" ? "Paid" : transaction.status}
                  </Badge>
                  
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>

                  {transaction.type === "invoice" && transaction.invoiceUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(transaction.invoiceUrl, "_blank")}
                      className="text-primary hover:text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}

                  {transaction.type === "invoice" && transaction.pdfUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(transaction.pdfUrl, "_blank")}
                      className="text-primary hover:text-primary"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {allTransactions.length > 10 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                Showing most recent 10 transactions
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
