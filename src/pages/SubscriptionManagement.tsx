import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

const plans = [
  {
    name: "Trackball Free",
    price: "$0 CAD/year",
    link: null,
  },
  {
    name: "Trackball Lite",
    price: "$14.99 CAD/year",
    link: "https://buy.stripe.com/dRm5kE3SC7NleWeb0pa7C0g",
  },
  {
    name: "Trackball Signature",
    price: "$29.99 CAD/year",
    link: "https://buy.stripe.com/5kQaEYdtc1oXeWegkJa7C0h",
  },
  {
    name: "Trackball Prestige",
    price: "$51.29 CAD/year",
    link: "https://buy.stripe.com/fZu7sMbl4ffN3dw0lLa7C0l",
  },
];

const SubscriptionManagement = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-primary opacity-5 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              MANAGE SUBSCRIPTION
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.name} className="backdrop-blur-sm bg-card/80 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-foreground mt-2">
                  {plan.price}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plan.link ? (
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90"
                    onClick={() => window.open(plan.link, "_blank")}
                  >
                    Subscribe
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled
                  >
                    Current Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SubscriptionManagement;
