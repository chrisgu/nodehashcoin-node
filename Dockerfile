FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
COPY src ./src
COPY test ./test
COPY tsconfig.json ./
RUN npm install
ENV NHC_PORT=18732
EXPOSE 18732
CMD ["npx", "tsx", "src/cli.ts"]
