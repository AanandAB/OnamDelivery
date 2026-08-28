"use client";

// Lightweight bilingual (English / Malayalam) i18n via React context.
// Mirrors Onapookkal's `useLang()` pattern — a single client-side toggle,
// no server round-trip, so it works identically in the static export.

import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ml";

interface Dict {
  brand: string;
  tagline: string;
  nav: {
    shops: string;
    orders: string;
    cart: string;
    login: string;
    logout: string;
  };
  hero: { title: string; subtitle: string; cta: string };
  vendors: {
    heading: string;
    sub: string;
    open: string;
    closed: string;
    rating: string;
    view: string;
    products: string;
    empty: string;
    loadError: string;
  };
  login: {
    title: string;
    sub: string;
    phone: string;
    phoneHint: string;
    consent: string;
    send: string;
    code: string;
    devCode: string;
    verify: string;
    change: string;
    errorPhone: string;
    errorConsent: string;
  };
  shop: {
    back: string;
    products: string;
    reviews: string;
    noProducts: string;
    outOfStock: string;
    addToCart: string;
    reviewsEmpty: string;
  };
  footer: { privacy: string; rights: string; tagline: string };
  checkout: {
    title: string;
    summary: string;
    signIn: string;
    signInPrompt: string;
    empty: string;
    subtotal: string;
    deliveryFee: string;
    serviceFee: string;
    discount: string;
    total: string;
    distance: string;
    locationTitle: string;
    shareLocation: string;
    locating: string;
    pinHint: string;
    locationError: string;
    locationRequired: string;
    address: string;
    addressPlaceholder: string;
    addressRequired: string;
    coupon: string;
    couponPlaceholder: string;
    apply: string;
    couponApplied: string;
    payment: string;
    cod: string;
    codNote: string;
    placeOrder: string;
    placing: string;
    success: string;
    successSub: string;
    track: string;
    browse: string;
  };
  track: {
    title: string;
    pickup: string;
    drop: string;
    partner: string;
    waiting: string;
    refreshHint: string;
    status: Record<string, string>;
  };
  review: {
    rateThis: string;
    yourRating: string;
    commentPlaceholder: string;
    submit: string;
    thanks: string;
  };
  upi: {
    payWithUpi: string;
    orCopy: string;
    copied: string;
  };
}

const dict: Record<Lang, Dict> = {
  en: {
    brand: "OnamDelivery",
    tagline: "Fresh flowers, delivered",
    nav: {
      shops: "Shops",
      orders: "My orders",
      cart: "Cart",
      login: "Sign in",
      logout: "Log out",
    },
    hero: {
      title: "Fresh Onam flowers, delivered to your door",
      subtitle:
        "Order pookalam flowers, garlands and bouquets from local Kannur shops — pay on delivery.",
      cta: "Browse flower shops",
    },
    vendors: {
      heading: "Flower shops near you",
      sub: "Live stock & prices, updated by the shops themselves.",
      open: "Open",
      closed: "Closed",
      rating: "rating",
      view: "View shop",
      products: "products",
      empty: "No shops yet.",
      loadError: "Could not load shops. Check your connection and retry.",
    },
    login: {
      title: "Sign in",
      sub: "We'll send a one-time code to your phone.",
      phone: "Phone number",
      phoneHint: "10-digit number",
      consent:
        "I consent to the processing of my personal data as described in the Privacy Policy (DPDP Act 2023).",
      send: "Send OTP",
      code: "Enter code",
      devCode: "Dev OTP:",
      verify: "Verify & continue",
      change: "Change phone",
      errorPhone: "Enter a valid 10-digit number",
      errorConsent: "Please accept the privacy policy",
    },
    shop: {
      back: "All shops",
      products: "Products",
      reviews: "Reviews",
      noProducts: "This shop has no products right now.",
      outOfStock: "Out of stock",
      addToCart: "Add to cart",
      reviewsEmpty: "No reviews yet.",
    },
    footer: {
      privacy: "Privacy Policy",
      rights: "All rights reserved.",
      tagline: "Fresh Onam flowers, delivered across Kannur.",
    },
    checkout: {
      title: "Checkout",
      summary: "Order summary",
      signIn: "Sign in to continue",
      signInPrompt: "You need to sign in before placing your order.",
      empty: "Your cart is empty.",
      subtotal: "Subtotal",
      deliveryFee: "Delivery fee",
      serviceFee: "Service fee",
      discount: "Coupon discount",
      total: "Total",
      distance: "km away",
      locationTitle: "Delivery location",
      shareLocation: "📍 Share my location",
      locating: "Getting location…",
      pinHint: "Or drop a pin on the map",
      locationError: "Couldn't get your location — allow access or drop a pin.",
      locationRequired: "Please share your delivery location",
      address: "Delivery address",
      addressPlaceholder: "House name, street, area, pincode",
      addressRequired: "Please enter a delivery address",
      coupon: "Coupon code",
      couponPlaceholder: "e.g. ONAM-ABC123",
      apply: "Apply",
      couponApplied: "Coupon applied",
      payment: "Payment",
      cod: "Cash on delivery",
      codNote: "Pay when your flowers arrive.",
      placeOrder: "Place order",
      placing: "Placing…",
      success: "Order placed! 🎉",
      successSub: "Your order is confirmed.",
      track: "Track my order",
      browse: "Continue shopping",
    },
    track: {
      title: "Track order",
      pickup: "Pickup",
      drop: "Delivery",
      partner: "Delivery partner",
      waiting: "Waiting for a partner to accept…",
      refreshHint: "Live position refreshes automatically.",
      status: {
        placed: "Placed",
        accepted: "Accepted",
        picked_up: "Picked up",
        out_for_delivery: "On the way",
        delivered: "Delivered",
        cancelled: "Cancelled",
      },
    },
    review: {
      rateThis: "Rate this order",
      yourRating: "Your rating",
      commentPlaceholder: "How were your flowers? (optional)",
      submit: "Submit review",
      thanks: "Thanks for your review!",
    },
    upi: {
      payWithUpi: "Pay with UPI",
      orCopy: "Or copy the UPI ID",
      copied: "UPI ID copied",
    },
  },
  ml: {
    brand: "ഓണം ഡെലിവറി",
    tagline: "പുത്തൻ പൂക്കൾ, വീട്ടിലെത്തും",
    nav: {
      shops: "കടകൾ",
      orders: "എന്റെ ഓർഡറുകൾ",
      cart: "കാർട്ട്",
      login: "സൈൻ ഇൻ",
      logout: "ലോഗ് ഔട്ട്",
    },
    hero: {
      title: "പുത്തൻ ഓണപ്പൂക്കൾ, വീട്ടിൽ എത്തിക്കാം",
      subtitle:
        "കണ്ണൂരിലെ പ്രാദേശിക കടകളിൽ നിന്ന് പൂക്കളം പൂക്കളും മാലകളും ബൊക്കെകളും ഓർഡർ ചെയ്യൂ — ഡെലിവറിയിൽ പണം നൽകാം.",
      cta: "പൂക്കടകൾ കാണുക",
    },
    vendors: {
      heading: "നിങ്ങൾക്കടുത്തുള്ള പൂക്കടകൾ",
      sub: "കടകൾ തന്നെ അപ്ഡേറ്റ് ചെയ്യുന്ന തത്സമയ സ്റ്റോക്കും വിലയും.",
      open: "തുറന്നു",
      closed: "അടച്ചു",
      rating: "റേറ്റിംഗ്",
      view: "കട കാണുക",
      products: "ഉൽപ്പന്നങ്ങൾ",
      empty: "കടകൾ ഇല്ല.",
      loadError: "കടകൾ ലോഡ് ചെയ്യാനായില്ല. കണക്ഷൻ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.",
    },
    login: {
      title: "സൈൻ ഇൻ",
      sub: "നിങ്ങളുടെ ഫോണിലേക്ക് ഒറ്റത്തവണ കോഡ് അയയ്ക്കും.",
      phone: "ഫോൺ നമ്പർ",
      phoneHint: "10 അക്ക നമ്പർ",
      consent:
        "സ്വകാര്യതാ നയത്തിൽ വിവരിച്ച പ്രകാരം എന്റെ വ്യക്തിഗത വിവരങ്ങൾ പ്രോസസ്സ് ചെയ്യാൻ ഞാൻ സമ്മതിക്കുന്നു (DPDP നിയമം 2023).",
      send: "OTP അയയ്ക്കുക",
      code: "കോഡ് നൽകുക",
      devCode: "Dev OTP:",
      verify: "പരിശോധിച്ച് തുടരുക",
      change: "ഫോൺ മാറ്റുക",
      errorPhone: "സാധുവായ 10 അക്ക നമ്പർ നൽകുക",
      errorConsent: "സ്വകാര്യതാ നയം അംഗീകരിക്കുക",
    },
    shop: {
      back: "എല്ലാ കടകളും",
      products: "ഉൽപ്പന്നങ്ങൾ",
      reviews: "അവലോകനങ്ങൾ",
      noProducts: "ഈ കടയിൽ ഇപ്പോൾ ഉൽപ്പന്നങ്ങളില്ല.",
      outOfStock: "സ്റ്റോക്ക് ഇല്ല",
      addToCart: "കാർട്ടിൽ ചേർക്കുക",
      reviewsEmpty: "അവലോകനങ്ങൾ ഇല്ല.",
    },
    footer: {
      privacy: "സ്വകാര്യതാ നയം",
      rights: "എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.",
      tagline: "കണ്ണൂരിലുടനീളം പുത്തൻ ഓണപ്പൂക്കൾ എത്തിക്കുന്നു.",
    },
    checkout: {
      title: "ചെക്ക്ഔട്ട്",
      summary: "ഓർഡർ സംഗ്രഹം",
      signIn: "തുടരാൻ സൈൻ ഇൻ ചെയ്യുക",
      signInPrompt: "ഓർഡർ നൽകുന്നതിന് മുമ്പ് സൈൻ ഇൻ ചെയ്യേണ്ടതുണ്ട്.",
      empty: "നിങ്ങളുടെ കാർട്ട് ശൂന്യമാണ്.",
      subtotal: "സബ്ടോട്ടൽ",
      deliveryFee: "ഡെലിവറി ഫീസ്",
      serviceFee: "സേവന ഫീസ്",
      discount: "കൂപ്പൺ കിഴിവ്",
      total: "ആകെ",
      distance: "km അകലെ",
      locationTitle: "ഡെലിവറി സ്ഥാനം",
      shareLocation: "📍 എന്റെ സ്ഥാനം പങ്കിടുക",
      locating: "സ്ഥാനം കണ്ടെത്തുന്നു…",
      pinHint: "അല്ലെങ്കിൽ മാപ്പിൽ പിൻ ഇടുക",
      locationError: "സ്ഥാനം ലഭിച്ചില്ല — അനുമതി നൽകുക അല്ലെങ്കിൽ പിൻ ഇടുക.",
      locationRequired: "ഡെലിവറി സ്ഥാനം പങ്കിടുക",
      address: "ഡെലിവറി വിലാസം",
      addressPlaceholder: "വീടിന്റെ പേര്, തെരുവ്, പ്രദേശം, പിൻകോഡ്",
      addressRequired: "ഡെലിവറി വിലാസം നൽകുക",
      coupon: "കൂപ്പൺ കോഡ്",
      couponPlaceholder: "ഉദാ: ONAM-ABC123",
      apply: "പ്രയോഗിക്കുക",
      couponApplied: "കൂപ്പൺ പ്രയോഗിച്ചു",
      payment: "പേയ്മെന്റ്",
      cod: "ഡെലിവറിയിൽ പണം",
      codNote: "പൂക്കൾ എത്തുമ്പോൾ പണം നൽകുക.",
      placeOrder: "ഓർഡർ നൽകുക",
      placing: "നൽകുന്നു…",
      success: "ഓർഡർ നൽകി! 🎉",
      successSub: "നിങ്ങളുടെ ഓർഡർ സ്ഥിരീകരിച്ചു.",
      track: "ഓർഡർ ട്രാക്ക് ചെയ്യുക",
      browse: "തുടർന്ന് ഷോപ്പിംഗ്",
    },
    track: {
      title: "ഓർഡർ ട്രാക്ക് ചെയ്യുക",
      pickup: "പിക്കപ്പ്",
      drop: "ഡെലിവറി",
      partner: "ഡെലിവറി പങ്കാളി",
      waiting: "പങ്കാളി സ്വീകരിക്കാൻ കാത്തിരിക്കുന്നു…",
      refreshHint: "തത്സമയ സ്ഥാനം സ്വയം അപ്ഡേറ്റാകുന്നു.",
      status: {
        placed: "നൽകി",
        accepted: "സ്വീകരിച്ചു",
        picked_up: "എടുത്തു",
        out_for_delivery: "വഴിയിൽ",
        delivered: "എത്തിച്ചു",
        cancelled: "റദ്ദാക്കി",
      },
    },
    review: {
      rateThis: "ഈ ഓർഡർ റേറ്റ് ചെയ്യുക",
      yourRating: "നിങ്ങളുടെ റേറ്റിംഗ്",
      commentPlaceholder: "പൂക്കൾ എങ്ങനെയുണ്ടായിരുന്നു? (ഓപ്ഷണൽ)",
      submit: "അവലോകനം സമർപ്പിക്കുക",
      thanks: "നിങ്ങളുടെ അവലോകനത്തിന് നന്ദി!",
    },
    upi: {
      payWithUpi: "UPI വഴി പണമടയ്ക്കുക",
      orCopy: "അല്ലെങ്കിൽ UPI ID പകർത്തുക",
      copied: "UPI ID പകർത്തി",
    },
  },
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = dict[lang];
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}
