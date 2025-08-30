import crypto from 'node:crypto';

export function etagFrom(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const hash = crypto.createHash('sha1').update(str).digest('hex');
  return `"${hash}"`;
}

export function setCacheHeaders(res, { maxAgeSec = 60, etag, lastModified, staleWhileRevalidateSec } = {}) {
  const parts = [
    'public',
    `max-age=${Math.max(0, Number(maxAgeSec) || 0)}`,
  ];
  if (staleWhileRevalidateSec && Number(staleWhileRevalidateSec) > 0) {
    parts.push(`stale-while-revalidate=${Number(staleWhileRevalidateSec)}`);
  }
  res.set('Cache-Control', parts.join(', '));
  if (etag) res.set('ETag', etag);
  if (lastModified) res.set('Last-Modified', new Date(lastModified).toUTCString());
}

export function requestIsFresh(req, res) {
  const etag = res.get('ETag');
  const lastModified = res.get('Last-Modified');

  const inm = req.headers['if-none-match'];
  if (etag && inm) {
    const list = String(inm)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.includes(etag)) return true;
  }

  const ims = req.headers['if-modified-since'];
  if (lastModified && ims) {
    const imsTime = Date.parse(ims);
    const lmTime = Date.parse(lastModified);
    if (!Number.isNaN(imsTime) && !Number.isNaN(lmTime) && imsTime >= lmTime) {
      return true;
    }
  }

  return false;
}

export default { etagFrom, setCacheHeaders, requestIsFresh };
