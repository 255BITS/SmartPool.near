# Shared trust stage: dependency downloads AND the final runtime need the fix.
# Alpine's 2026-10-20 update removes the compromised emSign/AAA root paths.
FROM node:22.23.4-alpine3.23@sha256:6abbcf5dd6b231da109bcde1181db1d92bf78015ae1a9514d9807c1f857869db AS trusted
RUN apk add --no-cache 'ca-certificates>=20261020-r0' && update-ca-certificates
ENV NODE_OPTIONS="--use-openssl-ca" \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt \
    SSL_CERT_DIR=/etc/ssl/certs \
    npm_config_cafile=/etc/ssl/certs/ca-certificates.crt \
    npm_config_strict_ssl=true

# Stage 1: Build the app
FROM trusted AS builder

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
FROM trusted

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
