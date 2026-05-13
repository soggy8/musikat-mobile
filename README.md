# Musikat

Musikat is a learning project for mobile app development: an Expo React Native app that streams music from a Navidrome server through a Python FastAPI backend.

## Project Layout

- `apps/mobile`: Expo React Native app with login, library/search, album detail, and player screens.
- `services/api`: FastAPI backend that authenticates with Navidrome's Subsonic-compatible API and proxies metadata, cover art, and audio streams.

## Backend Setup

```bash
cd services/api
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
uvicorn app.main:app --reload
```

The backend runs on `http://localhost:8000` by default. On a physical phone, use your computer's LAN IP instead of `localhost` when entering the backend URL in the app.

## Mobile Setup

```bash
cd apps/mobile
npm install
npm run android
```

You can also run `npm run ios` on macOS or `npm run web` for a quick browser smoke test.

## First MVP Flow

1. Start the FastAPI backend.
2. Start the Expo app.
3. Enter the backend URL, your Navidrome server URL, username, and password.
4. The backend validates the credentials with Navidrome `ping`, then stores a local app session.
5. Browse artists, search albums/tracks, open an album, and stream a track through the backend proxy.

## Useful Checks

```bash
cd services/api
. .venv/bin/activate
pytest

cd ../../apps/mobile
npm run lint
npx tsc --noEmit
```
