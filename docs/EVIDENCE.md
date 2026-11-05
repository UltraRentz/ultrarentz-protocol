# UltraRentz evidence file

Facts from the articles Ben pasted on 5 Nov 2026, sorted by how safe they are to use. Everything here comes from the pasted text only. I could not open the original pages, so check the dates and figures against the source before putting them in a public repo or the video.

## 1. Use freely (named research, clear numbers)

**UK, Generation Rent / Opinium survey of 2,000 private renters (press release, 21 Jul 2025)**
- 22% of private renters report unfair deductions from their deposit. 4% of all renters used the formal dispute process. (Roughly 1 in 5 of those with unfair deductions disputed.)
- 46% did not know they could challenge deductions. 7% said their deposit was not protected.
- Of those who did not dispute: 36% thought it would take too long, be unfair, or lacked evidence. 26% were deterred by their landlord (threats, refusal, or no protection).
- Tenants who dispute get about 79% of their deposit back on average (Generation Rent analysis). TDS data: 77% get some back, 32% get all of it.
- Up to 296,000 tenants a year could be losing hundreds of pounds. Average deposit in England and Wales was £1,150 (31 Mar 2025, FOI via MHCLG).
- **Double-deposit squeeze (matches our rollover feature):** renters paying a new deposit before the old one is returned. Quotes in the release from "Eileen, 52" and "Steven, 42": "Having to have the extra money [to cover two deposits at once] and the time taken to get the first one back, it's a real burden." Only quote if you cite Generation Rent as the source.
- Their asks: return or claim within 14 days; return any undisputed part immediately; disputes decided within 10 working days; landlords cannot refuse dispute resolution.

**UK, Generation Rent notes (undated in the paste; check the date)**
- About £5.5bn of renters' money is held in deposit schemes. Scheme contracts expire in 2028; a tender was expected by 31 Aug but the notes say it was not yet published. Treat the timing as "unconfirmed, check before quoting".
- Generation Rent's petition opposes insurance-backed schemes, where landlords keep the interest and can delay returns, and prefers custodial schemes where the interest benefits tenants.

**Netherlands, !WOON (March 2026, via two news pieces)**
- No central deposit system. Landlords hold deposits in their own accounts and keep the interest. If a landlord goes bankrupt, tenants often lose the deposit because funds are not kept separate.
- Return due within 14 days, or 30 days if deductions are made with a written account.
- Landlords may wait until an international tenant has left the country before disputing. Inspection reports sometimes in Dutch only, so internationals sign off on pre-existing damage.
- !WOON's advice: document every detail with photos and video at check-in; independent check-in/out; mid-tenancy inspection. (This is the evidence-bundle idea in our design.)
- **Numbers disagree between the two articles:** one says 223 tenants reported in Amsterdam; the other says 203 in Amsterdam plus 20 elsewhere. Use "223 reports, mostly Amsterdam" or avoid the number.

**Norway, J. P. Lorentzen, *Journal of Economic Criminology* (2025)**
- Estimates 24.5% to 42.6% of rental units have irregular deposits (not in the legally required account). About 85% of repayments were round figures, suggesting interest was not paid.
- Limits: one bank's data (DNB), extrapolated; the author is employed and funded by DNB (declared); the numbers are estimates. Say "estimated".

## 2. Use with a label (vendors or opinion)

- **LeaseLock (US, Sept 2026 blog and 2020 Forbes Council post):** claims 4 hours and $200 of admin per deposit, $1m a year for a 10,000-unit portfolio, and $17bn of leases insured. These are the vendor's assumptions and sales claims. Say "a deposit-insurance vendor estimates".
- **Garentii (EU):** claims over €70bn sits in European cash deposits. No source given. Do not use as fact.
- **Housing Hand (UK guarantor service):** shows demand for alternatives to upfront money. See the naming flag below.
- **Korea jeonse (blog-style article):** deposits are 50-70% of property value; landlords invest the deposit and keep the returns. Over 4,000 fraud cases in 2023, about £300m damage. Useful as a warning about trusting landlords with deposits; the source is a secondary article.
- **Ireland, "Deposit unfairly retained across Ireland" (source 4, Threshold, an Irish renters' charity, going by the link):** Threshold says it has proposed independent third-party holding of deposits since 2009; the government does not see a need because few cases reach the RTB. This is an advocacy group's view, so attribute it to Threshold. It supports the Ireland pilot story. The 2017 Irish Times piece (source 13) is dated.
- **Source 5 (Landlord Today, Oct 2026, "many tenants ignorant about deposit reductions"):** I have not seen the text of this one. Paste it if you want it used.

## 3. Not useful for the build (skip)

Section 21 and racial disparity, Cost of Rent Day, rent-control arguments, the Econoclast piece, JRF affordability briefing (only two side facts: average private renter spends about a third of income on rent; Shelter put the average cost of a forced move at £670). The propertyindustryeye link on rent arrears was only a URL, so I have not seen it.

## Flags

1. **"1 in 4" in the ZuZone deck is wrong.** The source says 22%, so use "more than 1 in 5". The press release headline says 1 in 5 and the subhead says "almost 1 in 4". Use "22%".
2. **Name clash risk:** Housing Hand sells a trademarked "Guarantor Passport®" (a different product, rent guarantors). "Deposit Passport" is fine for a hackathon. Before any commercial launch, run a trademark search or pick another name.
3. **Interest and UK law:** the Generation Rent point about interest on £5.5bn supports our thesis, but it is a policy argument, not a licence. UK stays practice-money only.
4. **The dev rel's compliance story** is still unverified; none of these articles covers it.

## Ready-to-use paragraph (every claim above is from section 1)

> In the UK, 22% of private renters report unfair deposit deductions, yet only 4% use the formal dispute process, and 46% did not know they could challenge. Renters who do dispute recover about 79% of their deposit on average. Many have to pay a new deposit before the old one is returned. In the Netherlands, !WOON reports landlords holding deposits in their own accounts and waiting until international tenants have left before disputing. The common failure is simple: no neutral, checkable record of what the deposit was and what happened to it. The Deposit Passport records the outcome of a tenancy on Arc, keeps the evidence on Arkiv where anyone can verify it, and lets a clean tenancy roll the deposit into the next one, with a human approval step.
> *Sources: Generation Rent / Opinium (21 Jul 2025); !WOON via IamExpat (11 Mar 2026).*

## Sources (keep all)

Links as supplied by Ben on 5 Nov 2026. I have not opened them myself; I worked from the pasted text.

1. IamExpat, international tenants more likely to lose rental deposits in the Netherlands: https://www.iamexpat.nl/housing/property-news/international-tenants-more-likely-lose-rental-deposits-netherlands
2. The Class Foundation (hosting a Garentii post), "Is it time to say goodbye to rental security deposits?": https://www.theclassfoundation.com/post/is-it-time-to-say-goodbye-to-rental-security-deposits-how-to-remove-the-financial-burden-on-students-and-create-financial-wellness-garentii
3. Fathom Consulting, Korea's jeonse housing bubble is bursting: https://www.fathom-consulting.com/koreas-jeonse-housing-bubble-is-bursting/
4. Threshold, deposit unfairly retained across Ireland: https://threshold.ie/deposit-unfairly-retained-across-ireland/
5. Landlord Today, many tenants ignorant about deposit reductions (Oct 2026): https://www.landlordtoday.co.uk/breaking-news/2026/10/many-tenants-ignorant-about-deposit-reductions/
6. Joseph Rowntree Foundation, Under pressure: the affordability challenges facing private renters: https://www.jrf.org.uk/housing/under-pressure-the-affordability-challenges-facing-private-renters
7. World Finance, Locked out: tackling the world's runaway rent crisis: https://www.worldfinance.com/featured/locked-out-tackling-the-worlds-runaway-rent-crisis
8. Lorentzen, Irregular deposits in Norway, Journal of Economic Criminology (ScienceDirect): https://www.sciencedirect.com/science/article/pii/S2949791425000508
9. NL Times, tenants increasingly struggle to recover deposits (10 Mar 2026): https://nltimes.nl/2026/03/10/tenants-increasingly-struggle-recover-deposits-rental-rights-group-warns
10. LeaseLock, The hidden cost of deposits (vendor): https://leaselock.com/the-hidden-cost-of-deposits/
11. Forbes Real Estate Council, security deposit legislation sweeping the US (2020, by LeaseLock's founder): https://www.forbes.com/councils/forbesrealestatecouncil/2020/07/15/security-deposit-legislation-sweeping-the-us--are-we-finally-solving-the-problem/
12. Atlantic Sentinel, Rent control keeps failing (2022): https://atlanticsentinel.com/2022/12/rent-control-keeps-failing-countries-keep-trying/
13. Irish Times, how do rental deposits compare around the world? (2017): https://www.irishtimes.com/life-and-style/abroad/how-do-rental-deposits-compare-around-the-world-1.3166344

Also pasted, with the links in the notes but not in this list: Generation Rent (press releases of 21 Jul 2025, 30 Jan 2026, 2 Jun 2026, 11 May 2026 and 13 Jul 2026; deposit tender notes; recommendations PDF), Housing Hand guarantor guide (3 Aug 2026), and a Property Industry Eye link on rent arrears (not read).

## Where each piece goes

| Use | Where |
|---|---|
| Problem paragraph | README "Problem" |
| Evidence and tamper-check story, deposit data has a natural end date | `/arkiv/why-arkiv.md` |
| Who it helps and how to reach them (renters, international students, Irish and Dutch renters) | `/arkiv/reach.md` |
| Double-deposit squeeze quote | Demo video intro |
| Partial release of undisputed money, 14-day deadline | README "What's next" (not built this weekend) |