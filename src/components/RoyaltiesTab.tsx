import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Royalty {
  id: string;
  amount: number;
  period: string;
  notes: string;
  created_at: string;
}

interface RoyaltiesTabProps {
  userId: string;
}

const RoyaltiesTab = ({ userId }: RoyaltiesTabProps) => {
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchRoyalties();
  }, [userId]);

  const fetchRoyalties = async () => {
    const { data, error } = await supabase
      .from("royalties")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load royalties");
      return;
    }

    setRoyalties(data || []);
    const total = data?.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0) || 0;
    setTotalEarnings(total);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-gradient-primary/10 border-primary/30">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            Total Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-primary">
            ${totalEarnings.toFixed(2)} <span className="text-xl text-muted-foreground">CAD</span>
          </p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Payment History</CardTitle>
          <CardDescription>Your royalty payment records</CardDescription>
        </CardHeader>
        <CardContent>
          {royalties.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No royalty payments yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your earnings will appear here once royalties are processed
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {royalties.map((royalty) => (
                <Card key={royalty.id} className="bg-muted/30 border-border">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg text-foreground">
                          ${parseFloat(royalty.amount.toString()).toFixed(2)} CAD
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Period: {royalty.period}
                        </p>
                        {royalty.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {royalty.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(royalty.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoyaltiesTab;
