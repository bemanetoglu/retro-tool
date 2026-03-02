const request = require('supertest');
const http = require('http');
const { app, io, rooms, userSessions, cleanupInterval } = require('./server');
const ioClient = require('socket.io-client');

let server;
let baseURL;

beforeAll((done) => {
  server = http.createServer(app);
  io.attach(server);
  server.listen(0, () => {
    const port = server.address().port;
    baseURL = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => {
  clearInterval(cleanupInterval);
  io.close();
  server.close(done);
});

beforeEach(() => {
  rooms.clear();
  userSessions.clear();
});

// Helper: create a room and return agent with session + room data
async function createRoom(agent, overrides = {}) {
  const res = await agent
    .post('/api/create-room')
    .send({
      roomName: overrides.roomName || 'Test Retro',
      participantLimit: overrides.participantLimit ?? null,
      timeLimit: overrides.timeLimit ?? null,
    });
  return res;
}

// Helper: join a room with a separate agent
async function joinRoom(agent, roomCode, username) {
  return agent
    .post('/api/join-room')
    .send({ roomCode, username });
}

// ============================================================
// TC001: Create room with valid and invalid participant limits
// ============================================================
describe('TC001: Create room with valid and invalid participant limits', () => {
  test('should create a room with valid participant limit (10)', async () => {
    const agent = request.agent(app);
    const res = await createRoom(agent, { participantLimit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.roomCode).toMatch(/^\d{6}$/);
    expect(res.body.inviteLink).toBeDefined();
  });

  test('should create a room with participant limit 1', async () => {
    const agent = request.agent(app);
    const res = await createRoom(agent, { participantLimit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should create a room with participant limit 50', async () => {
    const agent = request.agent(app);
    const res = await createRoom(agent, { participantLimit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should create a room without participant limit', async () => {
    const agent = request.agent(app);
    const res = await createRoom(agent);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should reject empty room name', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/create-room').send({ roomName: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should reject missing room name', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/create-room').send({});
    expect(res.status).toBe(400);
  });

  test('should auto-join creator to the room', async () => {
    const agent = request.agent(app);
    const res = await createRoom(agent);
    const roomCode = res.body.roomCode;

    const roomRes = await agent.get(`/api/room/${roomCode}`);
    expect(roomRes.status).toBe(200);
    expect(roomRes.body.room.isCreator).toBe(true);
  });

  test('should generate unique room codes', async () => {
    const codes = new Set();
    for (let i = 0; i < 5; i++) {
      const agent = request.agent(app);
      const res = await createRoom(agent, { roomName: `Room ${i}` });
      codes.add(res.body.roomCode);
    }
    expect(codes.size).toBe(5);
  });
});

// ============================================================
// TC002: Join room with valid and invalid codes
// ============================================================
describe('TC002: Join room with valid and invalid codes', () => {
  test('should join an existing room with valid username', async () => {
    const creatorAgent = request.agent(app);
    const createRes = await createRoom(creatorAgent);
    const roomCode = createRes.body.roomCode;

    const joinerAgent = request.agent(app);
    const joinRes = await joinRoom(joinerAgent, roomCode, 'Ali');
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);
  });

  test('should reject joining non-existent room', async () => {
    const agent = request.agent(app);
    const res = await joinRoom(agent, '999999', 'Ali');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('should reject duplicate username in same room', async () => {
    const creatorAgent = request.agent(app);
    const createRes = await createRoom(creatorAgent);
    const roomCode = createRes.body.roomCode;

    const joiner1 = request.agent(app);
    await joinRoom(joiner1, roomCode, 'Ali');

    const joiner2 = request.agent(app);
    const res = await joinRoom(joiner2, roomCode, 'Ali');
    expect(res.status).toBe(400);
  });

  test('should reject duplicate username case-insensitive', async () => {
    const creatorAgent = request.agent(app);
    const createRes = await createRoom(creatorAgent);
    const roomCode = createRes.body.roomCode;

    const joiner1 = request.agent(app);
    await joinRoom(joiner1, roomCode, 'Ali');

    const joiner2 = request.agent(app);
    const res = await joinRoom(joiner2, roomCode, 'ali');
    expect(res.status).toBe(400);
  });

  test('should reject empty username', async () => {
    const creatorAgent = request.agent(app);
    const createRes = await createRoom(creatorAgent);

    const joinerAgent = request.agent(app);
    const res = await joinRoom(joinerAgent, createRes.body.roomCode, '');
    expect(res.status).toBe(400);
  });

  test('should reject missing room code', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/join-room').send({ username: 'Ali' });
    expect(res.status).toBe(400);
  });

  test('should enforce participant limit', async () => {
    const creatorAgent = request.agent(app);
    const createRes = await createRoom(creatorAgent, { participantLimit: 1 });
    const roomCode = createRes.body.roomCode;

    // Creator is not in participants map yet (only in userSessions)
    // Socket connection adds to participants. Let's add manually.
    const room = rooms.get(roomCode);
    room.participants.set('fake-session-1', { username: 'Existing', socketId: 'fake' });

    const joiner = request.agent(app);
    const res = await joinRoom(joiner, roomCode, 'NewUser');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('full');
  });

  test('should allow rejoining same room with same session', async () => {
    const creatorAgent = request.agent(app);
    const createRes = await createRoom(creatorAgent);
    const roomCode = createRes.body.roomCode;

    const joinerAgent = request.agent(app);
    await joinRoom(joinerAgent, roomCode, 'Ali');

    const res = await joinerAgent
      .post('/api/join-room')
      .send({ roomCode, username: 'Ali' });
    expect(res.status).toBe(200);
    expect(res.body.rejoined).toBe(true);
  });
});

// ============================================================
// TC003: Create, edit, publish, and delete entries
// ============================================================
describe('TC003: Create, edit, publish, and delete entries', () => {
  let creatorAgent, roomCode;

  beforeEach(async () => {
    creatorAgent = request.agent(app);
    const res = await createRoom(creatorAgent);
    roomCode = res.body.roomCode;
  });

  test('should create a draft entry in mad category', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Too many meetings' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const room = rooms.get(roomCode);
    expect(room.entries.mad).toHaveLength(1);
    expect(room.entries.mad[0].draft).toBe(true);
    expect(room.entries.mad[0].published).toBe(false);
  });

  test('should create entries in all categories', async () => {
    for (const cat of ['mad', 'sad', 'glad']) {
      const res = await creatorAgent
        .post(`/api/room/${roomCode}/entry`)
        .send({ category: cat, text: `Entry for ${cat}` });
      expect(res.status).toBe(200);
    }
    const room = rooms.get(roomCode);
    expect(room.entries.mad).toHaveLength(1);
    expect(room.entries.sad).toHaveLength(1);
    expect(room.entries.glad).toHaveLength(1);
  });

  test('should reject invalid category', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'angry', text: 'test' });
    expect(res.status).toBe(400);
  });

  test('should reject empty text', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: '' });
    expect(res.status).toBe(400);
  });

  test('should publish a draft entry', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Draft entry' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.mad[0].id;

    const res = await creatorAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/publish`);
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(true);
    expect(room.entries.mad[0].published).toBe(true);
    expect(room.entries.mad[0].draft).toBe(false);
  });

  test('should unpublish a published entry', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Entry to unpublish' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.mad[0].id;

    await creatorAgent.post(`/api/room/${roomCode}/entry/${entryId}/publish`);
    const res = await creatorAgent.post(`/api/room/${roomCode}/entry/${entryId}/publish`);
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(false);
  });

  test('should edit a draft entry', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'sad', text: 'Original text' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.sad[0].id;

    const res = await creatorAgent
      .put(`/api/room/${roomCode}/entry/${entryId}`)
      .send({ text: 'Updated text' });
    expect(res.status).toBe(200);
    expect(room.entries.sad[0].text).toBe('Updated text');
  });

  test('should reject editing a published entry', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'glad', text: 'Published entry' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.glad[0].id;
    room.entries.glad[0].published = true;

    const res = await creatorAgent
      .put(`/api/room/${roomCode}/entry/${entryId}`)
      .send({ text: 'Cannot edit' });
    expect(res.status).toBe(400);
  });

  test('should delete an entry', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'To delete' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.mad[0].id;

    const res = await creatorAgent
      .delete(`/api/room/${roomCode}/entry/${entryId}`);
    expect(res.status).toBe(200);
    expect(room.entries.mad).toHaveLength(0);
  });

  test('should reject deleting another user\'s entry', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Creator entry' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.mad[0].id;

    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'User2');

    const res = await joiner.delete(`/api/room/${roomCode}/entry/${entryId}`);
    expect(res.status).toBe(403);
  });

  test('should reject creating entry in non-existent room', async () => {
    const res = await creatorAgent
      .post('/api/room/000000/entry')
      .send({ category: 'mad', text: 'test' });
    expect(res.status).toBe(404);
  });

  test('should reject entry creation in terminated room', async () => {
    const room = rooms.get(roomCode);
    room.terminated = true;

    const res = await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'test' });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// TC004: Start, extend, reopen, and terminate timer
// ============================================================
describe('TC004: Timer lifecycle - start, extend, reopen, terminate', () => {
  let creatorAgent, roomCode;

  beforeEach(async () => {
    creatorAgent = request.agent(app);
    const res = await createRoom(creatorAgent, { timeLimit: 30 });
    roomCode = res.body.roomCode;
  });

  test('should start the timer as creator', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/start`);
    expect(res.status).toBe(200);
    expect(res.body.startedAt).toBeDefined();

    const room = rooms.get(roomCode);
    expect(room.started).toBe(true);
  });

  test('should reject starting timer twice', async () => {
    await creatorAgent.post(`/api/room/${roomCode}/start`);
    const res = await creatorAgent.post(`/api/room/${roomCode}/start`);
    expect(res.status).toBe(400);
  });

  test('should reject non-creator starting timer', async () => {
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'User2');

    const res = await joiner.post(`/api/room/${roomCode}/start`);
    expect(res.status).toBe(403);
  });

  test('should extend time as creator', async () => {
    await creatorAgent.post(`/api/room/${roomCode}/start`);

    const res = await creatorAgent
      .post(`/api/room/${roomCode}/extend-time`)
      .send({ additionalMinutes: 15 });
    expect(res.status).toBe(200);

    const room = rooms.get(roomCode);
    expect(room.timeLimit).toBe(45); // 30 + 15
  });

  test('should use default 15 min if no additionalMinutes', async () => {
    await creatorAgent.post(`/api/room/${roomCode}/start`);

    await creatorAgent
      .post(`/api/room/${roomCode}/extend-time`)
      .send({});

    const room = rooms.get(roomCode);
    expect(room.timeLimit).toBe(45); // 30 + 15 default
  });

  test('should reject non-creator extending time', async () => {
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'User2');

    const res = await joiner
      .post(`/api/room/${roomCode}/extend-time`)
      .send({ additionalMinutes: 10 });
    expect(res.status).toBe(403);
  });

  test('should terminate room as creator', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/terminate`);
    expect(res.status).toBe(200);

    const room = rooms.get(roomCode);
    expect(room.terminated).toBe(true);
  });

  test('should reject non-creator terminating room', async () => {
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'User2');

    const res = await joiner.post(`/api/room/${roomCode}/terminate`);
    expect(res.status).toBe(403);
  });

  test('should reopen room as creator', async () => {
    const room = rooms.get(roomCode);
    room.terminated = true;

    const res = await creatorAgent
      .post(`/api/room/${roomCode}/reopen`);
    expect(res.status).toBe(200);
    expect(room.reopened).toBe(true);
    expect(room.terminated).toBe(false);
  });

  test('should reject non-creator reopening room', async () => {
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'User2');

    const res = await joiner.post(`/api/room/${roomCode}/reopen`);
    expect(res.status).toBe(403);
  });

  test('should reject starting timer on room without time limit', async () => {
    const noTimerAgent = request.agent(app);
    const createRes = await createRoom(noTimerAgent, { roomName: 'No Timer' });
    const code = createRes.body.roomCode;

    const res = await noTimerAgent.post(`/api/room/${code}/start`);
    expect(res.status).toBe(400);
  });

  test('should return correct timer status', async () => {
    await creatorAgent.post(`/api/room/${roomCode}/start`);

    const res = await creatorAgent.get(`/api/room/${roomCode}/timer`);
    expect(res.status).toBe(200);
    expect(res.body.started).toBe(true);
    expect(res.body.timeRemaining).toBeGreaterThan(0);
    expect(res.body.terminated).toBe(false);
  });

  test('should return 0 timeRemaining when terminated', async () => {
    await creatorAgent.post(`/api/room/${roomCode}/terminate`);

    const res = await creatorAgent.get(`/api/room/${roomCode}/timer`);
    expect(res.body.terminated).toBe(true);
    expect(res.body.timeRemaining).toBe(0);
  });
});

// ============================================================
// TC005: Rate published entries after retro end
// ============================================================
describe('TC005: Rating system', () => {
  let creatorAgent, joinerAgent, roomCode, entryId;

  beforeEach(async () => {
    creatorAgent = request.agent(app);
    const res = await createRoom(creatorAgent, { timeLimit: 1 });
    roomCode = res.body.roomCode;

    joinerAgent = request.agent(app);
    await joinRoom(joinerAgent, roomCode, 'Rater');

    // Creator creates and publishes an entry
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'glad', text: 'Great teamwork' });

    const room = rooms.get(roomCode);
    entryId = room.entries.glad[0].id;
    room.entries.glad[0].published = true;

    // Terminate the room so ratings are allowed
    room.terminated = true;
  });

  test('should rate a published entry after retro ends', async () => {
    const res = await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 4 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(4);
    expect(res.body.averageRating).toBe(4);
  });

  test('should reject rating own entry', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 5 });
    expect(res.status).toBe(400);
  });

  test('should reject invalid rating (0)', async () => {
    const res = await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 0 });
    expect(res.status).toBe(400);
  });

  test('should reject invalid rating (6)', async () => {
    const res = await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  test('should reject rating before retro ends', async () => {
    const room = rooms.get(roomCode);
    room.terminated = false;
    room.started = false;

    const res = await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 3 });
    expect(res.status).toBe(400);
  });

  test('should reject rating unpublished entry', async () => {
    const room = rooms.get(roomCode);
    room.entries.glad[0].published = false;

    const res = await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 3 });
    expect(res.status).toBe(400);
  });

  test('should update rating when rated again', async () => {
    await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 3 });

    const res = await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 5 });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(res.body.averageRating).toBe(5);
    expect(res.body.totalRatings).toBe(1);
  });

  test('should calculate correct average from multiple raters', async () => {
    await joinerAgent
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 4 });

    const joiner2 = request.agent(app);
    await joinRoom(joiner2, roomCode, 'Rater2');

    const res = await joiner2
      .post(`/api/room/${roomCode}/entry/${entryId}/rate`)
      .send({ rating: 2 });

    expect(res.body.averageRating).toBe(3); // (4+2)/2
    expect(res.body.totalRatings).toBe(2);
  });
});

// ============================================================
// TC006: Export selected published entries to Excel
// ============================================================
describe('TC006: Excel export', () => {
  let creatorAgent, roomCode;

  beforeEach(async () => {
    creatorAgent = request.agent(app);
    const res = await createRoom(creatorAgent);
    roomCode = res.body.roomCode;
  });

  test('should export selected and published entries', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Export me' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.mad[0].id;
    room.entries.mad[0].published = true;
    room.entries.mad[0].selected = true;

    const res = await creatorAgent.get(`/api/room/${roomCode}/export`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  test('should reject export when no entries are selected and published', async () => {
    const res = await creatorAgent.get(`/api/room/${roomCode}/export`);
    expect(res.status).toBe(400);
  });

  test('should not export unpublished entries even if selected', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'sad', text: 'Draft entry' });

    const room = rooms.get(roomCode);
    room.entries.sad[0].selected = true;
    // published remains false

    const res = await creatorAgent.get(`/api/room/${roomCode}/export`);
    expect(res.status).toBe(400);
  });

  test('should reject export by non-creator', async () => {
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'User2');

    const res = await joiner.get(`/api/room/${roomCode}/export`);
    expect(res.status).toBe(403);
  });

  test('should reject export for non-existent room', async () => {
    const res = await creatorAgent.get('/api/room/000000/export');
    expect(res.status).toBe(404);
  });
});

// ============================================================
// TC007: Socket.IO joinRoom and real-time events
// ============================================================
describe('TC007: Socket.IO real-time events', () => {
  test('should receive roomState after joining via socket', (done) => {
    const agent = request.agent(app);

    createRoom(agent).then((createRes) => {
      const roomCode = createRes.body.roomCode;
      const port = server.address().port;

      const headers = {};
      const cookies = createRes.headers['set-cookie'];
      if (cookies) {
        headers.cookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      }

      const client = ioClient(`http://localhost:${port}`, {
        extraHeaders: headers,
        transports: ['websocket'],
      });

      client.on('connect', () => {
        client.emit('joinRoom', roomCode);
      });

      client.on('roomState', (data) => {
        expect(data.entries).toBeDefined();
        expect(data.isCreator).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (err) => {
        client.disconnect();
        done(err);
      });
    });
  }, 10000);
});

// ============================================================
// TC008: Toggle entry selection by creator and non-creator
// ============================================================
describe('TC008: Toggle entry selection', () => {
  let creatorAgent, roomCode, entryId;

  beforeEach(async () => {
    creatorAgent = request.agent(app);
    const res = await createRoom(creatorAgent);
    roomCode = res.body.roomCode;

    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Toggle me' });

    const room = rooms.get(roomCode);
    entryId = room.entries.mad[0].id;
  });

  test('should toggle entry selection as creator', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/toggle-entry`)
      .send({ category: 'mad', entryId });
    expect(res.status).toBe(200);

    const room = rooms.get(roomCode);
    expect(room.entries.mad[0].selected).toBe(true);
  });

  test('should toggle back to unselected', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/toggle-entry`)
      .send({ category: 'mad', entryId });
    await creatorAgent
      .post(`/api/room/${roomCode}/toggle-entry`)
      .send({ category: 'mad', entryId });

    const room = rooms.get(roomCode);
    expect(room.entries.mad[0].selected).toBe(false);
  });

  test('should reject non-creator toggling entry', async () => {
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'User2');

    const res = await joiner
      .post(`/api/room/${roomCode}/toggle-entry`)
      .send({ category: 'mad', entryId });
    expect(res.status).toBe(403);
  });

  test('should return 404 for non-existent entry', async () => {
    const res = await creatorAgent
      .post(`/api/room/${roomCode}/toggle-entry`)
      .send({ category: 'mad', entryId: 'non-existent-id' });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// TC009: Participants list and room access
// ============================================================
describe('TC009: Participants and room access', () => {
  let creatorAgent, roomCode;

  beforeEach(async () => {
    creatorAgent = request.agent(app);
    const res = await createRoom(creatorAgent);
    roomCode = res.body.roomCode;
  });

  test('should get participants list', async () => {
    const res = await creatorAgent.get(`/api/room/${roomCode}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.participants).toBeDefined();
    expect(Array.isArray(res.body.participants)).toBe(true);
  });

  test('should reject unauthorized access to participants', async () => {
    const outsider = request.agent(app);
    const res = await outsider.get(`/api/room/${roomCode}/participants`);
    expect(res.status).toBe(403);
  });

  test('should redirect unauthenticated user to join page', async () => {
    const outsider = request.agent(app);
    const res = await outsider.get(`/room/${roomCode}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`/join/${roomCode}`);
  });

  test('should return 404 for non-existent room page', async () => {
    const agent = request.agent(app);
    const res = await agent.get('/room/000000');
    expect(res.status).toBe(404);
  });

  test('should return 404 for non-existent join page', async () => {
    const agent = request.agent(app);
    const res = await agent.get('/join/000000');
    expect(res.status).toBe(404);
  });

  test('should get room data with correct structure', async () => {
    const res = await creatorAgent.get(`/api/room/${roomCode}`);
    expect(res.status).toBe(200);

    const room = res.body.room;
    expect(room.code).toBe(roomCode);
    expect(room.name).toBeDefined();
    expect(room.entries).toBeDefined();
    expect(room.entries.mad).toBeDefined();
    expect(room.entries.sad).toBeDefined();
    expect(room.entries.glad).toBeDefined();
    expect(room.isCreator).toBe(true);
    expect(room.currentUsername).toBeDefined();
  });

  test('should deny room data access to outsider', async () => {
    const outsider = request.agent(app);
    const res = await outsider.get(`/api/room/${roomCode}`);
    expect(res.status).toBe(403);
  });

  test('should show published entries to other users', async () => {
    // Creator adds and publishes entry
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'glad', text: 'Public entry' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.glad[0].id;
    room.entries.glad[0].published = true;

    // Joiner should see published entry
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'Viewer');

    const res = await joiner.get(`/api/room/${roomCode}`);
    expect(res.body.room.entries.glad).toHaveLength(1);
    expect(res.body.room.entries.glad[0].text).toBe('Public entry');
  });

  test('should hide draft entries from other users', async () => {
    await creatorAgent
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Draft entry' });

    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'Viewer');

    const res = await joiner.get(`/api/room/${roomCode}`);
    expect(res.body.room.entries.mad).toHaveLength(0);
  });
});

// ============================================================
// TC010: Room data - time-related edge cases
// ============================================================
describe('TC010: Room data time and state edge cases', () => {
  test('should show all entries after termination', async () => {
    const creator = request.agent(app);
    const res = await createRoom(creator);
    const roomCode = res.body.roomCode;

    // Creator adds draft entry
    await creator
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'sad', text: 'My draft' });

    // Terminate the room
    const room = rooms.get(roomCode);
    room.terminated = true;

    // Joiner should see all entries (including drafts)
    const joiner = request.agent(app);
    await joinRoom(joiner, roomCode, 'Viewer');

    const dataRes = await joiner.get(`/api/room/${roomCode}`);
    expect(dataRes.body.room.shouldShowAllEntries).toBe(true);
    expect(dataRes.body.room.entries.sad).toHaveLength(1);
  });

  test('should show timeRemaining=0 when terminated', async () => {
    const creator = request.agent(app);
    const res = await createRoom(creator, { timeLimit: 30 });
    const roomCode = res.body.roomCode;

    const room = rooms.get(roomCode);
    room.terminated = true;

    const dataRes = await creator.get(`/api/room/${roomCode}`);
    expect(dataRes.body.room.timeRemaining).toBe(0);
    expect(dataRes.body.room.terminated).toBe(true);
  });

  test('should block entry creation after time expires', async () => {
    const creator = request.agent(app);
    const res = await createRoom(creator, { timeLimit: 1 });
    const roomCode = res.body.roomCode;

    const room = rooms.get(roomCode);
    room.started = true;
    room.startedAt = Date.now() - 2 * 60 * 1000; // 2 min ago, limit was 1 min

    const entryRes = await creator
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Too late' });
    expect(entryRes.status).toBe(400);
  });

  test('should allow entry creation after room is reopened', async () => {
    const creator = request.agent(app);
    const res = await createRoom(creator, { timeLimit: 1 });
    const roomCode = res.body.roomCode;

    const room = rooms.get(roomCode);
    room.started = true;
    room.startedAt = Date.now() - 2 * 60 * 1000;
    room.reopened = true;

    const entryRes = await creator
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'glad', text: 'After reopen' });
    expect(entryRes.status).toBe(200);
  });

  test('should show full time remaining before timer starts', async () => {
    const creator = request.agent(app);
    const res = await createRoom(creator, { timeLimit: 30 });
    const roomCode = res.body.roomCode;

    const dataRes = await creator.get(`/api/room/${roomCode}`);
    expect(dataRes.body.room.timeRemaining).toBe(30 * 60 * 1000);
  });

  test('should serve static pages correctly', async () => {
    const agent = request.agent(app);

    const homeRes = await agent.get('/');
    expect(homeRes.status).toBe(200);

    const createRes = await agent.get('/create-room');
    expect(createRes.status).toBe(200);
  });

  test('should block publishing in terminated room', async () => {
    const creator = request.agent(app);
    const res = await createRoom(creator);
    const roomCode = res.body.roomCode;

    await creator
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Entry' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.mad[0].id;
    room.terminated = true;

    const pubRes = await creator
      .post(`/api/room/${roomCode}/entry/${entryId}/publish`);
    expect(pubRes.status).toBe(400);
  });

  test('should block deleting in terminated room', async () => {
    const creator = request.agent(app);
    const res = await createRoom(creator);
    const roomCode = res.body.roomCode;

    await creator
      .post(`/api/room/${roomCode}/entry`)
      .send({ category: 'mad', text: 'Entry' });

    const room = rooms.get(roomCode);
    const entryId = room.entries.mad[0].id;
    room.terminated = true;

    const delRes = await creator
      .delete(`/api/room/${roomCode}/entry/${entryId}`);
    expect(delRes.status).toBe(400);
  });
});
