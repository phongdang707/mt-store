FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN npm install -g npm@11

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS dev
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM base AS prod
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/seed ./seed
EXPOSE 3000
CMD ["node", "--max-old-space-size=256", "dist/main.js"]
