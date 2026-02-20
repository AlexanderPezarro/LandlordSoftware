# syntax = docker/dockerfile:1

# Application image - extends base image with source code and build
# Used for both production and PR preview deployments

FROM registry.fly.io/landlordsoftware-base:latest

WORKDIR /app

# Copy application source (includes docker-entrypoint.js)
COPY . .

# Build application
RUN npm run build

# Ensure entrypoint is executable
RUN chmod +x /app/docker-entrypoint.js

ENTRYPOINT ["/app/docker-entrypoint.js"]
CMD ["npm", "run", "start"]
