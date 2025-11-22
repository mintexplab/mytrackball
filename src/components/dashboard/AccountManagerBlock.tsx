import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AccountManagerCard from "@/components/AccountManagerCard";

interface AccountManagerBlockProps {
  profile: any;
}

export const AccountManagerBlock = ({ profile }: AccountManagerBlockProps) => {
  return (
    <Collapsible defaultOpen>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-base sm:text-xl font-bold text-left">Account Manager</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-left">Your dedicated support contact</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <AccountManagerCard
              managerName={profile?.account_manager_name}
              managerEmail={profile?.account_manager_email}
              managerPhone={profile?.account_manager_phone}
              managerTimezone={profile?.account_manager_timezone}
              userTimezone={profile?.user_timezone || "America/New_York"}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
