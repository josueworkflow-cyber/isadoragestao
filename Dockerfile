# Use Node.js LTS
FROM node:24-slim AS base

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy root package.json
COPY package.json ./

# Setup backend
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./

# IMPORTANT: Copy prisma directory BEFORE npm install so that the 
# postinstall script (prisma generate) has the schema file available.
COPY backend/prisma/ ./prisma/

RUN npm install

# Copy backend source code
COPY backend/ ./

# Copy frontend (static files)
WORKDIR /app/frontend
COPY frontend/ ./

# Final production image
FROM node:24-slim

# Install OpenSSL in the final image as well (required by Prisma Client)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy the entire app from the base stage
COPY --from=base /app /app

CMD ["sh", "-c", "cd /app/backend && npx prisma migrate deploy && node src/server.js"]
