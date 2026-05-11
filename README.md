# Smart Geo Attendance Platform (Multi-College)

A complete, professional Smart Geo Attendance System built entirely from scratch using only **FREE tools** and free-tier services. Designed for deployment on **Vercel** with a **MongoDB Atlas free tier**, featuring real browser-based **AI face matching** and **Google OAuth**.

---

## 🚀 Features

- **Multi-College Support:** Teachers/Admins can register their own colleges.
- **Dynamic Geolocation:** Each college has its own campus coordinates, radius, and attendance window.
- **Real AI Face Verification:** Browser-based face matching (`face-api.js`) against stored 128-D descriptors ensures true identity verification (no fake overlays).
- **Google Authentication:** Secure login for students and admins without managing passwords.
- **Premium UI:** Futuristic SaaS style, glassmorphism, and smooth animations using TailwindCSS.
- **Zero Cost:** Hosted on Vercel (free), DB on MongoDB Atlas (free), Auth via NextAuth+Google (free), AI via browser CPU (free).
- **Admin Dashboard:** Full analytics, attendance records, student management, and CSV exports.

---

## 🛠️ Technology Stack

- **Frontend & Backend:** Next.js 14 (App Router)
- **Styling:** TailwindCSS v3
- **Database:** MongoDB Atlas (M0 Free Tier)
- **Authentication:** NextAuth.js (Google Provider)
- **Face AI:** `face-api.js` (loaded via jsDelivr CDN)

---

## 📋 Setup & Installation

### 1. Prerequisites
- Node.js 18+ installed
- A Google Cloud account (for OAuth credentials)
- A MongoDB Atlas account (free tier)

### 2. Environment Variables
Copy the `.env.local.example` file to `.env.local` and configure your credentials:

```bash
cp .env.local.example .env.local
```

You must obtain:
- `MONGODB_URI`: From MongoDB Atlas.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console -> APIs & Services -> Credentials.
- `NEXTAUTH_SECRET`: Generate using `openssl rand -base64 32`.

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🚀 Deployment to Vercel (Free Hosting)

1. Push this code to a new GitHub repository.
2. Go to [Vercel](https://vercel.com/) and create a new project.
3. Import your GitHub repository.
4. Go to **Environment Variables** in the Vercel project settings and paste all values from your `.env.local`.
   - *Important: Ensure `NEXTAUTH_URL` is set to your production Vercel URL (e.g., `https://my-attendance-app.vercel.app`).*
5. In your Google Cloud Console, add your Vercel URL to the **Authorized redirect URIs** (e.g., `https://my-attendance-app.vercel.app/api/auth/callback/google`).
6. Click **Deploy**.

---

## 📖 Usage Flow

### Admin Setup
1. Go to `/admin/login` and sign in with Google.
2. The system detects you are a new admin and redirects you to the Setup page.
3. Enter your college name, campus coordinates, radius, and timing window.
4. You'll be redirected to your secure Dashboard to view stats and manage attendance for your college only.

### Student Flow
1. Go to the root page (`/`) and sign in with Google.
2. The first time, you will be redirected to Onboarding (`/onboard`).
3. Select the college your admin created.
4. Enter your details and let the AI scan your face to register your identity.
5. On the main page, your GPS location is checked against your college's settings.
6. The AI verifies your face live against your stored profile.
7. Click **Mark Attendance** to securely submit.
