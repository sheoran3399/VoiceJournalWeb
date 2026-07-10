# Mirroring journal entries to Yuque (语雀)

Every entry saved to the Google Doc also gets mirrored to a Yuque doc, so
your sister in mainland China can read it without needing Google access.
This only works once the steps below are done — until then, the mirror
silently fails in the background (the Google Doc save is unaffected).

## 1. Create the target doc in Yuque

1. Sign up / log in at [yuque.com](https://www.yuque.com).
2. Create a 知识库 (repo) — e.g. "日记分享". Choose whether it's public or
   private; you'll set sharing on the doc itself in step 4 regardless.
3. Inside it, create one doc — e.g. titled "Journal". This is the single
   running doc that every entry gets prepended to.
4. Click 分享 (Share) on that doc and turn on public link sharing. Send
   your sister that link — she can open it without her own Yuque account.
5. Look at the doc's URL: `https://www.yuque.com/<namespace>/<doc-slug>`.
   - `<namespace>` is usually `your-username/repo-slug`
   - `<doc-slug>` is the last segment
   - You'll need both in step 3 below.

## 2. Generate a personal API token

Go to [yuque.com/settings/tokens](https://www.yuque.com/settings/tokens/),
generate a new token with read/write access, and copy it — it's only shown
once. Treat it like a password: it can read and edit everything in your
Yuque account, not just this one doc.

## 3. Add the route to your Cloudflare Worker

The `voicejournal-api` Worker (used today for the AI proxy) is managed
directly in the Cloudflare dashboard — there's no source file for it in
this repo. To add the Yuque mirror:

1. In the Cloudflare dashboard, open the `voicejournal-api` Worker →
   **Settings → Variables**. Add:
   - `YUQUE_TOKEN` — the token from step 2, marked **Encrypt**
   - `YUQUE_NAMESPACE` — from step 1 (e.g. `yourname/journal-share`)
   - `YUQUE_DOC_SLUG` — from step 1 (e.g. `journal`)
2. Open the Worker's code editor (Quick Edit) and merge in the route from
   [`worker/yuque-append.js`](worker/yuque-append.js) in this repo — it
   exports a `handleYuqueAppend` function and a routing example at the
   bottom showing where `/api/yuque-append` should plug into whatever
   routing already exists for `/api/patterns` etc.
3. Save / deploy.

## 4. Test it

Save a journal entry from the Voice tab while signed in to Google. Open
the browser console — if the mirror fails, you'll see
`[Journal] Yuque mirror failed: ...` with the reason (bad token, wrong
namespace/slug, doc not found). The Google Doc save itself always
succeeds independently of this.
