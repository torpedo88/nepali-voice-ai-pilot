# Nepali Voice AI — Web

Next.js 16 + React 19 frontend for `voice.overseasnepal.com`. Deployed as a Cloudflare Worker via OpenNext.

Mirrors the overseasnepal.com stack: shadcn/ui, Tailwind v4, @supabase/ssr, next-intl, Zod.

## Local dev

```bash
cd apps/web
pnpm install
cp .env.example .env.local        # paste the same Supabase URL + anon key as overseasnepal
pnpm dev                          # http://localhost:3000
```

## Auth

Shares the `overseasnepal.com` Supabase project so sign-in carries across both sites. Uses magic-link email OTP by default. Set `emailRedirectTo` to the full URL of the callback when adding OAuth providers.

## Deploy

```bash
# one-time — set production secrets in Cloudflare
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put NEXT_PUBLIC_API_BASE_URL

# deploy
pnpm deploy
```

`wrangler.jsonc` is wired to `voice.overseasnepal.com/*` on zone `overseasnepal.com` (zone_id `668ec661120f2f09ae37c18fb8b63ef3` — same as overseasnepal).

Preview env publishes to `voice-preview.overseasnepal.com` — `pnpm deploy:preview`.

## Structure

```
src/
├── app/
│   ├── globals.css
│   └── [locale]/
│       ├── layout.tsx            # next-intl provider, locale param
│       ├── page.tsx              # landing
│       ├── speak/page.tsx        # auth-gated voice UI
│       └── login/page.tsx        # magic-link login
├── components/
│   ├── ui/button.tsx             # shadcn
│   └── voice/VoiceRecorder.tsx   # mic capture + /v1/voice call
├── i18n/{routing,request}.ts     # en + ne (ne uses /ne prefix)
├── lib/
│   ├── api.ts                    # typed fetch to voice-api.overseasnepal.com
│   ├── env.ts                    # Zod-validated env
│   ├── utils.ts                  # cn()
│   └── supabase/{client,server,middleware}.ts
├── messages/{en,ne}.json
└── middleware.ts                 # Supabase session refresh + next-intl routing
```

## Notes

- `next.config.ts` overrides `Permissions-Policy` to allow `microphone=(self)` — required for the mic capture to work in-browser.
- `/v1/voice` on the API returns the MP3 audio as the response body and transcripts in `X-User-Text` / `X-Ai-Text` / `X-Session-Id` headers (single round-trip).
- Session continuity: the browser holds the `sessionId` returned by the server and passes it back on the next turn. Session dies after 1 hour of inactivity (server-side LRU).
