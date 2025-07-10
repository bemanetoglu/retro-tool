const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const ExcelJS = require('exceljs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Session configuration
const sessionMiddleware = session({
  secret: 'retro-tool-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Share session with socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// In-memory storage
const rooms = new Map();
const userSessions = new Map(); // sessionId -> { username, roomCode }

// Generate 6-digit room code
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

// Clean up expired rooms
function cleanupExpiredRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.timeLimit && now > room.createdAt + room.timeLimit * 60 * 1000) {
      if (room.participants.size === 0) {
        rooms.delete(code);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredRooms, 5 * 60 * 1000);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/create-room', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-room.html'));
});

app.get('/join/:code', (req, res) => {
  const code = req.params.code;
  if (rooms.has(code)) {
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
  } else {
    res.status(404).send('Room not found');
  }
});

app.get('/room/:code', (req, res) => {
  const code = req.params.code;
  
  if (!rooms.has(code)) {
    return res.status(404).send('Room not found');
  }
  
  // Check if user has joined the room
  const userSession = userSessions.get(req.session.id);
  if (!userSession || userSession.roomCode !== code) {
    // User hasn't joined the room, redirect to join page
    return res.redirect(`/join/${code}`);
  }
  
  res.sendFile(path.join(__dirname, 'public', 'room.html'));
});

// API Routes
app.post('/api/create-room', (req, res) => {
  const { roomName, participantLimit, timeLimit } = req.body;
  
  if (!roomName || roomName.trim() === '') {
    return res.status(400).json({ error: 'Room name is required' });
  }

  const roomCode = generateRoomCode();
  const room = {
    code: roomCode,
    name: roomName.trim(),
    creator: req.session.id,
    participantLimit: participantLimit || null,
    timeLimit: timeLimit || null,
    createdAt: Date.now(),
    participants: new Map(), // sessionId -> { username, socketId }
    entries: {
      mad: [],
      sad: [],
      glad: []
    },
    timeExtended: false,
    reopened: false
  };

  rooms.set(roomCode, room);
  
  // Auto-join the creator to their own room
  // We'll need a username for the creator, let's use a default or get it from request
  // For now, let's just set the session so they can access the room
  userSessions.set(req.session.id, { 
    username: 'Oda Sahibi', 
    roomCode: roomCode 
  });
  
  res.json({
    success: true,
    roomCode: roomCode,
    inviteLink: `${req.protocol}://${req.get('host')}/join/${roomCode}`
  });
});

app.post('/api/join-room', (req, res) => {
  const { roomCode, username } = req.body;
  
  if (!roomCode || !username || username.trim() === '') {
    return res.status(400).json({ error: 'Room code and username are required' });
  }

  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Check if username is already taken
  for (const participant of room.participants.values()) {
    if (participant.username.toLowerCase() === username.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }
  }
  
  // Also check if any user session has this username for this room
  for (const [sessionId, session] of userSessions.entries()) {
    if (session.roomCode === roomCode && session.username.toLowerCase() === username.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }
  }

  // Check participant limit
  if (room.participantLimit && room.participants.size >= room.participantLimit) {
    return res.status(400).json({ error: 'Room is full, cannot join' });
  }

  // Check if user is already in the room (from different tab)
  const existingSession = userSessions.get(req.session.id);
  if (existingSession && existingSession.roomCode === roomCode) {
    return res.json({ success: true, rejoined: true });
  }

  // Store session info
  userSessions.set(req.session.id, { username: username.trim(), roomCode });
  
  res.json({ success: true, rejoined: false });
});

app.get('/api/room/:code', (req, res) => {
  const code = req.params.code;
  const room = rooms.get(code);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const userSession = userSessions.get(req.session.id);
  if (!userSession || userSession.roomCode !== code) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const now = Date.now();
  let timeRemaining = room.timeLimit ? 
    Math.max(0, room.timeLimit * 60 * 1000 - (now - room.createdAt)) : null;
  
  // If room is terminated, time remaining should be 0
  if (room.terminated) {
    timeRemaining = 0;
  }

  // Get participants list
  const participants = [];
  for (const [sessionId, participant] of room.participants.entries()) {
    participants.push({
      username: participant.username,
      isCreator: room.creator === sessionId
    });
  }

  // Determine if entries should be visible
  const isTimeUp = room.timeLimit && timeRemaining === 0;
  const isTerminated = room.terminated;
  const shouldShowAllEntries = isTimeUp || isTerminated;
  
  // Filter entries based on current user and visibility rules
  const filteredEntries = {
    mad: [],
    sad: [],
    glad: []
  };
  
  ['mad', 'sad', 'glad'].forEach(category => {
    room.entries[category].forEach(entry => {
      if (shouldShowAllEntries) {
        // Show all entries if time is up or terminated
        filteredEntries[category].push(entry);
      } else if (entry.username === userSession.username) {
        // Always show user's own entries (both draft and published)
        filteredEntries[category].push(entry);
      } else if (entry.published) {
        // Show published entries from other users (including for room creator)
        filteredEntries[category].push(entry);
      }
    });
  });

  res.json({
    room: {
      code: room.code,
      name: room.name,
      participantCount: room.participants.size,
      participantLimit: room.participantLimit,
      timeLimit: room.timeLimit,
      timeRemaining: timeRemaining,
      entries: filteredEntries,
      isCreator: room.creator === req.session.id,
      reopened: room.reopened,
      terminated: room.terminated || false,
      participants: participants,
      shouldShowAllEntries: shouldShowAllEntries
    }
  });
});

app.post('/api/room/:code/entry', (req, res) => {
  const code = req.params.code;
  const { category, text } = req.body;
  
  if (!['mad', 'sad', 'glad'].includes(category) || !text || text.trim() === '') {
    return res.status(400).json({ error: 'Invalid entry data' });
  }

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const userSession = userSessions.get(req.session.id);
  if (!userSession || userSession.roomCode !== code) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if room is terminated
  if (room.terminated) {
    return res.status(400).json({ error: 'Retrospektif sonlandırıldı' });
  }
  
  // Check if time limit has expired and room is not reopened
  const now = Date.now();
  if (room.timeLimit && !room.reopened && now > room.createdAt + room.timeLimit * 60 * 1000) {
    return res.status(400).json({ error: 'Zaman sınırı doldu' });
  }

  const entry = {
    id: crypto.randomUUID(),
    text: text.trim(),
    username: userSession.username,
    timestamp: now,
    selected: false,
    draft: true, // Başlangıçta taslak olarak oluştur
    published: false
  };

  room.entries[category].push(entry);
  
  // Broadcast to all participants in the room
  io.to(code).emit('newEntry', { category, entry });
  
  res.json({ success: true });
});

app.post('/api/room/:code/extend-time', (req, res) => {
  const code = req.params.code;
  const { additionalMinutes } = req.body;
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.creator !== req.session.id) {
    return res.status(403).json({ error: 'Only room creator can extend time' });
  }

  if (!room.timeLimit) {
    return res.status(400).json({ error: 'Room has no time limit' });
  }

  room.timeLimit += additionalMinutes || 15;
  
  // Broadcast to all participants
  io.to(code).emit('timeExtended', { newTimeLimit: room.timeLimit });
  
  res.json({ success: true });
});

app.post('/api/room/:code/reopen', (req, res) => {
  const code = req.params.code;
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.creator !== req.session.id) {
    return res.status(403).json({ error: 'Only room creator can reopen room' });
  }

  room.reopened = true;
  
  // Broadcast to all participants
  io.to(code).emit('roomReopened');
  
  res.json({ success: true });
});

app.post('/api/room/:code/terminate', (req, res) => {
  const code = req.params.code;
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.creator !== req.session.id) {
    return res.status(403).json({ error: 'Only room creator can terminate room' });
  }

  room.terminated = true;
  room.timeRemaining = 0;
  
  // Broadcast to all participants
  io.to(code).emit('roomTerminated');
  
  res.json({ success: true });
});

app.get('/api/room/:code/participants', (req, res) => {
  const code = req.params.code;
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const userSession = userSessions.get(req.session.id);
  if (!userSession || userSession.roomCode !== code) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const participants = [];
  for (const [sessionId, participant] of room.participants.entries()) {
    participants.push({
      username: participant.username,
      isCreator: room.creator === sessionId
    });
  }

  res.json({ participants });
});

app.post('/api/room/:code/toggle-entry', (req, res) => {
  const code = req.params.code;
  const { category, entryId } = req.body;
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.creator !== req.session.id) {
    return res.status(403).json({ error: 'Only room creator can select entries' });
  }

  const entry = room.entries[category].find(e => e.id === entryId);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  entry.selected = !entry.selected;
  
  // Broadcast to all participants
  io.to(code).emit('entryToggled', { category, entryId, selected: entry.selected });
  
  res.json({ success: true });
});

app.get('/api/room/:code/export', async (req, res) => {
  const code = req.params.code;
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.creator !== req.session.id) {
    return res.status(403).json({ error: 'Only room creator can export' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Retrospective');
    
    const today = new Date().toISOString().split('T')[0];
    worksheet.addRow([`Retro - ${today}`]);
    worksheet.addRow([]); // Empty row
    
    // Headers
    worksheet.addRow(['Category', 'Entry', 'Username']);
    
    // Debug: Log all entries and their published/selected state
    console.log('EXCEL EXPORT DEBUG:');
    ['mad', 'sad', 'glad'].forEach(category => {
      console.log(`${category.toUpperCase()} entries:`, room.entries[category].length);
      room.entries[category].forEach(entry => {
        console.log(`  - "${entry.text}" by ${entry.username} - Published: ${entry.published}, Selected: ${entry.selected}`);
      });
    });
    
    // Add selected AND published entries only
    let totalExportedEntries = 0;
    ['mad', 'sad', 'glad'].forEach(category => {
      // Filter entries that are both selected and published
      const exportableEntries = room.entries[category].filter(entry => entry.selected && entry.published);
      console.log(`${category.toUpperCase()} exportable entries (selected AND published):`, exportableEntries.length);
      totalExportedEntries += exportableEntries.length;
      exportableEntries.forEach(entry => {
        worksheet.addRow([
          category.charAt(0).toUpperCase() + category.slice(1),
          entry.text,
          entry.username
        ]);
      });
    });
    
    console.log('Total exported entries (selected AND published):', totalExportedEntries);
    
    // Style the header
    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(3).font = { bold: true };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(15, column.width || 0);
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="retro-${room.name}-${today}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

app.post('/api/room/:code/entry/:id/publish', (req, res) => {
  const code = req.params.code;
  const entryId = req.params.id;
  
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const userSession = userSessions.get(req.session.id);
  if (!userSession || userSession.roomCode !== code) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Find the entry across all categories
  let foundEntry = null;
  let entryCategory = null;
  
  for (const category of ['mad', 'sad', 'glad']) {
    const entry = room.entries[category].find(e => e.id === entryId);
    if (entry) {
      foundEntry = entry;
      entryCategory = category;
      break;
    }
  }

  if (!foundEntry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  // Check if user owns this entry
  if (foundEntry.username !== userSession.username) {
    return res.status(403).json({ error: 'You can only publish your own entries' });
  }

  // Check if room is terminated
  if (room.terminated) {
    return res.status(400).json({ error: 'Retrospektif sonlandırıldı' });
  }
  
  // Check if time limit has expired and room is not reopened
  const now = Date.now();
  if (room.timeLimit && !room.reopened && now > room.createdAt + room.timeLimit * 60 * 1000) {
    return res.status(400).json({ error: 'Zaman sınırı doldu' });
  }

  // Toggle publish state
  foundEntry.published = !foundEntry.published;
  foundEntry.draft = !foundEntry.published;
  
  // Broadcast to all participants only if entry is now published
  if (foundEntry.published) {
    io.to(code).emit('newEntry', { category: entryCategory, entry: foundEntry });
  } else {
    // If unpublished, notify others to remove it
    io.to(code).emit('entryUnpublished', { category: entryCategory, entryId: foundEntry.id });
  }
  
  res.json({ success: true, published: foundEntry.published });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  const sessionId = socket.request.session.id;
  
  socket.on('joinRoom', (roomCode) => {
    const room = rooms.get(roomCode);
    const userSession = userSessions.get(sessionId);
    
    if (!room || !userSession || userSession.roomCode !== roomCode) {
      socket.emit('error', 'Invalid room or session');
      return;
    }

    // Add to participants if not already there
    if (!room.participants.has(sessionId)) {
      room.participants.set(sessionId, {
        username: userSession.username,
        socketId: socket.id
      });
    } else {
      // Update socket ID for existing participant
      room.participants.get(sessionId).socketId = socket.id;
    }
    
    socket.join(roomCode);
    
    // Get updated participants list
    const participants = [];
    for (const [sessionId, participant] of room.participants.entries()) {
      participants.push({
        username: participant.username,
        isCreator: room.creator === sessionId
      });
    }
    
    // Broadcast updated participant count and list
    io.to(roomCode).emit('participantUpdate', {
      count: room.participants.size,
      limit: room.participantLimit,
      participants: participants
    });
    
    // Send current room state to the joining user
    // Filter entries based on user and room state
    const now = Date.now();
    const timeRemaining = room.timeLimit ? 
      Math.max(0, room.timeLimit * 60 * 1000 - (now - room.createdAt)) : null;
    const isTimeUp = room.timeLimit && timeRemaining === 0;
    const isTerminated = room.terminated;
    const shouldShowAllEntries = isTimeUp || isTerminated;
    
    const currentUserSession = userSessions.get(sessionId);
    const filteredEntries = {
      mad: [],
      sad: [],
      glad: []
    };
    
    ['mad', 'sad', 'glad'].forEach(category => {
      room.entries[category].forEach(entry => {
        if (shouldShowAllEntries) {
          // Show all entries if time is up or terminated
          filteredEntries[category].push(entry);
        } else if (entry.username === currentUserSession.username) {
          // Always show user's own entries (both draft and published)
          filteredEntries[category].push(entry);
        } else if (entry.published) {
          // Show published entries from other users (including for room creator)
          filteredEntries[category].push(entry);
        }
      });
    });
    
    socket.emit('roomState', {
      entries: filteredEntries,
      participantCount: room.participants.size,
      isCreator: room.creator === sessionId,
      shouldShowAllEntries: shouldShowAllEntries
    });
  });

  socket.on('disconnect', () => {
    // Find and remove user from rooms
    for (const [roomCode, room] of rooms.entries()) {
      if (room.participants.has(sessionId)) {
        room.participants.delete(sessionId);
        
        // Get updated participants list
        const participants = [];
        for (const [sessionId, participant] of room.participants.entries()) {
          participants.push({
            username: participant.username,
            isCreator: room.creator === sessionId
          });
        }
        
        // Broadcast updated participant count and list
        io.to(roomCode).emit('participantUpdate', {
          count: room.participants.size,
          limit: room.participantLimit,
          participants: participants
        });
        
        // Clean up empty rooms
        if (room.participants.size === 0) {
          setTimeout(() => {
            if (rooms.has(roomCode) && rooms.get(roomCode).participants.size === 0) {
              rooms.delete(roomCode);
            }
          }, 10 * 60 * 1000); // Delete after 10 minutes if still empty
        }
        
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Retro Tool server running on port ${PORT}`);
}); 