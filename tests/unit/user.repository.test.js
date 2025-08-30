import { describe, it, beforeEach, expect, vi } from 'vitest';

// Hoisted mongoose connection stub so repo can see it
const mockConnection = vi.hoisted(() => ({ readyState: 1 }));
vi.mock('mongoose', () => ({
  default: { connection: mockConnection },
  connection: mockConnection,
}));

// Chainable query mock
function makeQuery(doc) {
  return {
    _selected: undefined,
    select(sel) { this._selected = sel; return this; },
    exec: vi.fn().mockResolvedValue(doc),
  };
}

// Mock User model
const mockUserModel = vi.hoisted(() => ({
  findOne: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn(() => ({ exec: vi.fn().mockResolvedValue() })),
}));
vi.mock('../../src/models/user.model.js', () => ({ default: mockUserModel }));

import * as userRepo from '../../src/repositories/user.repository.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.readyState = 1;
});

describe('user.repository finders', () => {
  it('returns null when mongo not connected', async () => {
    mockConnection.readyState = 0;
    const byEmail = await userRepo.findByEmail('a@b.com');
    const byId = await userRepo.findById('abc');
    expect(byEmail).toBeNull();
    expect(byId).toBeNull();
  });

  it('findByEmail respects includeSecrets', async () => {
    const doc = { id: 'U1', email: 'a@b.com' };
    const q = makeQuery(doc);
    mockUserModel.findOne.mockReturnValue(q);

    const out = await userRepo.findByEmail('a@b.com', { includeSecrets: true });
    expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(q._selected).toBe('+passwordHash +refreshTokenHash');
    expect(out).toEqual(doc);
  });

  it('findById respects includeSecrets', async () => {
    const doc = { id: 'U2' };
    const q = makeQuery(doc);
    mockUserModel.findById.mockReturnValue(q);

    const out = await userRepo.findById('U2', { includeSecrets: true });
    expect(mockUserModel.findById).toHaveBeenCalledWith('U2');
    expect(q._selected).toBe('+passwordHash +refreshTokenHash');
    expect(out).toEqual(doc);
  });
});

describe('user.repository mutations', () => {
  it('createUser returns toJSON result and passes role', async () => {
    const toJSON = () => ({ id: 'U3', email: 'x@y.com', role: 'guest' });
    mockUserModel.create.mockResolvedValue({ toJSON });
    const out = await userRepo.createUser({ email: 'x@y.com', passwordHash: 'h', name: 'X' });
    expect(mockUserModel.create).toHaveBeenCalledWith({ email: 'x@y.com', passwordHash: 'h', name: 'X', role: 'guest' });
    expect(out).toEqual(toJSON());
  });

  it('set/clear refreshTokenHash update only when connected', async () => {
    await userRepo.setRefreshTokenHash('U', 'H');
    expect(mockUserModel.updateOne).toHaveBeenCalledWith({ _id: 'U' }, { $set: { refreshTokenHash: 'H' } });
    await userRepo.clearRefreshTokenHash('U');
    expect(mockUserModel.updateOne).toHaveBeenCalledWith({ _id: 'U' }, { $unset: { refreshTokenHash: 1 } });

    vi.clearAllMocks();
    mockConnection.readyState = 0;
    await userRepo.setRefreshTokenHash('U', 'H');
    await userRepo.clearRefreshTokenHash('U');
    expect(mockUserModel.updateOne).not.toHaveBeenCalled();
  });
});
