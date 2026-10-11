# Medinex — Role-Based Healthcare Management Platform

Medinex is a full-stack healthcare platform that connects hospitals, doctors, patients and pharmacists in one system, with role-based access and safety checks built into the prescription workflow.

## Features

- **Role-based access** for Admin, Hospital, Doctor, Patient and Pharmacist, each with its own dashboard
- **Hospital approval workflow**, where the Admin reviews and approves hospital registrations
- **Automated drug-interaction and allergy checks** when a doctor writes a prescription
- **Auto-expiring prescriptions**
- **OTP-verified pharmacy access** to prescriptions
- **Prescription history and download** for patients
- **Patient lab report module** that processes uploaded reports and generates automated summaries (AI-assisted)
- **Account recovery** with forgot-password and reset-password flows

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), Bootstrap, CSS |
| Backend | Node.js, Express.js (REST APIs) |
| Database | MySQL |
| AI summaries | Gemini and Groq APIs (configured through environment variables) |
| Tests | Backend tests in `backend/tests` |

## Project Structure

```
medinex-workspace/
├── backend/
│   ├── config/         # Database connection
│   ├── controllers/    # Business logic per role
│   ├── middleware/     # Auth and role checks
│   ├── routes/         # REST API routes
│   ├── utils/          # Prescription utilities, AI service
│   ├── tests/          # Backend tests
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/ # Dashboards, login, register, etc.
│       └── ...
└── docs/               # Abstract, requirements, UML and design documents
```

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- MySQL server running locally

### 1. Clone the repository

```bash
git clone https://github.com/meringeo1011-coder/medinex-workspace.git
cd medinex-workspace
```

### 2. Set up the database

Import the schema (creates the `medinex_db` database and all tables):

```bash
mysql -u root -p < database.sql
```

Or open phpMyAdmin → **Import** → choose `database.sql`.

Then create an admin account. From the `backend` folder, generate a password hash:

```bash
node -e "console.log(require('bcrypt').hashSync('YourStrongPassword', 10))"
```

and run this in MySQL, pasting the hash:

```sql
USE medinex_db;
INSERT INTO users (name, email, password, role, is_active, approval_status, is_email_verified)
VALUES ('Admin', 'admin@example.com', '<PASTE_HASH_HERE>', 'Admin', 1, 'Approved', 1);
```

### 3. Configure environment variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
DB_HOST=127.0.0.1
DB_PORT=3308
DB_USER=root
DB_PASSWORD=
DB_NAME=medinex_db
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

> Never commit your real `.env` file. It is listed in `.gitignore`.

### 4. Run the backend

```bash
cd backend
npm install
node server.js
```

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown in the terminal (Vite usually uses `http://localhost:5173`).

## Security Notes

- Secrets and API keys are read from environment variables and never hard-coded.
- Logs avoid printing API keys or patient data.
- Role checks are enforced on the server for protected routes.
- Uploaded files (`uploads/`) are excluded from version control.

## Future Improvements

- Larger and clinically verified drug-interaction dataset
- Notifications for expiring prescriptions
- Deployment with Docker and a hosted database

## Author

**Merin Geo** — Integrated MCA student, Saintgits College of Engineering
[GitHub](https://github.com/meringeo1011-coder)
