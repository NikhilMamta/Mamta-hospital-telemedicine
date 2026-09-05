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

## 7. Future Integrations (Architecture Placeholders)

### Razorpay Payments (`backend/src/services/paymentService.js`)
- Currently generates mock Razorpay order configurations (`order_xxx`).
- Saves the order ID to the Booking record with `paymentStatus = pending`.
- When real API keys are ready, uncomment the import of `razorpay` and initialization in `config/razorpay.js`, then plug in the creation and signature checks using Node's standard crypto library.

### Google Meet & Calendar (`backend/src/services/googleMeetService.js`)
- Triggers mock scheduling whenever a booking is marked `confirmed` or `paid` in the admin manager.
- Currently responds with mock googleEventId and a mock meet link (`https://meet.google.com/abc-defg-hij`).
- For production, configure Google Console OAuth credentials, download the Google API client (`googleapis`), initialize the calendar client in `config/google.js`, and uncomment the conference event creator in the service layer.

---

## 8. Deployment Notes (Vercel-compatible)

To deploy to Vercel:
1. Backend is fully structured as a modular server. In `backend/vercel.json`, you can define a route rewrite to direct `/api/(.*)` to `src/server.js` or `src/app.js` using `@vercel/node`.
2. Admin frontend can be deployed as static site files (SPA redirect rules configured in `admin/vercel.json`).
3. Set your environment variables (`MONGODB_URI`, `JWT_SECRET`, etc.) inside the Vercel dashboard.
