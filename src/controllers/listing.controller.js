import * as svc from '../services/listing.service.js';

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
  res.json(data);
}

export async function listListingsCtrl(req, res) {
  const data = await svc.searchPublic(req.query);
  res.json(data);
}
