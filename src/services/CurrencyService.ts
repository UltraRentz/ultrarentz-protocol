interface Currency {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // to GBP
  flag: string;
}

interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
}

class CurrencyService {
  private static readonly CURRENCIES: Currency[] = [
    {
      code: 'GBP',
      symbol: '£',
      name: 'British Pound',
      exchangeRate: 1.0,
      flag: '🇬🇧'
    },
    {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      exchangeRate: 0.79,
      flag: '🇺🇸'
    },
    {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
      exchangeRate: 0.86,
      flag: '🇪🇺'
    },
    {
      code: 'JPY',
      symbol: '¥',
      name: 'Japanese Yen',
      exchangeRate: 0.0053,
      flag: '🇯🇵'
    },
    {
      code: 'AUD',
      symbol: 'A$',
      name: 'Australian Dollar',
      exchangeRate: 0.51,
      flag: '🇦🇺'
    },
    {
      code: 'CAD',
      symbol: 'C$',
      name: 'Canadian Dollar',
      exchangeRate: 0.58,
      flag: '🇨🇦'
    }
  ];

  private static readonly EXCHANGE_RATES: ExchangeRates = {
    USD: 0.79,
    EUR: 0.86,
    GBP: 1.0,
    JPY: 0.0053,
    AUD: 0.51,
    CAD: 0.58
  };

  static getCurrencyByCode(code: string): Currency | undefined {
    return this.CURRENCIES.find(currency => currency.code === code);
  }

  static convertToGBP(amount: number, fromCurrency: string): number {
    const currency = this.getCurrencyByCode(fromCurrency);
    if (!currency) return amount;
    
    return amount * currency.exchangeRate;
  }

  static convertFromGBP(amount: number, toCurrency: string): number {
    const currency = this.getCurrencyByCode(toCurrency);
    if (!currency) return amount;
    
    return amount / currency.exchangeRate;
  }

  static formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.getCurrencyByCode(currencyCode);
    if (!currency) return amount.toString();
    
    return new Intl.NumberFormat('en-' + this.getLocaleForCurrency(currencyCode), {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2
    }).format(amount);
  }

  static getLocaleForCurrency(currencyCode: string): string {
    switch (currencyCode) {
      case 'EUR': return 'de';
      case 'JPY': return 'ja';
      default: return 'en';
    }
  }

  static getAllCurrencies(): Currency[] {
    return this.CURRENCIES;
  }

  static getExchangeRates(): ExchangeRates {
    return this.EXCHANGE_RATES;
  }
}

export default CurrencyService;
