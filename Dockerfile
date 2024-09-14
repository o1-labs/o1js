FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt update
RUN apt install -y git bzip2

WORKDIR /app

ADD pnpm-lock.yaml pnpm-lock.yaml
ADD package.json package.json
#ADD package-lock.json package-lock.json
ADD tsconfig.examples.json tsconfig.examples.json
ADD tsconfig.json tsconfig.json
ADD tsconfig.mina-signer.json tsconfig.mina-signer.json
ADD tsconfig.mina-signer-web.json tsconfig.mina-signer-web.json
ADD tsconfig.node.json tsconfig.node.json
ADD tsconfig.test.json tsconfig.test.json
ADD tsconfig.web.json tsconfig.web.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

## now the source is copied
COPY src /app/src
COPY tests /app/tests
COPY benchmark /app/benchmark
COPY jest /app/jest
COPY dune-project /app/dune-project

#RUN pnpm ci
RUN corepack enable
RUN corepack prepare pnpm@latest-9 --activate
RUN pnpm install
#    "dev": "npx tsc -p tsconfig.test.json && node src/build/copy-to-dist.js",
RUN npx tsc -p tsconfig.test.json

#RUN pnpm install "https://github.com/meta-introspector/jest.git"
#RUN pnpm install "https://github.com/meta-introspector/ts-jest.git"
#RUN pnpm install "https://github.com/meta-introspector/node-clinic-doctor"
#RUN pnpm install "https://github.com/meta-introspector/node-clinic"
RUN pnpm install -g clinic

RUN pnpm run build

#RUN apt update
#RUN apt install -y strace
run apt-get install -y linux-perf # move to top

# why is this needed?
RUN ln -s /app/dist /app/src/mina-signer/dist

# '/app/dist/node/bindings/compiled/_node_bindings/plonk_wasm.cjs' imported from /app/dist/node/bindings/js/node/node-backend.js
# found here
#./src/bindings/compiled/node_bindings/plonk_wasm.cjs
#./src/bindings/compiled/_node_bindings/plonk_wasm.cjs
#./dist/node/bindings/compiled/_node_bindings/plonk_wasm.cjs

#run apt-get update


#CMD [ "pnpm", "run", "test" ]
#RUN pnpm run test || echo skip errors

#COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist

COPY run-jest-tests.sh /app/run-jest-tests.sh
COPY jest.config.js /app/jest.config.js
COPY run-integration-tests.sh /app/run-integration-tests.sh
COPY run-unit-tests.sh /app/run-unit-tests.sh
COPY run-all-tests.sh /app/run-all-tests.sh
COPY run /app/run
COPY run-debug /app/run-debug
COPY run-minimal-mina-tests.sh /app/run-minimal-mina-tests.sh
COPY run-ci-benchmarks.sh /app/run-ci-benchmarks.sh


EXPOSE 8000
CMD [ "pnpm", "start" ]



# # Use an official Ubuntu image as a base
# #FROM ubuntu:latest
# FROM o1labs/mina-local-network:compatible-latest-devnet

# # Set the working directory to /app
# WORKDIR /app

# # Install required dependencies
# RUN apt update && apt install -y \
#     git \
#     curl \
#     npm \
#     nodejs

# # Install Node.js version 18
# RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
# RUN apt-get install -y nodejs

# # Clone the repository and checkout the specific branch
# RUN git clone https://github.com/meta-introspector/o1js.git .
# RUN git checkout 7647eb9

# # Install npm dependencies
# RUN npm ci

# # Build o1js
# RUN npm run build

# # Expose the port for the web server
# EXPOSE 8080

# # Run the command to start the web server when the container launches
# CMD ["npm", "run", "start"]

