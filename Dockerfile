FROM node:16-alpine
LABEL maintainer="centerofci.org"

ARG workdir="/mathesar-update"

RUN mkdir -p $workdir && \
    chown -R node:node $workdir

WORKDIR $workdir

COPY index.js index.js
COPY LICENSE LICENSE
COPY package.json package.json

RUN npm install

CMD ["node", "index"]
