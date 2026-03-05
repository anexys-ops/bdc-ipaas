# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api/v1

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build application
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm build

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
