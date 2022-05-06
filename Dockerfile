FROM node:16-alpine
LABEL maintainer="requarks.io"

RUN mkdir -p /wiki-update && \
    chown -R node:node /wiki-update

WORKDIR /wiki-update

COPY index.js index.js
COPY LICENSE LICENSE
COPY package.json package.json

RUN npm install

CMD ["node", "index"]