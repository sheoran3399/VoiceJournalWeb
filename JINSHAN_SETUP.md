# Mirroring journal entries to Kingsoft Docs (金山文档)

Every entry saved to the Google Doc also gets mirrored to a Kingsoft Docs
file, same idea as the [Yuque mirror](YUQUE_SETUP.md). Until the steps below
are done, the mirror silently fails in the background — the Google Doc save
itself is never affected.

Kingsoft's setup is heavier than Yuque's because there's no simple personal
API token — it's full OAuth2, so there's a one-time browser authorization
step before the Worker can write on your behalf.

## 1. Register an app on the Kingsoft developer console

1. Go to [developer.kdocs.cn](https://developer.kdocs.cn) and create an app.
2. Copy the **app_id** and **app_secret** it gives you — you'll need both
   in step 3.
3. In the app's capability settings, make sure "应用文档接口" (app-space
   document API) and content read/write are enabled — these aren't on by
   default and may need review before they work outside a test/sandbox mode.

## 2. Do the one-time OAuth authorization

This has to be done once, by you, in a browser, as the account whose doc
you want to write to:

1. Follow the "Web 授权" (Web Authorization) flow described at
   [developer.kdocs.cn/common/authorization/web.html](https://developer.kdocs.cn/common/authorization/web.html)
   using your app_id from step 1. This gets you an authorization code.
2. Exchange that code for an `access_token` + `refresh_token` pair (the
   token endpoint is on the same docs — the exact path is gated behind your
   registered app, so pull it from your app's console page rather than
   trusting a hardcoded URL).
3. Save the `refresh_token` somewhere safe — that's what goes into the
   Worker in step 4. It's valid 90 days; the access_token it mints is only
   valid 24h, which is why the Worker refreshes it on every call instead of
   caching it.

## 3. Get the target doc's file_token

The write endpoint (`更新文档内容`) is documented under "应用文档接口"
(app-space documents — files your app created/owns), not "个人文档接口"
(personal documents you already have via a share link). If the doc you want
to mirror into already exists as a personal doc, check whether your app's
console exposes a way to bind/import it into app space, or create a fresh
doc through the app-space API instead and share that link out. Either way,
you need the resulting file's `file_token`.

## 4. Add the route to your Cloudflare Worker

Same `voicejournal-api` Worker used for the AI proxy and the Yuque mirror,
managed directly in the Cloudflare dashboard:

1. **Settings → Variables**, add:
   - `JINSHAN_APP_ID` — from step 1
   - `JINSHAN_APP_SECRET` — from step 1, marked **Encrypt**
   - `JINSHAN_REFRESH_TOKEN` — from step 2, marked **Encrypt**
   - `JINSHAN_FILE_TOKEN` — from step 3
2. Open the Worker's code editor (Quick Edit) and merge in the route from
   [`worker/jinshan-append.js`](worker/jinshan-append.js) — it exports a
   `handleJinshanAppend` function and a routing example at the bottom
   showing where `/api/jinshan-append` should plug in, alongside
   `/api/yuque-append`.
3. **Before deploying**, double check the two URLs marked `// VERIFY` at the
   top of `jinshan-append.js` against your app's actual console page —
   they're best-effort from public docs, not confirmed against a live app.
4. Save / deploy.

## 5. Test it

Save a journal entry from the Voice tab while signed in to Google. Open the
browser console — if the mirror fails, you'll see
`[Journal] Jinshan mirror failed: ...` with the reason. The Google Doc save
itself always succeeds independently of this.
