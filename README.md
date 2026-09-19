# Mamta Hospital Telemedicine Platform Foundation

A modern, full-stack video-consultation booking system and administration dashboard designed to surround Mamta Hospital's existing Framer website.

---

## 1. Project Architecture

The project is structured into two main components:
- **`backend/`**: A Node.js + Express REST API using ES Modules and Mongoose to connect to MongoDB. Configured with security headers (Helmet), CORS policies, request rate-limiting, validations, and JWT admin authentication.
- **`admin/`**: A single-page admin panel built with React, Vite, and React Router. Designed with a custom professional healthcare UI written in Vanilla CSS and utilizing Lucide Icons.

```text
hospital-telemedicine/
├── backend/            # Express REST API (NodeJS)
│   ├── src/
│   │   ├── config/     # Database, Razorpay, Google configs
│   │   ├── controllers/# Auth, Doctors, Availability, Bookings logic
│   │   ├── middleware/ # Token checks, global errors, 404
│   │   ├── models/     # Mongoose Schemas (Admin, Doctor, Booking...)
│   │   ├── routes/     # Express route handlers
│   │   ├── services/   # Slots generation, mock Razorpay, mock Meet
│   │   ├── utils/      # IDs, slots helpers, responses
│   │   ├── app.js      # App middleware configuration
│   │   └── server.js   # DB connection & server runner
│   └── package.json
│
├── admin/              # React Vite SPA Dashboard
│   ├── src/
│   │   ├── context/    # Session Auth Context (bearer tokens)
│   │   ├── layouts/    # Collapsible sidebar main panel layout
│   │   ├── pages/      # Login, Dashboard, Doctors, Availability, Bookings, Settings
│   │   ├── services/   # Axios API client interceptors
│   │   ├── App.jsx     # App route layout configuration
│   │   └── main.jsx    # React entry point
│   └── package.json
│
└── README.md
```

---

## 2. Environment Variables Setup

Before running the application, set up the environment variables:

### Backend Configuration
Create a `.env` file in the `backend/` directory (you can copy `.env.example` as a template):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mamta-hospital-telemedicine
JWT_SECRET=super_secret_jwt_key_for_authentication
JWT_EXPIRES_IN=7d

# Placeholders (Not live yet, but required)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=

FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5173
```

### Admin Panel Configuration
Create a `.env` file in the `admin/` directory (or copy `.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 3. MongoDB Setup

1. Make sure you have a MongoDB instance running locally (e.g., `mongodb://127.0.0.1:27017`) or configure a remote MongoDB Atlas URI.
2. The database will automatically initialize schemas, indexes, and collections upon starting the backend application.

---

## 4. How to Create the First Admin

Public sign-ups are disabled. You must run the seed script to create the initial admin user.

From the `backend/` directory, run:
```bash
npm run seed
```
This will seed the database with the following default admin credentials:
- **Email**: `admin@mamtahospital.com`
- **Password**: `MamtaHospital@2026`

*To customize these before seeding, set `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` in your backend `.env` file.*

---

## 5. Running the Application

### Running the Backend
From the `backend/` directory:
```bash
# Install dependencies (if not done)
npm install

# Start in development mode with automatic reload (nodemon)
npm run dev

# Start in production mode
npm start
```
The API server will launch at `http://localhost:5000`.

### Running the Admin Panel
From the `admin/` directory:
```bash
# Install dependencies (if not done)
npm install

# Run the local Vite dev server
npm run dev
```
The React interface will run at `http://localhost:5173`. Open it in your web browser.

---

## 6. Key API Endpoints

### Authentication
- `POST /api/auth/login` - Public credentials login (returns JWT token and safe admin details).
- `GET /api/auth/me` - Protected. Returns profile parameters of current admin.

### Doctors Management
- `GET /api/doctors` - Public. List all active doctors. (Lists active + inactive if Admin header present).
- `GET /api/doctors/:id` - Public. Get doctor profile details.
- `POST /api/doctors` - Protected. Add a new doctor.
- `PUT /api/doctors/:id` - Protected. Update doctor details.
- `DELETE /api/doctors/:id` - Protected. Deactivate doctor profile (soft deletes if bookings exist, hard deletes if clean).

### Doctor Availability
- `GET /api/availability/:doctorId` - Public. Get recurring schedule entry list.
- `POST /api/availability` - Protected. Add availability configurations for a day.
- `PUT /api/availability/:id` - Protected. Edit availability parameters.
- `DELETE /api/availability/:id` - Protected. Delete schedule entry.

### Slots Generation
- `GET /api/doctors/:doctorId/slots?date=YYYY-MM-DD` - Public. Generates available slot intervals on a specific date, factoring in recurring schedules, excluding overlaps with active bookings, and filtering out slots that lie in the past (based on `Asia/Kolkata` IST timezone).

### Bookings
- `POST /api/bookings` - Public. Create a new pending consultation booking. Triggers Razorpay order creation placeholder.
- `GET /api/bookings/:bookingId` - Public. Get details of booking by bookingId string (e.g., `HC-20260825-0001`).
- `GET /api/admin/bookings` - Protected. Filterable list of all consultations.
- `PUT /api/admin/bookings/:id` - Protected. Edit statuses. Triggers Google Meet link generation if status updated to `confirmed`.

---

## 7. Google Calendar & OAuth 2.0 Setup

The backend uses **Google Calendar API** with **OAuth 2.0** to automatically create Google Meet video links when an appointment is confirmed.

### 7.1 — Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `Mamta Hospital Telemedicine`).
3. Enable the **Google Calendar API** for the project.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
5. Select **Web application**.
6. Under **Authorized Redirect URIs**, add **exactly**:
   ```
   https://mamta-hospital-telemedicine.onrender.com/api/auth/google/callback
   ```
7. Download/copy the **Client ID** and **Client Secret**.

### 7.2 — Environment Variables

Set these in your Render dashboard (or `.env` for local):

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret — **never expose this** |
| `GOOGLE_REDIRECT_URI` | `https://mamta-hospital-telemedicine.onrender.com/api/auth/google/callback` |
| `GOOGLE_REFRESH_TOKEN` | Obtained via OAuth flow (step 7.3 below) |
| `GOOGLE_CALENDAR_ID` | `primary` (uses the hospital Google account's main calendar) |

### 7.3 — Generating the Refresh Token (One-Time Setup)

1. Deploy the backend to Render with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` set.
2. Open a browser and visit:
   ```
   https://mamta-hospital-telemedicine.onrender.com/api/auth/google
   ```
3. Sign in with the **hospital's Google account** that owns the calendar.
4. Grant the **Google Calendar** permission when prompted.
5. Google redirects to `/api/auth/google/callback`.
6. Open Render **Logs** — you will see:
   ```
   ║  GOOGLE_REFRESH_TOKEN=1//04xxxxxxxxxxxxxxxxxxxxxxx...
   ```
7. Copy the refresh token value.
8. Add it as `GOOGLE_REFRESH_TOKEN` in Render environment variables.
9. **Redeploy** the backend service.

> ⚠️ **Security**: The refresh token is printed to server logs only. It is **never** sent to the browser or returned in any API response. Do not commit it to Git.

### 7.4 — Booking Flow (End-to-End)

```
Patient → Select Doctor → Select Date → Select Time → Enter Details → Submit
    ↓
Backend validates booking (doctor active, slot available, no conflicts)
    ↓
Booking saved to MongoDB (status: pending)
    ↓
Patient verifies payment → POST /api/payments/verify
    ↓
Google Calendar event created with unique Google Meet link (Asia/Kolkata timezone)
    ↓
Booking updated: googleMeetUrl + googleCalendarEventId saved to MongoDB
    ↓
Resend confirmation email sent to patient with Meet link
    ↓
Response returned to frontend with confirmed booking details
```

### 7.5 — New API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/auth/google` | Redirects to Google consent page |
| `GET` | `/api/auth/google/callback` | Handles OAuth callback, logs refresh token server-side |
| `GET` | `/api/health` | Health check — returns service status & DB state |

---

## 8. Deployment Notes (Render + Vercel)

### Backend on Render
- Set all environment variables in the Render dashboard under **Environment**.
- The `GOOGLE_REDIRECT_URI` must exactly match the URI registered in Google Cloud Console.
- After setting `GOOGLE_REFRESH_TOKEN`, redeploy for changes to take effect.

### Admin / Consultation Frontends on Vercel
- Set `VITE_API_URL=https://mamta-hospital-telemedicine.onrender.com/api` in Vercel environment.
- Admin frontend runs at the Vercel deployment URL.
- Vercel SPA redirect rules are configured in `admin/vercel.json` and `consultation/vercel.json`.

---

## 9. Security Notes

- `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN` are **never** sent to the frontend.
- `.env` is listed in `.gitignore` — never commit it.
- JWT tokens protect all admin-only routes.
- Rate limiting (200 requests / 15 min per IP) is applied to all `/api` routes.
- Helmet security headers are enabled.
- CORS is locked to the listed frontend origins only.
