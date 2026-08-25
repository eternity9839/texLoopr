FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
