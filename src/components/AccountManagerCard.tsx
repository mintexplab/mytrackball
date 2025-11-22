import { useEffect, useState } from "react";
import { Clock, Mail, Phone, User } from "lucide-react";
import { toZonedTime, format } from "date-fns-tz";

interface AccountManagerCardProps {
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;
  managerTimezone: string | null;
  userTimezone: string;
}

const AccountManagerCard = ({
  managerName,
  managerEmail,
  managerPhone,
  managerTimezone,
  userTimezone,
}: AccountManagerCardProps) => {
  const [managerTime, setManagerTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      if (managerTimezone) {
        const now = new Date();
        const zonedTime = toZonedTime(now, managerTimezone);
        const formattedTime = format(zonedTime, "h:mm a zzz", { timeZone: managerTimezone });
        setManagerTime(formattedTime);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [managerTimezone]);

  // Only show if at least one contact field is filled
  if (!managerName && !managerEmail && !managerPhone) {
    return null;
  }

  return (
    <div className="space-y-4">
      {managerName && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{managerName}</p>
          </div>
        </div>
      )}

      {managerEmail && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium break-all">{managerEmail}</p>
          </div>
        </div>
      )}

      {managerPhone && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{managerPhone}</p>
          </div>
        </div>
      )}

      {managerTimezone && managerTime && (
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Their Local Time</p>
            <p className="font-medium">{managerTime}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagerCard;
