# Development Dockerfile for Next.js Frontend
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3500

# Set environment variables
ENV PORT=3500
ENV HOSTNAME="0.0.0.0"

# Start the application in development mode
CMD ["npm", "run", "dev", "--", "-p", "3500"]
