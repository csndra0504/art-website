# Checkout API. Build from the repo root, not from server/:
#
#   docker build -f server/Dockerfile .
#
# The root context is so the API can share code with the site — the shipping
# rules in src/lib/shipping.ts are used by both (CAS-41).
FROM node:22-alpine

WORKDIR /srv
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/src ./server/src
# The shipping rules are shared with the site, and imported from src/lib.
COPY src/lib/shipping.ts ./src/lib/shipping.ts
# Node decides ESM vs CommonJS from the nearest package.json, and the shared
# file sits outside server/. Without this it would load as CommonJS and fail.
RUN echo '{"type":"module"}' > package.json

# Never run as root inside the container.
USER node
EXPOSE 3001

# No build step: Node runs the TypeScript directly. The flag is a no-op on
# Node 22.18+, where type stripping is on by default, and keeps older 22.x working.
CMD ["node", "--experimental-strip-types", "--no-warnings", "server/src/index.ts"]
