# Event Registration System API

A RESTful API for managing events, attendee registrations, and seat availability — built with **Node.js**, **Express**, and **JSON file** persistence.

## Features

- **Create Events** — with unique name, total seats, and future date validation
- **Register Users** — with race-condition protection (mutex locks), duplicate detection, and seat cap enforcement
- **View Events** — with available seats, total registrations, date sorting, and upcoming-only filtering
- **Cancel Registrations** — seats become available again; cancelled users are excluded from active lists
- **Web Dashboard** — premium glassmorphism UI to interact with the API visually
- **Persistent Storage** — data survives server restarts via local JSON files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Persistence | JSON files (atomic writes) |
| Frontend | Vanilla HTML/CSS/JS |
| Concurrency | In-memory mutex locks |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher

### Installation

```bash
# Clone the repo
git clone https://github.com/<your-username>/B0626---MahnoorShabbir---Innovaxel---Backend-Developer.git
cd B0626---MahnoorShabbir---Innovaxel---Backend-Developer

# Install dependencies
npm install

# Start the server
npm run dev
```

The server starts on `http://localhost:3000`:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

## API Endpoints

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Create a new event |
| `GET` | `/api/events` | List all events |
| `GET` | `/api/events/:id` | Get event details with registrations |

#### Create Event
```json
POST /api/events
{
  "name": "Tech Conference 2026",
  "totalSeats": 100,
  "date": "2026-12-15T10:00:00Z"
}
```

#### Query Parameters (GET /api/events)
| Param | Value | Description |
|-------|-------|-------------|
| `upcoming` | `true` | Show only future events |
| `sort` | `date` | Sort by event date ascending |

### Registrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events/:eventId/register` | Register a user |
| `PATCH` | `/api/registrations/:id/cancel` | Cancel a registration |

#### Register User
```json
POST /api/events/:eventId/register
{
  "userName": "Mahnoor Shabbir"
}
```

## Error Handling

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "EVENT_FULL",
    "message": "This event is fully booked. No seats available."
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid or missing input |
| `DATE_IN_PAST` | 400 | Event date is not in the future |
| `EVENT_FULL` | 400 | No seats available |
| `EVENT_PASSED` | 400 | Event date has already passed |
| `ALREADY_CANCELLED` | 400 | Registration already cancelled |
| `DUPLICATE_EVENT` | 409 | Event name already exists |
| `DUPLICATE_REGISTRATION` | 409 | User already registered |
| `EVENT_NOT_FOUND` | 404 | Event ID does not exist |
| `REGISTRATION_NOT_FOUND` | 404 | Registration ID does not exist |

## Project Structure

```
├── server.js                 # Express entry point
├── data/
│   └── store.js              # JSON persistence + mutex locks
├── routes/
│   ├── events.js             # Event CRUD endpoints
│   └── registrations.js      # Registration endpoints
├── middleware/
│   └── errorHandler.js       # Centralized error handling
├── public/
│   ├── index.html            # Dashboard UI
│   ├── style.css             # Glassmorphism styles
│   └── app.js                # Frontend logic
└── package.json
```

## Race Condition Handling

The system uses an **in-memory mutex lock** per event ID to serialize registration operations. This prevents two simultaneous requests from overbooking the same seat.

Available seats are **always computed dynamically** (`totalSeats - activeRegistrations`) rather than stored, ensuring count accuracy.

## Author

**Mahnoor Shabbir**

## License

MIT
