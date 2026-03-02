# Product Requirements Document (PRD)
# Retro Tool - Real-Time Retrospective Application

## 1. Product Overview

Retro Tool is a web-based real-time retrospective application for agile teams. It uses the Mad/Sad/Glad retrospective format and enables team collaboration through WebSocket technology.

## 2. Core Features

### 2.1 Room Management
- **Create Room**: Users can create retrospective rooms with a name, optional participant limit (1-50), and optional time limit (1-300 minutes)
- **Room Code**: Each room gets a unique 6-digit numeric code
- **Invite Link**: System generates an invite link for easy sharing
- **Join Room**: Users join rooms using the 6-digit code and a username (2-20 chars, alphanumeric + Turkish chars + spaces)
- **Creator Role**: Room creator is auto-joined with username "Oda Sahibi" and has elevated permissions

### 2.2 Entry Management
- **Categories**: Three entry categories - Mad (angry/frustrating), Sad (disappointing), Glad (positive)
- **Draft/Publish**: Entries start as drafts visible only to the author; authors publish when ready
- **Edit**: Only draft entries can be edited by their author
- **Delete**: Authors can delete their own entries
- **Visibility**: Other users only see published entries; all entries visible after retro ends
- **Max Length**: 500 characters per entry

### 2.3 Timer & Room Lifecycle
- **Timer Start**: Creator manually starts the countdown timer
- **Time Extension**: Creator can extend time by 1-60 minutes
- **Room Reopen**: Creator can reopen (removes time limit, allows new entries)
- **Room Termination**: Creator can terminate the retro early
- **Auto Cleanup**: Empty rooms are deleted after 10 minutes; expired rooms cleaned every 5 minutes

### 2.4 Rating System
- **Star Rating**: 1-5 star rating on published entries
- **Availability**: Only available after retro ends (time expired or terminated)
- **Self-Rating**: Users cannot rate their own entries
- **Average**: System calculates average rating excluding entry owner

### 2.5 Export
- **Format**: Excel (.xlsx) export
- **Criteria**: Only entries that are both selected AND published are exported
- **Permission**: Creator only
- **Content**: Category, Entry text, Username columns

### 2.6 Real-Time Collaboration
- **WebSocket**: Socket.IO for live updates
- **Events**: Entry creation, publishing, deletion, selection toggling, participant updates, timer events
- **Reconnection**: Auto-reconnect on disconnect

### 2.7 Internationalization (i18n)
- **Languages**: Turkish (default), English, German, Spanish
- **Detection**: Auto-detect browser language
- **Persistence**: Language choice saved in localStorage

## 3. API Specification

### Page Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Home page |
| `/create-room` | GET | Create room page |
| `/join/:code` | GET | Join room page |
| `/room/:code` | GET | Room page (requires session) |

### REST API
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/create-room` | POST | None | Create room |
| `/api/join-room` | POST | None | Join room |
| `/api/room/:code` | GET | Session | Get room data |
| `/api/room/:code/entry` | POST | Session | Create entry |
| `/api/room/:code/start` | POST | Creator | Start timer |
| `/api/room/:code/extend-time` | POST | Creator | Extend time |
| `/api/room/:code/reopen` | POST | Creator | Reopen room |
| `/api/room/:code/terminate` | POST | Creator | Terminate room |
| `/api/room/:code/participants` | GET | Session | Get participants |
| `/api/room/:code/timer` | GET | Session | Get timer status |
| `/api/room/:code/toggle-entry` | POST | Creator | Toggle entry selection |
| `/api/room/:code/export` | GET | Creator | Export to Excel |
| `/api/room/:code/entry/:id/publish` | POST | Owner | Publish/unpublish entry |
| `/api/room/:code/entry/:id` | DELETE | Owner | Delete entry |
| `/api/room/:code/entry/:id` | PUT | Owner | Edit entry |
| `/api/room/:code/entry/:id/rate` | POST | Session | Rate entry |

## 4. Technical Architecture
- **Backend**: Node.js + Express.js
- **Real-time**: Socket.IO
- **Storage**: In-memory Maps (no persistence)
- **Session**: express-session with cookie-based sessions
- **Port**: 3000 (configurable via PORT env var)

## 5. User Roles
- **Creator**: Can start timer, extend time, reopen, terminate, select entries, export
- **Participant**: Can create entries, publish/unpublish own entries, edit/delete own entries, rate others' entries after retro ends

## 6. Validation Rules
- Room name: 2-50 characters
- Username: 2-20 characters, alphanumeric + Turkish characters + spaces
- Room code: 6-digit numeric
- Entry text: 1-500 characters
- Participant limit: 1-50
- Time limit: 1-300 minutes
- Rating: 1-5
- Time extension: 1-60 minutes
