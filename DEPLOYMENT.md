# K2 Inventory — Step-by-Step Deployment

Total time: ~20 minutes. No coding required after this.

---

## PART 1 — Supabase (5 min)

### Step 1: Run the database SQL
1. Go to supabase.com → your k2 Inventory project
2. Click the **SQL Editor** icon in the left sidebar (looks like `>_`)
3. Click **New query**
4. Open the file `supabase-migration.sql` from this zip
5. Copy ALL the text and paste it into Supabase
6. Click **Run** (green button)
7. You should see: "Success. No rows returned"

### Step 2: Get your Service Role key
1. In Supabase → click the **gear icon** (Settings) at bottom left
2. Click **API**
3. Find "Project API keys" section
4. Copy the **service_role** key (the long one that says "secret")
   ⚠️ Keep this private — it bypasses all security checks

### Step 3: Enable Google sign-in (optional but recommended)
1. In Supabase → **Authentication** → **Providers**
2. Find Google → click to expand → toggle **Enable**
3. You need a Google OAuth client ID. To get one:
   a. Go to console.cloud.google.com
   b. Create a new project (or use existing)
   c. APIs & Services → Credentials → Create Credentials → OAuth Client ID
   d. Application type: Web application
   e. Authorized redirect URIs: add `https://smnyebkymodmrscraezc.supabase.co/auth/v1/callback`
   f. Copy the Client ID and Client Secret back into Supabase

---

## PART 2 — Vercel (10 min)

### Step 4: Create a Vercel account
1. Go to **vercel.com**
2. Click **Sign Up** → Continue with GitHub
3. Authorize Vercel to access your GitHub

### Step 5: Import your repository
1. On Vercel dashboard → click **Add New** → **Project**
2. Find your `K2-INV` repository → click **Import**
3. Framework: Next.js (auto-detected) ✓
4. **DO NOT click Deploy yet** — add env vars first

### Step 6: Add environment variables
Still on the import screen, scroll to **Environment Variables**.
Add these one by one:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://smnyebkymodmrscraezc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The secret key from Step 2 |
| `SUPABASE_ANON_KEY` | The anon/public key from Supabase API settings |
| `SESSION_SECRET` | Go to passwordsgenerator.net → generate 32+ character password |
| `NEXT_PUBLIC_APP_URL` | Leave blank for now — fill in after first deploy |

### Step 7: Deploy
1. Click **Deploy**
2. Wait 2-3 minutes for build to finish
3. Vercel will give you a URL like: `https://k2-inv-abc123.vercel.app`
4. Copy that URL

### Step 8: Add your app URL
1. Go to Vercel → your project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_APP_URL` → paste your Vercel URL (no trailing slash)
3. Go back to **Deployments** → click the three dots on latest → **Redeploy**

---

## PART 3 — Final Supabase config (2 min)

### Step 9: Set redirect URL
1. Back in Supabase → **Authentication** → **URL Configuration**
2. Site URL: your Vercel URL (e.g. `https://k2-inv-abc123.vercel.app`)
3. Redirect URLs: add `https://k2-inv-abc123.vercel.app/api/auth/callback`
4. Click Save

---

## Done! Your app is live at your Vercel URL.

---

## Adding teammates

To let a coworker access the inventory:
1. They go to your Vercel URL
2. They create an account with their email
3. They now see the same shared inventory
4. Everything they add/edit is visible to everyone instantly
5. The Dashboard shows who made each change

## Updating the app later

When you want to make changes to the code:
1. Edit the files
2. Push to GitHub (`git push`)
3. Vercel automatically redeploys in ~2 minutes
4. Live URL stays exactly the same

## Your live URL
(fill in after deploy)
