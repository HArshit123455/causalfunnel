FROM node:20-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json   packages/shared/package.json
COPY packages/tracker/package.json  packages/tracker/package.json
COPY packages/backend/package.json  packages/backend/package.json
RUN npm install --workspaces --include-workspace-root
COPY packages/shared  packages/shared
COPY packages/tracker packages/tracker
COPY packages/backend packages/backend
COPY demo demo
RUN npm run build -w @causalfunnel/tracker
RUN npm run build -w @causalfunnel/backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/package.json /repo/package-lock.json ./
COPY --from=builder /repo/packages/shared        /app/packages/shared
COPY --from=builder /repo/packages/tracker/dist  /app/packages/tracker/dist
COPY --from=builder /repo/packages/tracker/package.json /app/packages/tracker/package.json
COPY --from=builder /repo/packages/backend/dist  /app/packages/backend/dist
COPY --from=builder /repo/packages/backend/package.json /app/packages/backend/package.json
COPY --from=builder /repo/demo /app/demo
RUN npm install --omit=dev --workspaces --include-workspace-root
EXPOSE 4000
WORKDIR /app/packages/backend
CMD ["node", "dist/index.js"]
