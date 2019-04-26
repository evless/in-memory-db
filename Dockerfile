FROM node:8-alpine

# Create app directory
WORKDIR /usr/src/app

COPY . ./

RUN npm install --no-package-lock

EXPOSE 8080

CMD node src/index.js