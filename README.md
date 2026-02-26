# Cass Art

Portfolio website built with React, Vite, Mantine, and Sanity CMS.

## Development

```bash
npm install
npm run dev          # runs app (port 5173) + studio (port 3333)
npm run dev:app      # app only
```

Copy `.env.example` to `.env` and `studio/.env.example` to `studio/.env` with your Sanity credentials.

## Deployment

Merging to `main` triggers a GitHub Actions workflow that:

1. **Builds** the Docker image and pushes it to GitHub Container Registry (GHCR)
2. **Deploys the app** by SSHing into the droplet, pulling the image, and restarting the container
3. **Deploys Sanity Studio** to Sanity's hosted platform

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `VITE_SANITY_PROJECT_ID` | Sanity project ID |
| `VITE_SANITY_DATASET` | Sanity dataset (e.g. `production`) |
| `SANITY_AUTH_TOKEN` | Sanity auth token with deploy permissions |
| `DROPLET_HOST` | Droplet IP address |
| `DROPLET_USER` | SSH user (e.g. `root`) |
| `DROPLET_SSH_KEY` | SSH private key for the droplet |

### Manual Docker build

```bash
docker build \
  --build-arg VITE_SANITY_PROJECT_ID=your-project-id \
  --build-arg VITE_SANITY_DATASET=production \
  -t cass-art .

docker run -d -p 8080:8080 --name cass-art cass-art
```

### Droplet prerequisites

The droplet needs Docker installed and must be able to pull from GHCR:

```bash
# One-time setup on the droplet — create a GitHub PAT with read:packages scope
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```
