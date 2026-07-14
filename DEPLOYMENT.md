# Deployment Checklist for findlabs.org

This app is a Node/Express website with a backend API, so deploy it to a Node-capable host such as Render, Railway, Fly.io, or a VPS.

## Recommended Domain Setup

Use both:

- `findlabs.org`
- `www.findlabs.org`

Set the primary domain to `findlabs.org` and redirect `www.findlabs.org` to it, or the reverse if preferred.

## Render Setup

This project includes `render.yaml`.

1. Push this folder to a GitHub repository.
2. In Render, create a new Blueprint or Web Service from that repository.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/health`
4. Add a persistent disk mounted at `/var/data`.
5. Set environment variables:
   - `NODE_ENV=production`
   - `DATA_DIR=/var/data`
   - `NOTIFICATION_EMAIL=founder@findlabs.org`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`

## DNS

After the host creates the web service, add `findlabs.org` and `www.findlabs.org` as custom domains in the host dashboard.

The host dashboard will show the exact DNS records to add. Usually this is:

- `www` as a `CNAME` pointing to the host-provided target
- Apex/root `findlabs.org` as an `A`, `ALIAS`, or `ANAME` record depending on the DNS provider

Do not guess these records. Use the values shown by the hosting platform.

## GoDaddy DNS Steps

1. Sign in to GoDaddy.
2. Open `My Products`.
3. Find `findlabs.org`.
4. Open `DNS` or `Manage DNS`.
5. Add or update the records provided by the hosting platform.

Typical GoDaddy setup after the Node host gives you its values:

- `CNAME`
  - Name: `www`
  - Value: host-provided target, such as `your-app.onrender.com`
  - TTL: default

- Root domain record for `findlabs.org`
  - Name: `@`
  - Type/value depends on the host:
    - If the host gives IP addresses, create/update `A` records.
    - If the host supports apex aliasing, use GoDaddy forwarding or the host-recommended root-domain method.

If GoDaddy already has parked-domain records, old website records, or forwarding rules, remove conflicting `A`, `AAAA`, or `CNAME` records for `@` and `www` before adding the new host records.

DNS can take a few minutes to several hours to propagate.

## Before Going Live

- Confirm `/api/health` returns `{ "ok": true }`
- Submit a test AI Employee request
- Confirm `data/employee-requests.json` is written to persistent storage
- Configure SMTP and confirm founder/client emails send
- Delete any test submissions
- Confirm HTTPS is active
