# Use Node.js 20 slim image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy necessary files
COPY server.js ./
COPY prompt.txt ./
COPY public/ ./public/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run as non-root user for security
USER node

# Start the server
CMD ["node", "server.js"]
