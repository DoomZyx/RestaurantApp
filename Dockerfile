# Backend SmartCRM - Node Fastify (API + WebSocket)
FROM node:20-alpine

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
RUN pnpm add -g pnpm@10.12.4

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "server.js"]
