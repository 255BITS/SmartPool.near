# Stage 1: Build the app
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all application files, including the prisma directory
COPY . .

# Build the app
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Prune non-production dependencies
RUN npm prune --production

# Stage 2: Create the production image
FROM node:18-alpine

WORKDIR /app

# Copy necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Add the migration and start command
CMD ["sh", "-c", "npm run migrate && npm start"]

# Expose the necessary port
EXPOSE 8254
