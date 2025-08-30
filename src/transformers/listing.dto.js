export function toListingDTO(doc = {}) {
  const id = String(doc.id ?? doc._id ?? '');
  const { _id, __v, ...rest } = doc;
  return { id, ...rest };
}

export default { toListingDTO };

