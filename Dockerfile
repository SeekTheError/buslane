FROM node:8.8.1-alpine

COPY package.json /tmp/package.json
COPY package-lock.json /tmp/package-lock.json

RUN cd /tmp/ && NODE_ENV=dev npm i

# Create app directory
RUN mkdir -p /home/node/buslane
RUN chown -R node:node /home/node/buslane/
RUN mv /tmp/node_modules /home/node/buslane/node_modules

USER node

# Bundle app source
COPY . /home/node/buslane
WORKDIR /home/node/buslane

CMD npm run spec
