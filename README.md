# CELPIP Grammar Daily Study MVP

This app is prepared for **non-technical Windows use**.

## ✅ First time (only once)
1. Install **Node.js LTS** from https://nodejs.org/
2. Double-click **`FIRST_SETUP.bat`**
3. Wait for setup to finish
4. The app opens automatically in your browser

That’s it.

---

## ✅ Daily use
- Double-click **`OPEN_APP.vbs`** (recommended, less terminal pop-up)
- Or double-click **`OPEN_APP.bat`**
- The app opens at: http://localhost:3000

---

## ✅ Stop the app
- Double-click **`CLOSE_APP.bat`**

If needed, you can also close it from Task Manager (`node.exe` / command window).

---

## If Node.js is missing
- The scripts will show an error message.
- Install Node.js LTS from https://nodejs.org/
- Then run `FIRST_SETUP.bat` again.

---

## What these launchers do
### FIRST_SETUP.bat
- Checks Node.js
- Creates `.env` from `.env.example` if needed
- Runs:
  - `npm install`
  - `npx prisma generate`
  - `npx prisma migrate dev --name init`
  - `npx prisma db seed`
- Creates desktop shortcuts
- Opens the app

### OPEN_APP.bat / OPEN_APP.vbs
- Starts the app in the background (minimized)
- Opens your browser automatically

### CLOSE_APP.bat
- Stops the started app process
- Fallback: tries to stop the process listening on port 3000

> Limitation: Windows cannot always guarantee a perfect one-click close for every terminal/process variation. `CLOSE_APP.bat` uses PID tracking first, then a safe port-3000 fallback.

---

## Manual PowerShell commands (optional)
If you prefer commands:

```powershell
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

---

## Quick app test checklist
1. Dashboard loads
2. Start today’s session
3. Submit objective exercise
4. Submit mini production
5. Check feedback card
6. Open results page
7. Open topics page
8. Run manual practice
9. Export progress
10. Import progress
11. Update settings


---

## Where to check content coverage
- Open `/settings`
- Scroll to **Content Coverage Audit**
- Review total counts, per-topic table, and warnings

---

## Sync this Codex project to GitHub (so you can download it there)
If your repo has no remote yet, run these commands from the project folder:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin work
```

After that, your future updates can be pushed with:

```bash
git push
```

If you need to pull new commits from GitHub back into Codex:

```bash
git fetch origin
git pull origin work
```

---

## Windows troubleshooting (setup/startup/blank page)

### Where logs are stored
- `logs/setup.log`
- `logs/setup-error.log`
- `logs/app.log`
- `logs/app-error.log`
- `logs/doctor.log`
- `logs/doctor-error.log`

### Run diagnostics
- Double-click `DOCTOR.bat`
- It checks Node/npm, `.env`, Prisma generate/validate, DB file, port 3000, and a short startup test.
- It prints PASS/FAIL and saves full details in `logs/`.

### Common first-run failures
1) **Prisma generate/validate fails**
- Run `DOCTOR.bat` and open `logs/doctor-error.log`.
- Confirm Node LTS is installed.
- Re-run `FIRST_SETUP.bat`.

2) **`localhost:3000` opens blank page**
- Check `logs/app-error.log` first.
- Run `DOCTOR.bat` and verify port/listen checks.
- Close old processes with `CLOSE_APP.bat`, then open again using `OPEN_APP.bat`.

3) **Port 3000 already in use**
- Run `CLOSE_APP.bat`.
- Re-run `OPEN_APP.bat`.
- If still blocked, use Task Manager to close the process shown by `DOCTOR.bat`.
