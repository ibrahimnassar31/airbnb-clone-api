import * as svc from '../services/listing.service.js';
import { etagFrom, setCacheHeaders, requestIsFresh } from '../utils/httpCache.js';

export async function createListingCtrl(req, res) {
  const data = await svc.createNewListing(req.body, req.user.id);
  res.status(201).json(data);
}

export async function updateListingCtrl(req, res) {
  const data = await svc.updateExistingListing(req.params.id, req.user.id, req.body);
  res.json(data);
}

export async function deleteListingCtrl(req, res) {
  const out = await svc.removeListing(req.params.id, req.user.id);
  res.json(out);
}

export async function getListingCtrl(req, res) {
  const data = await svc.getListing(req.params.id);
  const lastModified = data.updatedAt || new Date();
  const etag = etagFrom(`${data.id}:${new Date(lastModified).toISOString()}:${data.reviewCount ?? ''}:${data.averageRating ?? ''}`);
  setCacheHeaders(res, { maxAgeSec: 60, etag, lastModified });
  if (requestIsFresh(req, res)) return res.status(304).end();
  res.json(data);
}

export async function listListingsCtrl(req, res) {
  const data = await svc.searchPublic(req.query);
  const { items = [], page, limit, sort, total } = data || {};
  const maxUpdatedAt = items.reduce((acc, it) => {
    const d = it?.updatedAt ? new Date(it.updatedAt).getTime() : 0;
    return Math.max(acc, d);
  }, 0);
  const lastModified = maxUpdatedAt ? new Date(maxUpdatedAt) : undefined;
  const signature = [total, page, limit, sort, ...items.map(i => `${i._id || i.id}:${i.updatedAt || ''}`)].join('|');
  const etag = etagFrom(signature);
  setCacheHeaders(res, { maxAgeSec: 30, etag, lastModified, staleWhileRevalidateSec: 120 });
  if (requestIsFresh(req, res)) return res.status(304).end();
  res.json(data);
}
