# SAGE MVP Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript (if applicable)
RUN npm run build --if-present

# Expose port
EXPOSE 3001

# Default command
CMD ["npm", "run", "dev"]
