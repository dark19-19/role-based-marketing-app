function normalizeIp(remoteAddress) {
  if (!remoteAddress) return 'unknown';
  if (remoteAddress.startsWith('::ffff:')) return remoteAddress.slice('::ffff:'.length);
  if (remoteAddress === '::1') return '127.0.0.1';
  return remoteAddress;
}

function createLogger(logger) {
  if (!logger) return null;
  const warn = typeof logger.warn === 'function' ? logger.warn.bind(logger) : null;
  const error = typeof logger.error === 'function' ? logger.error.bind(logger) : null;
  return warn || error ? { warn, error } : null;
}

function applySlowlorisProtection(server, options = {}) {
  if (!server || typeof server.on !== 'function') {
    throw new Error('applySlowlorisProtection expected an http.Server instance');
  }

  const logger = createLogger(options.logger);

  const settings = {
    headersTimeoutMs: options.headersTimeoutMs ?? 6000,
    requestTimeoutMs: options.requestTimeoutMs ?? 30000,
    keepAliveTimeoutMs: options.keepAliveTimeoutMs ?? 5000,
    maxConnections: options.maxConnections ?? 10000,
    maxHeadersCount: options.maxHeadersCount ?? 200,
    maxConcurrentConnectionsPerIp: options.maxConcurrentConnectionsPerIp ?? 10,
    connectionWindowMs: options.connectionWindowMs ?? 10000,
    maxConnectionsPerIpWindow: options.maxConnectionsPerIpWindow ?? 10,
    socketIdleTimeoutMs: options.socketIdleTimeoutMs ?? 8000,
    slowMinBytes: options.slowMinBytes ?? 500,
    slowPartialIdleMs: options.slowPartialIdleMs ?? 3000,
    slowNoDataIdleMs: options.slowNoDataIdleMs ?? 4000,
    slowCheckIntervalMs: options.slowCheckIntervalMs ?? 1000,
    cleanupIntervalMs: options.cleanupIntervalMs ?? 30000,
  };

  server.keepAliveTimeout = settings.keepAliveTimeoutMs;
  server.headersTimeout = Math.max(settings.headersTimeoutMs, settings.keepAliveTimeoutMs + 1000);
  server.requestTimeout = settings.requestTimeoutMs;
  server.maxConnections = settings.maxConnections;
  server.maxHeadersCount = settings.maxHeadersCount;

  const ipState = new Map();
  const lastLogAt = new Map();
  const socketCleanup = new WeakMap();
  const socketTimeoutHandler = new WeakMap();

  function shouldLog(ip, now, minIntervalMs = 1000) {
    const last = lastLogAt.get(ip) || 0;
    if (now - last < minIntervalMs) return false;
    lastLogAt.set(ip, now);
    return true;
  }

  function getIpState(ip) {
    const existing = ipState.get(ip);
    if (existing) return existing;
    const created = { active: 0, recent: [] };
    ipState.set(ip, created);
    return created;
  }

  function cleanupIpState() {
    const now = Date.now();
    for (const [ip, state] of ipState.entries()) {
      const recent = state.recent.filter((t) => now - t < settings.connectionWindowMs);
      state.recent = recent;
      if (state.active <= 0 && recent.length === 0) {
        ipState.delete(ip);
        lastLogAt.delete(ip);
      }
    }
  }

  const cleanupTimer = setInterval(cleanupIpState, settings.cleanupIntervalMs);
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

  function onConnection(socket) {
    const ip = normalizeIp(socket.remoteAddress);
    const now = Date.now();
    const state = getIpState(ip);

    state.recent = state.recent.filter((t) => now - t < settings.connectionWindowMs);

    if (state.active >= settings.maxConcurrentConnectionsPerIp) {
      if (logger?.warn && shouldLog(ip, now)) {
        logger.warn(`Blocking excessive concurrent connections from ${ip}`);
      }
      socket.destroy();
      return;
    }

    if (state.recent.length >= settings.maxConnectionsPerIpWindow) {
      if (logger?.warn && shouldLog(ip, now)) {
        logger.warn(`Blocking excessive connection attempts from ${ip}`);
      }
      socket.destroy();
      return;
    }

    state.active += 1;
    state.recent.push(now);

    let bytesReceived = 0;
    let lastByteTime = Date.now();

    function onData(chunk) {
      bytesReceived += chunk.length;
      lastByteTime = Date.now();
    }

    socket.on('data', onData);

    const slowCheck = setInterval(() => {
      const idleTime = Date.now() - lastByteTime;

      if (bytesReceived === 0 && idleTime > settings.slowNoDataIdleMs) {
        if (logger?.warn && shouldLog(ip, Date.now())) {
          logger.warn(`Destroying idle connection from ${ip}`);
        }
        socket.destroy();
        return;
      }

      if (bytesReceived > 0 && bytesReceived < settings.slowMinBytes && idleTime > settings.slowPartialIdleMs) {
        if (logger?.warn && shouldLog(ip, Date.now())) {
          logger.warn(`Destroying slow connection from ${ip}`);
        }
        socket.destroy();
      }
    }, settings.slowCheckIntervalMs);
    if (typeof slowCheck.unref === 'function') slowCheck.unref();

    function cleanupSocketTracking() {
      clearInterval(slowCheck);
      socket.off('data', onData);
    }

    socketCleanup.set(socket, cleanupSocketTracking);

    socket.setTimeout(settings.socketIdleTimeoutMs);
    const onTimeout = () => {
      if (logger?.warn && shouldLog(ip, Date.now())) {
        logger.warn(`Socket timeout for ${ip}`);
      }
      socket.destroy();
    };
    socketTimeoutHandler.set(socket, onTimeout);
    socket.on('timeout', onTimeout);

    socket.on('close', () => {
      cleanupSocketTracking();
      socketCleanup.delete(socket);
      socketTimeoutHandler.delete(socket);
      state.active = Math.max(0, state.active - 1);
    });

    socket.on('error', (err) => {
      cleanupSocketTracking();
      socketCleanup.delete(socket);
      socketTimeoutHandler.delete(socket);
      if (logger?.error && shouldLog(ip, Date.now())) {
        logger.error(`Socket error from ${ip}: ${err?.message || 'unknown error'}`);
      }
      socket.destroy();
    });
  }

  function onRequest(req, _res) {
    const cleanup = socketCleanup.get(req.socket);
    if (cleanup) {
      cleanup();
      socketCleanup.delete(req.socket);
    }

    const timeoutHandler = socketTimeoutHandler.get(req.socket);
    if (timeoutHandler) {
      req.socket.off('timeout', timeoutHandler);
      req.socket.setTimeout(0);
      socketTimeoutHandler.delete(req.socket);
    }
  }

  function onClientError(_err, socket) {
    if (socket && typeof socket.destroy === 'function') {
      socket.destroy();
    }
  }

  server.on('connection', onConnection);
  server.on('request', onRequest);
  server.on('clientError', onClientError);

  return {
    stop() {
      clearInterval(cleanupTimer);
      server.off('connection', onConnection);
      server.off('request', onRequest);
      server.off('clientError', onClientError);
      ipState.clear();
      lastLogAt.clear();
    },
  };
}

module.exports = applySlowlorisProtection;
