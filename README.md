# MastiAdda: Desi Web Games Hub

A full-stack desi gaming platform featuring classic board and puzzle games including Ludo, Tic Tac Toe, Chess, Rock Paper Scissors, and 2048, with real-time multi-session cloud score sync.

## 🚀 Walkthrough: Running the Project

> Detailed instructions on how to start the frontend and backend using Docker or local Node environments can be found in our **[Walkthrough Guide](./docs/walkthrough.md)**.

---

## 🏗 Project Architecture

This application acts as a standard full-stack environment.
- **Frontend:** Built with React & Vite. Renders `Ludo`, `TicTacToe`, and `Auth` components.
- **Backend:** Node.js Express server (`/server`) exposing secure APIs.
- **Database:** Uses local SQLite inside `/server/omnidata.db` to reliably persist registered user credentials and session info.

## 🛠 Tech Stack
- **Client:** React 18, Vite, standard CSS Modules
- **Server:** Node.js, Express.js
- **Database:** SQLite3
- **DevOps:** Docker, Docker Compose

## Free public deployment (Cloudflare)

This project is ready to deploy as one Cloudflare Pages application with a free D1 database for user accounts. The games themselves run in the browser; D1 is used only for sign-up, sign-in, and sessions.

1. Create a free Cloudflare account and create a new **D1** database named `omnigames-db`.
2. In the repository root, copy `wrangler.toml.example` to `wrangler.toml` and replace the placeholder database ID with the ID Cloudflare shows for the new database.
3. Apply the schema: `npx wrangler d1 execute omnigames-db --remote --file=db/schema.sql`.
4. Push this repository to GitHub, then in Cloudflare select **Workers & Pages → Create → Pages → Connect to Git**. Use `npm run build` as the build command and `dist` as the output directory.
5. In the Pages project's **Settings → Bindings**, add the D1 database with variable name `DB`. In **Settings → Variables and Secrets**, add a secret named `JWT_SECRET` with a long random value.
6. Deploy. Cloudflare assigns a free `*.pages.dev` address. No custom domain is required.

For local development, run the API server on port 3001 and `npm run dev`; Vite forwards `/api` requests to the API automatically.
