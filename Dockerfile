FROM node:18-alpine as builder

ENV NODE_ENV build

WORKDIR /home/node

COPY . /home/node

RUN npm ci \
    && npm run build \
    && npm prune --production

# ---

FROM node:18-alpine

RUN mkdir -p /home/app

COPY --from=builder /home/node/package*.json ./

RUN npm ci

COPY --from=builder /home/node/dist /home/app

CMD ["node", "/home/app/main.js"]