->Moveinsync – Real-Time Vehicle Tracking & Geofence Automation

Moveinsync is a real-time vehicle tracking and geofence automation system designed for enterprise transport operations. It provides live vehicle monitoring, automatic trip updates, and geofence-based event handling to ensure operational efficiency and transparency.

->Project Overview & its working;

.To demonstrate real-time vehicle tracking without a physical GPS device, the system includes a built-in Trip Simulator.

->How It Works
.The simulator generates fake GPS coordinates
.Coordinates are sent to the backend every 5 seconds
.Backend processes the location update
.WebSocket pushes the update to the dashboard
.The vehicle marker moves smoothly on the map in real time
.This allows you to see the complete flow:
Simulator → Backend → Geofence Engine → Socket → Dashboard

->What It Demonstrates
.Live vehicle movement on the map
.Automatic geofence detection
.Pickup arrival events
.Automatic trip completion when entering office geofence

->Real-time event logging

->Why It’s Useful
.No physical GPS device required
.Easy testing and debugging
.Helps simulate multiple vehicles
.Ideal for demo and evaluation purposes

-> How to Use
.Open the dashboard
.Go to Trip Simulator
.Select an active trip
.Click Start

\*\*The vehicle will begin moving on the map, and geofence events will trigger automatically.

->Backend

-Technologies: Node.js, Express, MongoDB, Socket.io
-Features:

- JWT-based authentication
- Real-time WebSocket communication
- Geofence event processing (e.g., Pickup Arrived, Trip Completed)
- REST APIs for trips, vehicles, and geofence events
  -Folder Structure:
  -models: Contains Mongoose schemas for `User`, `Vehicle`, `Trip`, `Office`, and `GeofenceEvent`.
- `routes/`: Defines REST API endpoints for authentication, trips, vehicles, geofence events, and more.
- `services/`: Implements core business logic like geofence processing and notification handling.
- `utils/`: Utility functions such as geofence calculations.
- `scripts/`: Scripts for seeding data and running simulations.
  Frontend

-Technologies: React, Vite, TailwindCSS, Leaflet
-Features\*\*:

- User authentication (Sign up, Login)
- Live map visualization with vehicle markers
- Command center for trip and event monitoring
- Real-time updates via WebSocket

-Folder Structure:

- `src/components/`: Reusable UI components like `CommandCenter`, `Filters`, and `ProtectedRoute`.
- `src/pages/`: Page-level components such as `Dashboard`, `Login`, and `Signup`.
- `src/context/`: Context providers for managing global state (e.g., `AuthContext`).
- `src/hooks/`: Custom hooks like `useSocket` for WebSocket integration.
- `src/api/`: API client for interacting with the backend.

Key Features

1.Real-Time Location Streaming:

- Vehicles send GPS updates every 5 seconds.
- Updates are processed in real-time and displayed on the dashboard.

  2.Geofence Automation\*\*:

- Detects when a vehicle enters a pickup or office geofence.
- Triggers events like "Cab Arrived" or "Trip Completed" automatically.

  3.Command Center Dashboard:

- Displays active trips, recent events, and vehicle statuses.
- Provides filters for region, office, and time window.

  4.Trip Simulator:

- Simulates vehicle movement for testing geofence events.
- Can be started/stopped from the dashboard.

Setup Instructions

Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Copy the environment file and configure it:

   ```bash
   cp .env.example .env
   ```

   - Set `MONGODB_URI` and `JWT_SECRET`.

3. Install dependencies and start the server:
   ```bash
   npm install
   npm run dev
   ```
4. Seed sample data:
   ```bash
   node scripts/seed.js
   ```

Frontend

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Copy the environment file (optional):
   ```bash
   cp .env.example .env
   ```
3. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```
4. Open the app in your browser:
   - URL: `http://localhost:5173`

Environment Variables

Backend

- `MONGODB_URI`: MongoDB connection string (required)
- `JWT_SECRET`: Secret key for signing tokens (required)
- `PORT`: Server port (default: 5001)
- `GEOFENCE_MIN_DWELL_SECONDS`: Minimum time inside geofence (default: 30 seconds)

Frontend

- `VITE_API_URL`: Backend API URL
- `VITE_SOCKET_URL`: WebSocket URL

API Endpoints

-Auth:
.`POST /api/auth/signup`: User registration
.`POST /api/auth/login`: User login
->Trips:
.`GET /api/trips/active`: Fetch active trips
.`PATCH /api/trips/:tripId/status`: Update trip status
-Geofence Events:
.`GET /api/geofence-events`: Fetch recent events
-Simulator:
.`POST /api/simulator/start`: Start trip simulation
.`POST /api/simulator/stop`: Stop trip simulation

Real-Time Events

.`location:update`: Vehicle location updates
.`geofence:event`: Geofence entry/exit events
.`trip:update`: Trip status updates

Troubleshooting

-WebSocket Issues:

.Ensure the backend is running and accessible.
.Check `VITE_SOCKET_URL` in the frontend `.env` file.
.Simulator Not Working:
.Verify the backend is processing location updates.
.Check the trip status in the dashboard.

Production Notes
.Use HTTPS for secure communication.
.Configure environment variables for production.
.Use a managed database like MongoDB Atlas.

---

This project ensures real-time visibility and automation for enterprise transport operations, reducing manual intervention and improving efficiency.
