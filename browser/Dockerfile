# The bench's browser (D-16).
#
# Chromium and its system libraries come from the official Playwright image, so
# nothing here installs a browser by hand. This image exists only in the bench:
# intelcost-app-react has no Playwright dependency and its Dockerfile is untouched.
#
# The tag and the npm version are pinned together and must move together: the image
# ships one browser build, and the client refuses any other. "latest" is not a
# version — it resolved to v1.46.1 while npm installed 1.63.0, and the launch failed
# telling us so.

# Base images are pinned by digest and there is no "# syntax=" line (D-841): Docker's own Dockerfile frontend
# reads this file (its cache mounts included), so a build with its bases already present reaches no registry. The
# tag beside each digest says what it is; move both together.
FROM mcr.microsoft.com/playwright:v1.46.1-jammy@sha256:02810c978d5396bf382ab6015c25ad6bed9e39f4a41c5b9c829e9fea439274e2

WORKDIR /drive

# Dependencies live at /drive, one level above the scripts, so the bind mount over
# /drive/scripts cannot shadow them with a host install. Same rule as the app image.
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copied so the image runs on its own, then shadowed by the mount in compose.
COPY . ./scripts/

# Nothing by default. A pass names its script:
#   docker compose --profile browser run --rm browser node scripts/f2-s3.mjs
CMD ["node", "--version"]
