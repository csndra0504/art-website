# -- Build stage --
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SANITY_PROJECT_ID
ARG VITE_SANITY_DATASET=production
ARG VITE_POSTHOG_PROJECT_TOKEN
ARG VITE_POSTHOG_HOST

# The prerender build now fetches artwork slugs + page data from Sanity at build
# time, so these must be real env vars for the build process (ARG alone leaves
# them out of some tool environments). Without them no artwork pages prerender.
ENV VITE_SANITY_PROJECT_ID=$VITE_SANITY_PROJECT_ID \
    VITE_SANITY_DATASET=$VITE_SANITY_DATASET \
    VITE_POSTHOG_PROJECT_TOKEN=$VITE_POSTHOG_PROJECT_TOKEN \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST

RUN npm run build

# -- Production stage --
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
