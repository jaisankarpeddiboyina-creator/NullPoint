# NullPoint

Everything else is noise.

NullPoint is a TypeScript/Express AI agent powered by AILink SDK. The app lives in the `NullPoint/` workspace; the repository root contains the install, build, and run commands you should use for local development and deployment.

## Quick Start

```bash
npm install
cp NullPoint/.env.example NullPoint/.env
npm run dev
```

Open `http://localhost:3001`.

## Production Run

```bash
npm install
npm run build
npm start
```

`npm start` builds the TypeScript app before launching `dist/api/server.js`.

## Commands

```bash
npm run dev          # run the API/UI server with ts-node
npm start            # build and run compiled JavaScript
npm run build        # compile TypeScript to NullPoint/dist
npm run typecheck    # validate TypeScript without emitting files
npm run cli          # run the terminal client
```

## Project Structure

```text
.
├── package.json              # root workspace scripts
├── package-lock.json         # reproducible root install
├── NullPoint/
│   ├── src/
│   │   ├── agent/            # AILink session and response shaping
│   │   ├── api/              # Express server, routes, auth, UI serving
│   │   ├── cli/              # terminal client
│   │   ├── rag/              # lightweight session memory
│   │   ├── router/           # query-to-tool-group routing
│   │   └── tools/            # public API tool registry
│   ├── scripts/diagnostics/  # manual Groq/AILink checks
│   ├── ui/                   # static web UI
│   ├── .env.example          # documented environment variables
│   └── tsconfig.json
```

## Environment

Copy `NullPoint/.env.example` to `NullPoint/.env` and set `GROQ_API_KEY`.

For local development, `NULLPOINT_AUTH=false` is fine. For a deployed instance, enable auth and set `NULLPOINT_API_KEYS` to one or more comma-separated keys.

## Diagnostics

These commands call external services and require a valid `GROQ_API_KEY`:

```bash
npm run diagnostics:groq
npm run diagnostics:ailink
npm run diagnostics:ailink-tools
```
