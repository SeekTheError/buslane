FROM node:8.8.1-alpine

COPY package.json /tmp/package.json
USER node
RUN cd /tmp/ && npm i

# Create app directory
RUN mkdir -p /home/node/app
RUN mv /tmp/node_modules /home/node/app/node_modules

# Bundle app source
COPY . /home/node/buslane
WORKDIR /home/node/buslane

CMD npm run integration
