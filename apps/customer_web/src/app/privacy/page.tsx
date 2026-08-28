"use client";

import { useLang } from "@/lib/i18n";

export default function PrivacyPage() {
  const { lang } = useLang();

  const en = (
    <div className="space-y-4">
      <p>
        OnamDelivery collects only what is needed to run the service: your phone
        number, name (optional), delivery address and location, and order
        history. We process this to fulfil your orders and coordinate delivery.
      </p>
      <p>
        Under the Digital Personal Data Protection (DPDP) Act, 2023, we process
        your data only with your consent, which you provide at sign-in. You may
        withdraw consent at any time by contacting us, after which your data
        will be deleted subject to legal requirements.
      </p>
      <p>
        We do not sell your personal data. It is shared only with the flower shop
        and the delivery partner necessary to complete your order.
      </p>
      <p>
        Grievance Officer: Aanand AB · aanandab44@gmail.com
      </p>
    </div>
  );

  const ml = (
    <div className="space-y-4">
      <p>
        സേവനം പ്രവർത്തിപ്പിക്കാൻ ആവശ്യമുള്ളത് മാത്രമേ OnamDelivery ശേഖരിക്കൂ: നിങ്ങളുടെ
        ഫോൺ നമ്പർ, പേര് (ഓപ്ഷണൽ), ഡെലിവറി വിലാസവും സ്ഥാനവും, ഓർഡർ ചരിത്രം എന്നിവ.
        നിങ്ങളുടെ ഓർഡറുകൾ പൂർത്തിയാക്കാനും ഡെലിവറി ഏകോപിപ്പിക്കാനുമാണ് ഇവ ഉപയോഗിക്കുന്നത്.
      </p>
      <p>
        ഡിജിറ്റൽ വ്യക്തിഗത ഡാറ്റാ സംരക്ഷണ (DPDP) നിയമം 2023 പ്രകാരം, സൈൻ ഇൻ ചെയ്യുമ്പോൾ
        നിങ്ങൾ നൽകുന്ന സമ്മതത്തോടെ മാത്രമേ ഞങ്ങൾ ഡാറ്റ പ്രോസസ്സ് ചെയ്യൂ. ഞങ്ങളെ ബന്ധപ്പെട്ട്
        എപ്പോൾ വേണമെങ്കിലും സമ്മതം പിൻവലിക്കാം.
      </p>
      <p>
        ഞങ്ങൾ നിങ്ങളുടെ വ്യക്തിഗത ഡാറ്റ വിൽക്കുന്നില്ല. ഓർഡർ പൂർത്തിയാക്കാൻ ആവശ്യമായ
        പൂക്കടയുമായും ഡെലിവറി പങ്കാളിയുമായും മാത്രമേ ഇത് പങ്കിടൂ.
      </p>
      <p>പരാതി പരിഹാര ഉദ്യോഗസ്ഥൻ: Aanand AB · aanandab44@gmail.com</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-ink">
        {lang === "ml" ? "സ്വകാര്യതാ നയം" : "Privacy Policy"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {lang === "ml"
          ? "DPDP നിയമം 2023 · IT നിയമം 2000"
          : "DPDP Act 2023 · IT Act 2000"}
      </p>
      <div className="mt-6 text-ink">{lang === "ml" ? ml : en}</div>
    </div>
  );
}
