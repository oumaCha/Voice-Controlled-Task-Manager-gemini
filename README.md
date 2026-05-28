# Voice Controlled Task Manager

## Project Overview

Voice Controlled Task Manager is a web-based task management application where users can manage tasks completely through voice interaction.

The main goal is to create an AI-like voice assistant that can listen to the user, understand natural language commands, execute task actions, and respond back using voice.

Users can create, read, update, and delete tasks through conversation. The application does not use manual task action buttons such as edit or delete buttons. Task management actions are performed through voice commands only.

![Voice Controlled Task Manager Preview](frontend/src/assets
/preview.png)

---

## Main Features

### Voice-Based Task Management

The assistant supports full voice-based CRUD operations:

- Create tasks by speaking
- Read tasks and agenda by speaking
- Update tasks by speaking
- Delete tasks by speaking
- Confirm destructive actions before deleting
- Handle follow-up commands naturally

Example commands:

```txt
Create a task for gym tomorrow at 7 AM.
Create a task for posting on LinkedIn at 5 PM.
Change the LinkedIn task to 6 PM.
Actually change the previous one to 7 PM.
Delete the LinkedIn one.
What are my morning tasks?
Move the second one to tomorrow.

## Voice Interaction Flow

The application follows this flow:

```txt
User speaks
↓
Browser Speech Recognition converts voice to text
↓
Gemini understands the natural language command
↓
The frontend receives a structured intent
↓
The correct task action is executed
↓
The backend stores the result in SQLite
↓
The assistant responds using Text-to-Speech
```

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Browser Web Speech API
- Browser SpeechSynthesis API
- Gemini API

### Backend

- Node.js
- Express.js
- SQLite
- better-sqlite3
- CORS

### Storage

- SQLite database
- User table
- Task table

---
## Project Structure

```txt
project/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── tasks.db
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── backendApi.ts
    │   │
    │   ├── components/
    │   │   └── VoiceAssistant.tsx
    │   │
    │   ├── services/
    │   │   └── gemini.ts
    │   │
    │   ├── types/
    │   │   ├── assistant.ts
    │   │   └── task.ts
    │   │
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    │
    ├── .env
    ├── package.json
    └── vite.config.ts
```

---

## Setup Instructions

### Prerequisites

Before running the project, make sure the following are installed:

```txt
Node.js
npm
Google Chrome
```

Google Chrome is recommended because browser speech recognition works best in Chrome.

---

## Backend Setup

Open a terminal and go to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Start the backend server:

```bash
npm run dev
```

The backend runs on:

```txt
http://localhost:4000
```

---

## Frontend Setup

Open a second terminal and go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `frontend` folder:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Start the frontend:

```bash
npm run dev
```

The frontend runs on:

```txt
http://localhost:5173
```

---

## Environment Variables

The frontend requires a Gemini API key.

## Authentication

Authentication is handled through the backend API.

The frontend sends signup and login requests to the Express backend. After a successful login or signup, the returned user object is stored as a local session in the browser.

The `AuthUser` type is defined in `src/api/backendApi.ts` and contains:

```ts
{
  id: string;
  name: string;
  email: string;
}

## Database Design

The backend uses SQLite.

### Users Table

Stores registered users:

```txt
id
name
email
password
created_at
```

### Tasks Table

Stores user-specific tasks:

```txt
id
user_id
title
date
time
completed
created_at
```

Each task belongs to a specific user through `user_id`.
---

## Gemini Intent Parsing

Gemini is used as a natural language parser.

It receives:

```txt
User command
Current task list
Conversation context
```

It returns a JSON intent.

Supported intents:

```txt
create_tasks
read_tasks
update_task
delete_task
confirm
cancel
clarify
unknown
```
---
## Failure Handling

The application handles several failure situations gracefully:

- Unclear voice commands
- Speech recognition errors
- Text-to-Speech errors
- Missing microphone permission
- Gemini quota errors
- Gemini service unavailable errors
- Gemini timeout errors
- Invalid or unavailable Gemini model
- Backend request errors
- No matching task found
- Multiple matching tasks found
- Cancelled delete confirmation

If the assistant cannot understand a command, it does not perform an incorrect action. Instead, it asks a clarification question or gives a fallback response.

---

## Reliability Expectations

The assistant follows these reliability rules:

- It validates actions before execution.
- It checks whether a target task exists before updating or deleting.
- It asks for confirmation before deleting a task.
- It does not delete tasks immediately after the first delete command.
- It keeps conversation context for commands like "the previous one" or "the second one".
- It gives fallback responses when Gemini, speech recognition, or backend requests fail.
- It keeps task actions voice-based and avoids manual CRUD buttons.

---

## Interruption Handling

The assistant supports basic interruption handling.

Before starting a new listening session, the application cancels any current Text-to-Speech playback using:

```ts
window.speechSynthesis.cancel();
```

## Assessment Requirements Covered

This project covers the required assessment features:

- Voice-based task creation
- Voice-based task reading
- Voice-based task updating
- Voice-based task deletion
- No manual task CRUD buttons
- No edit buttons
- No delete buttons
- Speech-to-Text
- Text-to-Speech
- Real-time voice interaction
- Natural conversational task handling
- Context-aware follow-up commands
- Semantic understanding using Gemini
- Multiple task handling
- Delete confirmation before destructive actions
- Signup
- Login
- Session handling
- Persistent storage using SQLite
- Failure handling for unclear commands, STT errors, TTS errors, Gemini errors, and backend errors

WebSocket disconnect handling is not applicable because this implementation uses HTTP API requests instead of WebSockets.

---
## Known Limitations

- Browser speech recognition works best in Google Chrome.
- Gemini free-tier availability may depend on quota and temporary model demand.
- The frontend requires internet access for Gemini API calls.
- Authentication is simplified for demo purposes.
- The project is optimized for assessment/demo usage, not production deployment.

---


