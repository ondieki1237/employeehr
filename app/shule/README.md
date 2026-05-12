Shule — Lightweight school module (demo)

Overview
--------
This folder contains a minimal, self-contained school frontend that runs inside the main Next.js app at `/shule`.

How it works
------------
- Uses `localStorage` to persist schools (`orgs`) and users for a quick demo. No backend required.
- Routes:
  - `/shule` — landing page
  - `/shule/signup` — create school + manager account
  - `/shule/login` — login with `slug`, `email`, `password`
  - `/shule/dashboard` — redirects to role-specific dashboard

Notes
-----
- This is a scaffold and uses plaintext passwords in localStorage for demo purposes only. For production integrate with your server and proper hashing.
