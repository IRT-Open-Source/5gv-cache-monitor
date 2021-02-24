FROM node:latest
WORKDIR /usr/monitor
COPY ./*.json ./
RUN npm install
RUN npm i -g @nestjs/cli
