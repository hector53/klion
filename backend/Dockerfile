# Multi-stage Dockerfile for NestJS Backend
# Supports both development and production

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Install dependencies for bcrypt native build
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies for bcrypt
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy init-db scripts (needed for Docker volume mount)
COPY init-db ./init-db

# Expose port
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production

# Start the production server
CMD ["node", "dist/main.js"]

# ============================================
# Stage 4: Development (default for docker-compose.yml)
# ============================================
FROM node:22-alpine AS development

WORKDIR /app

# Install dependencies for bcrypt native build
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Set development environment
ENV NODE_ENV=development

# Start the development server with hot reload
CMD ["npm", "run", "start:dev"]
