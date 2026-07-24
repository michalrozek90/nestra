import 'dotenv/config';

import { connect } from 'node:net';

const API_HOST = '127.0.0.1';
const CHECK_INTERVAL_MS = 1_000;
const CONNECTION_TIMEOUT_MS = 1_000;
const STARTUP_TIMEOUT_MS = 30_000;
const RECOVERY_TIMEOUT_MS = 15_000;

const configuredApiPort = process.env.API_PORT ?? '3000';
const apiPort = Number(configuredApiPort);
const startedAtMs = Date.now();
let lastAvailableAtMs;

if (
  !/^\d+$/.test(configuredApiPort) ||
  !Number.isInteger(apiPort) ||
  apiPort < 1 ||
  apiPort > 65_535
) {
  process.stderr.write('API_PORT must be an integer between 1 and 65535.\n');
  process.exitCode = 1;
} else {
  await monitorApiPort(apiPort);
}

async function isApiAvailable(apiPort) {
  return new Promise((resolve) => {
    const socket = connect({
      host: API_HOST,
      port: apiPort,
    });
    let isSettled = false;

    const finishCheck = (isAvailable) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      socket.destroy();
      resolve(isAvailable);
    };

    socket.setTimeout(CONNECTION_TIMEOUT_MS);
    socket.once('connect', () => finishCheck(true));
    socket.once('error', () => finishCheck(false));
    socket.once('timeout', () => finishCheck(false));
  });
}

async function monitorApiPort(apiPort) {
  while (true) {
    const checkedAtMs = Date.now();

    if (await isApiAvailable(apiPort)) {
      lastAvailableAtMs = checkedAtMs;
    } else {
      const unavailableDurationMs = checkedAtMs - (lastAvailableAtMs ?? startedAtMs);
      const allowedUnavailableDurationMs =
        lastAvailableAtMs === undefined ? STARTUP_TIMEOUT_MS : RECOVERY_TIMEOUT_MS;

      if (unavailableDurationMs >= allowedUnavailableDurationMs) {
        const failureDescription =
          lastAvailableAtMs === undefined ? 'did not become available' : 'remained unavailable';

        process.stderr.write(
          `API ${failureDescription} at ${API_HOST}:${apiPort} for ${allowedUnavailableDurationMs}ms.\n`,
        );
        process.exitCode = 1;
        return;
      }
    }

    await new Promise((resolve) => {
      setTimeout(resolve, CHECK_INTERVAL_MS);
    });
  }
}
