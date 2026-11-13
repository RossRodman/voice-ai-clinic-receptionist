# Front Desk web UI: the Vite build, served by nginx on port 80.
# nginx also proxies /api and /health to the webhook server (see nginx.conf),
# so the browser talks to one origin, exactly like the Vite dev server.
#
#   docker build -t clinic-receptionist-client client

FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
# Where the webhook server runs; overridable at `docker run`.
ENV SERVER_UPSTREAM=http://server:3000
EXPOSE 80
