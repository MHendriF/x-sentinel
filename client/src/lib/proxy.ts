/**
 * Mirror of server/automation/proxyHelper.js#isValidProxyFormat so the node
 * modal can reject malformed proxy tunnel strings before hitting the API.
 * Accepted shapes (port is mandatory): user:pass@host:port,
 * host:port:user:pass, user:pass:host:port, host:port — optionally with an
 * http/https/socks4/socks5 scheme prefix.
 */
const isPort = (value: string) => {
  const port = Number(value);
  return /^\d{1,5}$/.test(value) && Number.isInteger(port) && port >= 1 && port <= 65535;
};
const HOST_RE = /^[\w.-]+$/;

export function isValidProxyFormat(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;

  let rest = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');

  if (rest.includes('@')) {
    const hostPort = rest.slice(rest.lastIndexOf('@') + 1);
    const [host, port] = hostPort.split(':');
    return host.length > 0 && HOST_RE.test(host) && isPort(port || '');
  }

  const parts = rest.split(':');
  if (parts.length === 2) {
    return HOST_RE.test(parts[0]) && isPort(parts[1]);
  }
  if (parts.length === 4) {
    return (
      (HOST_RE.test(parts[0]) && isPort(parts[1])) || (HOST_RE.test(parts[2]) && isPort(parts[3]))
    );
  }
  return false;
}

export const PROXY_FORMAT_HINT =
  'Gunakan format: user:pass@ip:port, ip:port:user:pass, atau ip:port (HTTP/SOCKS5).';
