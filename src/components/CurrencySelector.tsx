import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CURRENCIES = [
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
];

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const CurrencySelector = ({ value, onChange, label }: CurrencySelectorProps) => {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-background/50 border-border">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <span className="flex items-center gap-2">
                <span className="w-6 text-center font-mono">{currency.symbol}</span>
                <span>{currency.code}</span>
                <span className="text-muted-foreground">- {currency.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Exchange rate cache (in production, this should be fetched from an API)
const EXCHANGE_RATES: Record<string, number> = {
  CAD: 1,
  USD: 0.74,
  EUR: 0.68,
  GBP: 0.58,
  AUD: 1.12,
  JPY: 110.5,
  INR: 61.5,
  BRL: 3.65,
  MXN: 12.8,
  KRW: 978,
};

export const convertCurrency = (amountCAD: number, toCurrency: string): number => {
  const rate = EXCHANGE_RATES[toCurrency] || 1;
  return amountCAD * rate;
};

export const formatCurrency = (amount: number, currency: string): string => {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const symbol = currencyInfo?.symbol || "$";
  
  // Handle different decimal formats
  if (currency === "JPY" || currency === "KRW") {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${symbol}${amount.toFixed(2)}`;
};

export const getCurrencySymbol = (currency: string): string => {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  return currencyInfo?.symbol || "$";
};
