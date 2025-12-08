import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Music, FileX, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

interface ChartDataPoint {
  date: string;
  revenue: number;
  releases: number;
  takedowns: number;
  subscriptions: number;
}

interface RevenueData {
  totalRevenue: number;
  releaseRevenue: number;
  upcRevenue: number;
  takedownRevenue: number;
  subscriptionRevenue: number;
  recentPayments: {
    id: string;
    amount: number;
    description: string;
    date: string;
    type: string;
  }[];
  chartData: ChartDataPoint[];
}

export const RevenueOverview = () => {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueData>({
    totalRevenue: 0,
    releaseRevenue: 0,
    upcRevenue: 0,
    takedownRevenue: 0,
    subscriptionRevenue: 0,
    recentPayments: [],
    chartData: [],
  });

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("stripe-revenue-overview", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      if (data) {
        setRevenue(data);
      }
    } catch (error: any) {
      console.error("Error fetching revenue:", error);
      toast.error("Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "release":
        return <Music className="w-4 h-4 text-primary" />;
      case "upc":
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case "takedown":
        return <FileX className="w-4 h-4 text-orange-500" />;
      case "subscription":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{format(new Date(label), "MMM d, yyyy")}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }} 
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Overview</h2>
          <p className="text-muted-foreground">Combined revenue from all sources</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRevenue}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Total Revenue Card */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue (30 days)</p>
              <p className="text-4xl font-bold text-primary">{formatCurrency(revenue.totalRevenue)}</p>
            </div>
            <div className="p-4 bg-primary/20 rounded-full">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      {revenue.chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Daily revenue breakdown over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.chartData}>
                  <defs>
                    <linearGradient id="colorReleases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTakedowns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSubscriptions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                    className="text-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                    className="text-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="releases" 
                    name="Releases"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorReleases)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="takedowns" 
                    name="Takedowns"
                    stroke="#f97316" 
                    fillOpacity={1} 
                    fill="url(#colorTakedowns)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="subscriptions" 
                    name="Subscriptions"
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorSubscriptions)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Release Fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(revenue.releaseRevenue)}</p>
            <p className="text-xs text-muted-foreground">$5 CAD per track</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              UPC Fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(revenue.upcRevenue)}</p>
            <p className="text-xs text-muted-foreground">$8 CAD per release</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileX className="w-4 h-4" />
              Takedown Fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(revenue.takedownRevenue)}</p>
            <p className="text-xs text-muted-foreground">$19.85 CAD per takedown</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(revenue.subscriptionRevenue)}</p>
            <p className="text-xs text-muted-foreground">Track allowance plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest successful transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {revenue.recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent payments found</p>
          ) : (
            <div className="space-y-3">
              {revenue.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(payment.type)}
                    <div>
                      <p className="font-medium text-sm">{payment.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(payment.date)}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-green-500">+{formatCurrency(payment.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
