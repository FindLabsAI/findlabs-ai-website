# FindLabs AI Employee

Production-style lead generation website and interactive order wizard for FindLabs AI. The app explains company-specific AI employees, collects an AI Employee Blueprint, stores submissions locally, and optionally sends SMTP notifications.

## Installation

```bash
npm install
```

## Environment Configuration

Copy `.env.example` to `.env` and fill in values as needed.

```bash
PORT=3000
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=FindLabs AI
SMTP_REQUIRE_TLS=true
NOTIFICATION_EMAIL=founder@findlabs.org
```

No credentials are committed or exposed to frontend code.

## Local Development

```bash
npm run dev
```

For a production-style local run:

```bash
npm start
```

Then open `http://localhost:3000`.

## Project Structure

```text
findlabs-ai-employee/
  package.json
  server.js
  .env.example
  .gitignore
  README.md
  data/
  public/
    index.html
    style.css
    app.js
    assets/
```

## Submissions

`POST /api/employee-requests` validates and normalizes each request, generates a unique request ID, adds a submitted timestamp, and stores the record in `data/employee-requests.json`.

The data file is created automatically if missing. Writes are queued and use a temporary file rename to reduce the risk of data corruption during concurrent submissions.

## SMTP Notifications

When SMTP variables are configured, the server sends:

- A full AI Employee Blueprint to `NOTIFICATION_EMAIL` or `founder@findlabs.org`
- A confirmation email to the client

`NOTIFICATION_EMAIL` can contain one address or multiple comma-separated addresses. Admin lead emails include contact name, email, phone, company details, all selected form answers, and the "Other" text details. The admin email uses the prospect as `Reply-To`, so replying from the inbox goes directly to the person who submitted the form.

When SMTP is not configured, the request still saves successfully, the server logs a warning, and the frontend shows that email notification is pending.

## Security Notes

- Helmet sets security headers and a restrictive content security policy.
- JSON and URL-encoded request bodies are size-limited.
- The submission endpoint has basic rate limiting.
- Inputs are validated, trimmed, normalized, and escaped before storage.
- `.env`, `node_modules/`, and `data/*.json` are ignored by Git.
- The site avoids unsupported compliance claims and absolute security promises.

## Deploy Later

For deployment, set production environment variables in the hosting platform, configure persistent storage or a database, enable HTTPS, configure SMTP credentials, and place the Node process behind a managed reverse proxy or platform runtime.

## Current Limitations

- Version 1 stores submissions in a local JSON file instead of a database.
- There is no admin dashboard.
- SMTP delivery depends on the configured provider.
- CAPTCHA and advanced fraud protection are not included yet.
