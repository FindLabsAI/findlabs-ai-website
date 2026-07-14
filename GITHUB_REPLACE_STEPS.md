# Replace the old GitHub repo files

Use this when the GitHub repository already has old website files and you want the new FindLabs AI site to fully replace them.

## Files to upload

Use the contents of:

`C:\Users\Anurag\Documents\Hire_AI_Employee\findlabs-ai-employee-github-upload`

Do not upload:

- `node_modules`
- `.env`
- `data/employee-requests.json`
- old website files

## Best method: github.dev editor

1. Open the repo:
   `https://github.com/FindLabsAI/findlabs-ai-website`
2. Press the `.` key on your keyboard.
3. GitHub will open the repo in the browser editor.
4. In the file explorer, delete all old files.
5. Drag the new files/folders from:
   `C:\Users\Anurag\Documents\Hire_AI_Employee\findlabs-ai-employee-github-upload`
   into the browser editor.
6. Confirm the new root files include:
   - `package.json`
   - `package-lock.json`
   - `server.js`
   - `public/`
   - `render.yaml`
   - `Procfile`
   - `.env.example`
   - `.gitignore`
   - `README.md`
   - `DEPLOYMENT.md`
7. Commit the changes with a message like:
   `Replace old website with FindLabs AI employee site`

## Alternative: GitHub web upload

The normal GitHub `Add file -> Upload files` page does not remove old files. If you use it, delete old files first, otherwise old content may remain in the repository.

## After GitHub is updated

Deploy from Render using the GitHub repo:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Then connect:

- `findlabs.org`
- `www.findlabs.org`
