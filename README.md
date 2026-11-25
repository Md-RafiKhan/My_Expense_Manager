# My Expense Manager — starter source code

This is the first working starter version of a multi-user BDT income/expense tracker.

## Included
- Email/password registration and login through Supabase Auth
- Per-user transaction records protected by Supabase Row Level Security
- Add, edit, delete, search and filter transactions
- BDT summaries (income, expenses, net balance)
- Local IndexedDB storage for offline-created transactions
- A basic PWA service worker and installable web manifest

## 1. Create and configure Supabase
1. Create a new Supabase project.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `supabase-schema.sql`, copy all SQL, paste it into SQL Editor and run it.
4. Open **Project Settings → API** (or the API Keys page).
5. Copy the Project URL and the anon/publishable key.
6. Open `config.js` and replace the two placeholder values.

Never use the `service_role` or secret key in browser code.

## 2. Run locally
Because this uses JavaScript modules and a service worker, do not open `index.html` by double-clicking it.

With Python installed, open a terminal in this folder and run:
```bash
python -m http.server 8000
```
Then open http://localhost:8000

Alternatively use VS Code with the Live Server extension.

## 3. Deploy to Cloudflare Pages
1. Upload this folder to a new GitHub repository.
2. In Cloudflare Dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository.
4. Framework preset: **None**.
5. Build command: leave blank.
6. Build output directory: `/` (the repository root).
7. Deploy.
8. Open the deployed HTTPS URL and test registration/login.

## 4. Android and Windows
- Android: open the deployed HTTPS site in Chrome, use the browser menu and choose **Install app** or **Add to Home screen** (wording varies).
- Windows: open the site in Edge or Chrome and use **Install this site as an app** / **Install page as app**.
- A traditional Windows `.exe` is a later packaging step using Tauri; it is not included in this starter ZIP.

## Offline behavior and important limitations
- The app can create and keep new or edited transactions locally while offline, then upload pending records when online and signed in.
- Offline deletion of an already-synced cloud record is deliberately blocked in this starter version to avoid losing the deletion when the device reconnects.
- This starter does not yet merge simultaneous edits made on multiple devices. For important financial records, sync and verify before clearing browser storage.
- The first login and authentication require internet access.
- The service worker caches the app shell, not Supabase account data.

## Suggested next development steps
1. Add a dedicated admin role and invitation-only user management.
2. Add robust offline deletion queue and conflict resolution.
3. Add category management, monthly budgets, reports and CSV/PDF export.
4. Add Tauri Windows installer and app icons.
5. Add automated tests and backup/export workflow.
