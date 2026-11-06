# Harshini Employee Leave Management System

## GitHub Pages frontend
The frontend files (`index.html`, other HTML pages, `css/`, `js/`, and `images/`) are placed at this folder's root so GitHub Pages can find `/index.html`.

Upload these frontend items to the root of the repository used by:
https://vharshini2019-source.github.io/

Upload:
- `index.html` and all other `.html` files
- `css/`
- `js/`
- `images/`

Do NOT upload `backend-source/` to the GitHub Pages root. Keep it safely as the Node.js backend source for separate deployment.

## Important: backend
GitHub Pages hosts static files only. The Node.js/Express backend is preserved in `backend-source/`, but GitHub Pages cannot run it. Login, registration, leave requests, and database/API functions require deploying the backend separately to a Node.js hosting service and then configuring the frontend API URLs to that backend URL.

The frontend currently calls relative endpoints such as `/api/auth/login` and `/api/leaves/my`. These will return 404 on GitHub Pages until a backend is deployed and the API URLs are updated.

## GitHub Pages setup
1. Extract this ZIP.
2. Open the extracted `Harshini-GitHub-Pages-Ready` folder.
3. Upload the listed frontend files/folders directly into the repository root (not the outer folder).
4. Commit/push the changes.
5. In GitHub: Settings -> Pages -> Deploy from a branch -> `main` -> `/ (root)` -> Save.
