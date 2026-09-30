# Akari website and admin handoff

## What lives where

Both applications are in [hejrafa/AkariWebsite](https://github.com/hejrafa/AkariWebsite).

| Service | Code | Production | Deployment |
| --- | --- | --- | --- |
| Public website, beta page, privacy and terms | Repository root, `try/`, `privacy/`, `terms/` | https://joinakari.com | GitHub Pages; every push to `main` |
| Food-feedback dashboard | `feedback-worker/public/` | https://admin.joinakari.com | Cloudflare Worker; separate deployment |
| Login and food-feedback API | `feedback-worker/src/index.ts` | https://api.joinakari.com | Same Worker as the admin dashboard |
| Feedback database | `feedback-worker/migrations/` | Cloudflare D1, `akari-food-feedback` | Apply pending migrations separately |

The Worker is named `akari-food-feedback`. Its domains and database binding are recorded in `feedback-worker/wrangler.jsonc`.

## Access for a co-maintainer

There are three independent kinds of access:

1. **Admin login:** the person's own email and generated password, supplied privately. This lets them review and update food feedback. It does not grant code or deployment access.
2. **GitHub collaborator:** the repository owner can open [Settings → Collaborators](https://github.com/hejrafa/AkariWebsite/settings/access), choose **Add people**, and invite the person's GitHub account or email. They must accept the invitation to push changes. The repository is currently public, so reading and cloning require no invitation. [GitHub invitation instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository).
3. **Cloudflare member:** invite the person's own Cloudflare account and grant **Editor** for the existing `akari-food-feedback` Worker. Also grant the D1 permissions needed to manage its database if they will apply migrations. Changing domains/routes additionally requires **Workers Routes Write** for `joinakari.com`; deploying code to an already configured Worker only requires Worker Editor access. [Cloudflare roles and scopes](https://developers.cloudflare.com/workers/authorization/workers/).

Share the generated admin login through a password-manager share. Each maintainer should sign in to GitHub and Cloudflare using their own account. No personal GitHub token, Cloudflare login, or existing owner's admin password needs to be handed over.

For shared ownership later, consider moving the repository to a company GitHub organization. A personal repository has one owner; collaborator access is sufficient for day-to-day development. [GitHub repository permission levels](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository).

## Start locally

Install Git, Python 3, Node.js 24 or later, and pnpm. Then:

```sh
git clone https://github.com/hejrafa/AkariWebsite.git
cd AkariWebsite
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000 for the public website.

In a second terminal, from the repository:

```sh
cd feedback-worker
pnpm install --frozen-lockfile
pnpm migrate:local
pnpm dev --ip 127.0.0.1
```

Open http://127.0.0.1:8791 for the admin dashboard. The development server listens on port 8791 (set in `wrangler.jsonc`), which is where the simulator build of the app sends food feedback. Local development uses a local D1 database and bypasses login on localhost; keep the development server bound to your own machine. Production passwords and production feedback are not required for local development.

## Make and deploy changes

Use a feature branch and a pull request so both founders can review changes.

```sh
git switch -c your-name/describe-the-change
```

### Public website

Preview the edited pages locally, then merge the pull request into `main`. The [Deploy Akari Website workflow](https://github.com/hejrafa/AkariWebsite/actions/workflows/pages.yml) publishes the public site automatically. Check that its latest run succeeds.

### Admin dashboard and API

From `feedback-worker/`:

```sh
pnpm check
pnpm test
pnpm exec wrangler login
```

After merging the change, pull the current `main`. If the change contains a database migration, inspect it, verify the target database, and apply it before deploying code that needs it:

```sh
pnpm exec wrangler d1 migrations list akari-food-feedback --remote
pnpm migrate:remote
```

Then deploy:

```sh
pnpm deploy
```

The website's GitHub Pages workflow does **not** deploy the Worker. Check https://api.joinakari.com/health, then sign in at https://admin.joinakari.com and confirm reports load. A health response verifies the Worker is running; loading reports also verifies the database binding.

If a database command reports that the account is unauthorized, check the signed-in Cloudflare account and its D1 permissions. Do not create a replacement database or alter the configured database ID to work around an access error.

## Admin account management

The original owner uses the existing `ADMIN_EMAIL` variable and `ADMIN_PASSWORD_HASH` secret. `SESSION_SECRET` signs login sessions. Additional accounts live in the encrypted `ADDITIONAL_ADMINS` Worker secret as a JSON list of email addresses and salted password hashes. Account changes need no database migration.

Generate an additional login from `feedback-worker/`:

```sh
pnpm admin:create colleague@example.com
```

This writes the complete account list to `~/.config/akari/admin-users.json` and the new login to a separate private text file in the same directory. It prints their locations, without printing the password. The generator uses Node's cryptographic random source and PBKDF2-SHA256 for the password hash; runtime tests cover signing in and revoking sessions.

Before changing additional accounts on another computer, restore the **current complete** `admin-users.json` from the founders' shared password manager. Cloudflare does not return stored secret values. Uploading a new list replaces the entire `ADDITIONAL_ADMINS` secret, so an incomplete list would remove other co-maintainers' access.

Upload the updated list:

```sh
pnpm exec wrangler secret put ADDITIONAL_ADMINS < "$HOME/.config/akari/admin-users.json"
```

Keep the updated list in the shared password manager. Share only the intended person's login details with that person.

To rotate a password, run `pnpm admin:create colleague@example.com --rotate`, then upload the complete account list again. To revoke an additional account, remove its entry from the private JSON list and upload the remaining list (or `[]` if empty). Removing an account or rotating its password invalidates its existing sessions. Sessions expire after eight hours. There is no email invitation or self-service password-reset flow; changes are maintained through this process.

The repository is public. GitHub Pages serves only the allowlisted public files staged in `.github/workflows/pages.yml`; add new public files or directories there. Keep passwords, tokens, private account lists, and production feedback exports outside the repository. The account generator defaults to a private directory outside the checkout.

### Rotate the owner password

The owner login is `ADMIN_EMAIL` with the `ADMIN_PASSWORD_HASH` secret. Generate a new password and hash from `feedback-worker/`:

```sh
pnpm admin:create --owner
```

This writes the new login to `~/.config/akari/admin-login-owner.txt` and prints the PBKDF2 hash together with the exact upload command, `printf '%s' '<hash>' | pnpm exec wrangler secret put ADMIN_PASSWORD_HASH`. It does not change `admin-users.json`. The previous owner password stops working as soon as the secret is uploaded, so store the new login in the password manager first. No deploy is needed for a secret change.
