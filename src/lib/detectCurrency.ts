// Timezone to currency mapping
const TIMEZONE_CURRENCY_MAP: Record<string, string> = {
  // Canada
  'America/Toronto': 'CAD',
  'America/Vancouver': 'CAD',
  'America/Edmonton': 'CAD',
  'America/Winnipeg': 'CAD',
  'America/Halifax': 'CAD',
  'America/St_Johns': 'CAD',
  'America/Regina': 'CAD',
  'America/Montreal': 'CAD',
  
  // USA
  'America/New_York': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Los_Angeles': 'USD',
  'America/Phoenix': 'USD',
  'America/Anchorage': 'USD',
  'Pacific/Honolulu': 'USD',
  
  // UK
  'Europe/London': 'GBP',
  
  // Europe (EUR)
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Madrid': 'EUR',
  'Europe/Amsterdam': 'EUR',
  'Europe/Brussels': 'EUR',
  'Europe/Vienna': 'EUR',
  'Europe/Dublin': 'EUR',
  'Europe/Lisbon': 'EUR',
  'Europe/Helsinki': 'EUR',
  'Europe/Athens': 'EUR',
  
  // Asia-Pacific
  'Asia/Tokyo': 'JPY',
  'Asia/Seoul': 'KRW',
  'Asia/Kolkata': 'INR',
  'Asia/Calcutta': 'INR',
  'Australia/Sydney': 'AUD',
  'Australia/Melbourne': 'AUD',
  'Australia/Brisbane': 'AUD',
  'Australia/Perth': 'AUD',
  'Australia/Adelaide': 'AUD',
  
  // South America
  'America/Sao_Paulo': 'BRL',
  'America/Rio_Branco': 'BRL',
  'America/Mexico_City': 'MXN',
  'America/Cancun': 'MXN',
  'America/Tijuana': 'MXN',
};

// Locale country code to currency mapping
const LOCALE_CURRENCY_MAP: Record<string, string> = {
  'CA': 'CAD',
  'US': 'USD',
  'GB': 'GBP',
  'UK': 'GBP',
  'AU': 'AUD',
  'JP': 'JPY',
  'KR': 'KRW',
  'IN': 'INR',
  'BR': 'BRL',
  'MX': 'MXN',
  // EU countries
  'DE': 'EUR',
  'FR': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'NL': 'EUR',
  'BE': 'EUR',
  'AT': 'EUR',
  'IE': 'EUR',
  'PT': 'EUR',
  'FI': 'EUR',
  'GR': 'EUR',
};

// Supported currencies in the app
const SUPPORTED_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY', 'INR', 'BRL', 'MXN', 'KRW'];

/**
 * Detects user's preferred currency based on browser timezone and locale.
 * No external API calls - uses only browser-native methods.
 * @returns Detected currency code (defaults to CAD if detection fails)
 */
export function detectUserCurrency(): string {
  try {
    // Method 1: Check timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && TIMEZONE_CURRENCY_MAP[timezone]) {
      const currency = TIMEZONE_CURRENCY_MAP[timezone];
      if (SUPPORTED_CURRENCIES.includes(currency)) {
        return currency;
      }
    }

    // Method 2: Check browser locale for country code
    const locale = navigator.language || (navigator as any).userLanguage || '';
    if (locale.includes('-')) {
      const countryCode = locale.split('-')[1]?.toUpperCase();
      if (countryCode && LOCALE_CURRENCY_MAP[countryCode]) {
        const currency = LOCALE_CURRENCY_MAP[countryCode];
        if (SUPPORTED_CURRENCIES.includes(currency)) {
          return currency;
        }
      }
    }

    // Method 3: Check all navigator languages
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (lang.includes('-')) {
        const countryCode = lang.split('-')[1]?.toUpperCase();
        if (countryCode && LOCALE_CURRENCY_MAP[countryCode]) {
          const currency = LOCALE_CURRENCY_MAP[countryCode];
          if (SUPPORTED_CURRENCIES.includes(currency)) {
            return currency;
          }
        }
      }
    }
  } catch (error) {
    console.warn('Currency detection failed:', error);
  }

  // Default fallback
  return 'CAD';
}

/**
 * Returns whether the currency was auto-detected or is the default
 */
export function wasAutoDetected(): boolean {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && TIMEZONE_CURRENCY_MAP[timezone]) return true;

    const locale = navigator.language || '';
    if (locale.includes('-')) {
      const countryCode = locale.split('-')[1]?.toUpperCase();
      if (countryCode && LOCALE_CURRENCY_MAP[countryCode]) return true;
    }
  } catch {
    return false;
  }
  return false;
}
