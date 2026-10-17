FROM node:18-alpine

WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

WORKDIR /app
COPY client ./client
COPY server ./server

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app/server
CMD ["node", "src/server.js"]
