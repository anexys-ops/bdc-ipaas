# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api/v1
ARG VITE_KEYCLOAK_URL=
ARG VITE_KEYCLOAK_REALM=
ARG VITE_KEYCLOAK_CLIENT_ID=

# Install dependencies (contexte frontend seul : pas de pnpm-lock.yaml → npm)
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

# Copy source files (.dockerignore exclut node_modules, dist)
COPY . .

# Build application
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV VITE_KEYCLOAK_REALM=${VITE_KEYCLOAK_REALM}
ENV VITE_KEYCLOAK_CLIENT_ID=${VITE_KEYCLOAK_CLIENT_ID}
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security: remove default nginx files
RUN rm -rf /usr/share/nginx/html/50x.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
