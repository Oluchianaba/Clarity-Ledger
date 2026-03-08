# CLARITY LEDGER — Complete Setup Guide
## For Non-Technical Founders | 4-Step Launch Plan

---

## WHAT YOU'RE GETTING

| What | Tech | Where it runs |
|---|---|---|
| Web App | Next.js (React) | Browser on phone + desktop |
| Mobile App | React Native (Expo) | Android + iOS |
| Database | Supabase (Postgres) | Cloud — managed for you |
| Auth | Supabase Auth | Login, signup, passwords |
| Hosting (Web) | Vercel | Free → paid |

**Your data flow:**
```
Customer logs in → Web/Mobile App → Supabase Database → Back to App
```
Every business is isolated. Business A cannot see Business B's data.

---

## STEP 1 — Set Up Supabase (Your Database)

**Time needed: 15 minutes**

1. Go to **https://supabase.com** → Click "Start your project" → Sign up free
2. Click **"New Project"**
   - Name: `clarity-ledger`
   - Database Password: Create a strong password, SAVE IT somewhere
   - Region: Choose **Europe West** (closest to Nigeria)
3. Wait ~2 minutes for project to be created
4. Go to **SQL Editor** (left sidebar, looks like `</>`)
5. Click **"New query"**
6. Open the file `supabase/schema.sql` from this folder
7. Copy ALL the text → Paste into the SQL editor → Click **"Run"**
8. You should see "Success. No rows returned"

**Get your keys:**
9. Go to **Settings → API** (left sidebar)
10. Copy these two values — you'll need them:
    - **Project URL** (looks like `https://xxxxx.supabase.co`)
    - **anon public key** (long string starting with `eyJ...`)

---

## STEP 2 — Deploy the Web App (Vercel)

**Time needed: 10 minutes**

### First, set up the environment file:
1. Inside the `web/` folder, create a file called `.env.local`
2. Add these lines (use YOUR values from Step 1):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### Deploy to Vercel (free hosting):
1. Create account at **https://vercel.com** — sign up with GitHub
2. Go to **https://github.com** → Create account → New repository → Name it `clarity-ledger-web`
3. Upload the entire `web/` folder to that GitHub repository
4. Back on Vercel: Click **"Add New Project"** → Import your GitHub repo
5. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
6. Click **Deploy** — wait 3 minutes
7. Vercel gives you a URL like `https://clarity-ledger.vercel.app` ← YOUR WEB APP! 🎉

### Set your custom domain (optional, ~₦5,000/year):
- Buy domain at **Namecheap.com** (e.g., `clarityledger.com.ng`)
- In Vercel: Project Settings → Domains → Add your domain
- Follow the DNS instructions Vercel shows you

---

## STEP 3 — Launch the Mobile App (Expo)

**Time needed: 20 minutes**

### Set up on your computer:
1. Install **Node.js** from https://nodejs.org (click "LTS" version)
2. Open **Terminal** (Mac) or **Command Prompt** (Windows)
3. Run: `npm install -g expo-cli`

### Set up the mobile project:
1. Create a file `mobile/src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
)
// ... copy the rest from web/src/lib/supabase.js
```

2. In Terminal, navigate to the `mobile/` folder:
```bash
cd clarity-ledger-app/mobile
npm install
npx expo start
```

3. Download **Expo Go** app on your phone (App Store / Play Store)
4. Scan the QR code that appears in Terminal → App opens on your phone! 📱

### Publish to App Stores (when ready):
- **Google Play Store:** $25 one-time fee → https://play.google.com/console
- **Apple App Store:** $99/year → https://developer.apple.com
- Use `npx expo build:android` and `npx expo build:ios`

---

## STEP 4 — Hire a Developer to Complete It

The starter code gives you:
✅ Database (fully designed with security)
✅ Authentication (login, signup, multi-tenant)
✅ Dashboard with charts
✅ Income & Expense recording
✅ Sales & Invoicing (create, track, receive payment)
✅ Stock management
✅ Mobile app (Dashboard screen)

**What still needs to be built (by a developer):**
- Customers & Suppliers pages (web + mobile)
- Purchases page
- Analytics / Charts page
- PDF Invoice export
- Push notifications (low stock, payment reminders)
- Paystack subscription billing

**Where to hire a Nigerian developer:**
- **Worknigeria.com** — post a job
- **LinkedIn** — search "React developer Lagos"
- **Twitter/X** — post "#DevHiring Nigeria Next.js developer"
- **Toptal** or **Upwork** — if you want vetted developers

**What to tell the developer:**
> "I have a Next.js + Supabase codebase for a Nigerian SME accounting SaaS called Clarity Ledger.
> The database schema and authentication are complete. I need help building the remaining pages
> (Customers, Suppliers, Purchases, Analytics, PDF invoices, Paystack integration).
> The tech stack is: Next.js 14, React Native Expo, Supabase."

**Expected dev cost for remaining features:** ₦150,000 – ₦400,000 depending on experience.

---

## PRICING MODEL (Suggestions for your SaaS)

| Plan | Price | Features |
|---|---|---|
| Free | ₦0/month | 1 user, 50 transactions/month |
| Starter | ₦5,000/month | 3 users, unlimited transactions |
| Business | ₦15,000/month | 10 users, PDF invoices, analytics |
| Enterprise | ₦40,000/month | Unlimited users, priority support |

**Payment collection:** Use **Paystack** (paystack.com) — Nigerian payment gateway, supports bank transfer, USSD, cards.

---

## FOLDER STRUCTURE (What You Have)

```
clarity-ledger-app/
│
├── supabase/
│   └── schema.sql          ← Run this in Supabase SQL Editor (STEP 1)
│
├── web/                    ← Next.js Web App
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── layout.jsx         ← Sidebar navigation
│       │   ├── login/page.jsx     ← Login + Signup
│       │   ├── dashboard/page.jsx ← Dashboard + Charts
│       │   ├── transactions/page.jsx ← Income & Expense
│       │   ├── sales/page.jsx     ← Invoices
│       │   └── stock/page.jsx     ← Inventory
│       └── lib/
│           └── supabase.js        ← All database calls
│
└── mobile/                 ← React Native Expo App
    ├── App.js              ← Navigation setup
    ├── package.json
    └── src/
        ├── lib/supabase.js
        └── screens/
            └── DashboardScreen.js ← Mobile dashboard
```

---

## MONTHLY COST BREAKDOWN

| Service | Free | After Growth |
|---|---|---|
| Supabase | Free (500MB, 50k users) | $25/month (~₦38k) |
| Vercel | Free (100GB bandwidth) | $20/month (~₦30k) |
| Domain (.com.ng) | — | ₦5,000/year |
| **Total** | **₦0/month** | **~₦68k/month** |

At ₦15,000/plan × 5 paying customers = ₦75,000/month → already profitable.

---

## SUPPORT & NEXT STEPS

1. ✅ Run `schema.sql` on Supabase
2. ✅ Deploy web app to Vercel
3. ✅ Test on your phone via Expo Go
4. 🔧 Hire developer for remaining pages
5. 💰 Set up Paystack for subscription billing
6. 📢 Launch to Nigerian SME market

**Built for Nigerian SMEs. Powered by global infrastructure.**
