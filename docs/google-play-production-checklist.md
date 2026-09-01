# Google Play production checklist

## Implemented in the application

- Android targets API 36 through Expo SDK 57.
- Stripe checkout is web-only and is hidden/blocked on native Android and iOS builds.
- Account deletion is available in Profile > Delete account and data and at `/delete-account` on web.
- Account deletion removes Supabase Auth credentials, profile data, user submissions, messages, posts, reviews, relationships, and user-owned Storage files.
- User-generated destinations, fauna, and businesses require administrator approval.
- Travelers and traveler posts can be reported; traveler accounts can be blocked.
- Blocking hides the blocker's feed content and prevents private messages in both directions.
- Terms and privacy links are shown during account creation.

## Play Console declarations to complete manually

- App access: provide a durable reviewer account and steps to reach every restricted feature.
- Data safety: disclose account/profile data, precise and approximate location, photos, audio messages, user content, messages, purchase history, and device push token. Declare encryption in transit and account deletion.
- Privacy policy URL: publish the web `/privacy` route on a permanent HTTPS domain.
- Account deletion URL: publish the web `/delete-account` route on the same permanent HTTPS domain.
- Ads: answer according to the final production build and ad provider; do not claim “no ads” if an ad SDK is later added.
- Content rating: complete IARC for social/user-generated content and location sharing.
- Target audience: choose the actual audience. The current product is not designed or configured as a children-directed app.
- Permissions: declare foreground location, camera, microphone, photos, and notifications exactly as used in the app.
- Store listing: app title, short/full descriptions, support email, category, countries, icon, feature graphic, phone screenshots, and tablet screenshots if tablet distribution remains enabled.
- Testing: complete the closed-test requirement when applicable to the developer account.
- Release: upload the newest production AAB, review automated pre-launch reports, and resolve crashes, ANRs, accessibility findings, and policy warnings before production rollout.

## Data processors to disclose

- Supabase: authentication, database, storage, server functions, and push token storage.
- Expo/EAS: application builds and Expo push notification routing.
- Mapbox: maps and map-related network requests.
- OpenWeather: weather requests.
- Google: OAuth and Google Play distribution; Google Play Billing only if native digital purchases are reintroduced.
- Stripe: web-only subscriptions; it is not linked from native store builds.

This file is an engineering checklist, not legal advice. The final policy must identify the legal developer/entity and a monitored contact address.
