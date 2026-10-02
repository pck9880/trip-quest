# Transfer Checklist

## Before listing

- [ ] Run `npm test`
- [ ] Confirm GitHub Pages demo works
- [ ] Confirm current cover provenance and retain source records
- [ ] Re-check third-party provider terms
- [ ] Decide whether the public repository should remain public during sale
- [ ] Prepare truthful usage/revenue metrics; use zero/unverified where no evidence exists
- [ ] Do not market the app as direct OpenAI-powered unless such integration is actually added
- [ ] Identify any custom domain separately; none is included by default

## At agreement

- [ ] Define exactly what transfers: repository, project code, data files, brand assets, documentation
- [ ] Exclude third-party service accounts/rights unless separately transferable
- [ ] Include project license/rights assignment language appropriate to the transaction
- [ ] Disclose public Git history and prior public availability
- [ ] Disclose `ASSET_PROVENANCE.md` and `KNOWN_LIMITATIONS.md`

## Technical handoff

- [ ] Transfer or copy repository to buyer-controlled GitHub organization/account
- [ ] Configure GitHub Pages in buyer account
- [ ] Update Pages URL and optional custom domain
- [ ] Update `publicBaseUrl` strategy if custom hosting is introduced
- [ ] Review Service Worker cache key after domain/asset changes
- [ ] Replace commercial-risk external providers before monetization
- [ ] Verify scheduled workflow and fuel-price process
- [ ] Run a fresh production deployment and `npm test`

## After transfer

- [ ] Rotate/remove seller credentials from GitHub/account settings
- [ ] Buyer configures analytics, monitoring, privacy policy and terms if operating publicly
- [ ] Buyer chooses production-grade routing/geocoding/weather/tile providers
