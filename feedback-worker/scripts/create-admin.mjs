import { pbkdf2Sync, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const rotate = args.includes("--rotate");
const owner = args.includes("--owner");
const positional = args.filter((arg) => arg !== "--rotate" && arg !== "--owner");
const usage = "Usage: pnpm admin:create EMAIL [PRIVATE_DIRECTORY] [--rotate]\n       pnpm admin:create --owner [PRIVATE_DIRECTORY]";
if (owner && (rotate || positional.length > 1)) throw new Error(usage);
const email = owner ? undefined : positional[0]?.trim().toLowerCase();
if (!owner && (!email || email.length > 320 || !/^[\x21-\x7e]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.split("@").length !== 2 || positional.length > 2)) {
  throw new Error(usage);
}

const directory = resolve(positional[owner ? 0 : 1] || join(homedir(), ".config", "akari"));
mkdirSync(directory, { recursive: true, mode: 0o700 });
const repository = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
const fromRepository = relative(repository, realpathSync(directory));
if (!fromRepository || (!fromRepository.startsWith("..") && !isAbsolute(fromRepository))) {
  throw new Error("Keep admin credentials outside the repository: its files are published as a website.");
}
chmodSync(directory, 0o700);

function createPasswordHash() {
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return { password, passwordHash: `pbkdf2-sha256:100000:${salt.toString("hex")}:${hash}` };
}

if (owner) {
  // The owner's email is the ADMIN_EMAIL variable; only the ADMIN_PASSWORD_HASH secret changes.
  const ownerEmail = JSON.parse(readFileSync(resolve(repository, "feedback-worker", "wrangler.jsonc"), "utf8")).vars.ADMIN_EMAIL;
  const { password, passwordHash } = createPasswordHash();
  const credentialsPath = join(directory, "admin-login-owner.txt");
  writeFileSync(credentialsPath, `Akari admin login (owner)\n\nURL: https://admin.joinakari.com/login\nEmail: ${ownerEmail}\nPassword: ${password}\n\nStore this login in your password manager.\n`, { mode: 0o600 });
  chmodSync(credentialsPath, 0o600);
  console.log(`Private login details: ${credentialsPath}`);
  console.log(`Owner password hash: ${passwordHash}`);
  console.log("Upload it from feedback-worker/ with:");
  console.log(`  printf '%s' '${passwordHash}' | pnpm exec wrangler secret put ADMIN_PASSWORD_HASH`);
  console.log("The previous owner password stops working as soon as the secret is uploaded; admin-users.json is unchanged.");
  process.exit(0);
}

const accountsPath = join(directory, "admin-users.json");
const accounts = existsSync(accountsPath) ? JSON.parse(readFileSync(accountsPath, "utf8")) : [];
const pattern = /^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/u;
if (!Array.isArray(accounts) || accounts.some((account) => !account || typeof account.email !== "string" || !pattern.test(account.passwordHash))) {
  throw new Error("The saved admin account list is invalid. Restore it before creating another account.");
}
const existingIndex = accounts.findIndex((account) => account.email.toLowerCase() === email);
if (existingIndex >= 0 && !rotate) throw new Error("That account already exists. Use --rotate to replace its password.");
const { password, passwordHash } = createPasswordHash();
const account = { email, passwordHash };
if (existingIndex >= 0) accounts[existingIndex] = account;
else accounts.push(account);

const credentialsPath = join(directory, `admin-login-${email.replace(/[^a-z0-9.-]/gu, "_")}.txt`);
writeFileSync(credentialsPath, `Akari admin login\n\nURL: https://admin.joinakari.com/login\nEmail: ${email}\nPassword: ${password}\n\nStore this login in your password manager.\n`, { mode: 0o600 });
chmodSync(credentialsPath, 0o600);
writeFileSync(accountsPath, JSON.stringify(accounts, null, 2) + "\n", { mode: 0o600 });
chmodSync(accountsPath, 0o600);
console.log(`Private account list: ${accountsPath}`);
console.log(`Private login details: ${credentialsPath}`);
console.log("Upload the complete account list with: pnpm exec wrangler secret put ADDITIONAL_ADMINS < PRIVATE_ACCOUNT_LIST");
console.log("Keep a shared password-manager copy of the complete account list before another maintainer changes it.");
