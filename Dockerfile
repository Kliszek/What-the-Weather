FROM node:18-alpine

RUN mkdir -p /home/app

COPY package.json package-lock.json ./

RUN npm i --production

COPY ./dist /home/app

CMD ["node", "/home/app/main.js"]