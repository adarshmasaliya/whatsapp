# WhatsApp AutoSaaS

A multi-user WhatsApp automation platform for businesses to connect their accounts and create keyword-based auto-replies.

## Features
- Multi-user authentication
- WhatsApp QR Code connection
- Keyword-based auto-replies
- Interactive Menu Builder
- Team Inbox
- Appointment Bookings
- Broadcast Messages
- Activity Logs

## Prerequisites
- Node.js (v18 or higher)
- npm

## Setup & Installation

1. **Clone the repository** (or download the source code).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your `GEMINI_API_KEY` and `APP_URL`.

## Running the Application

### Development Mode
To run the app in development mode with hot-reloading:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### Production Mode
To build and run the app for production:
1. **Build the frontend**:
   ```bash
   npm run build
   ```
2. **Start the server**:
   ```bash
   npm start
   ```
The production server will serve the built frontend from the `dist` directory.

## File Structure
- `server.ts`: The Express backend server and WhatsApp logic.
- `src/`: React frontend source code.
- `dist/`: Built frontend assets (generated after `npm run build`).
- `sessions/`: Directory where WhatsApp session data is stored (created automatically).
