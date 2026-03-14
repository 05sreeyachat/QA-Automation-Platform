# QA Testing Dashboard

A professional QA automation platform for running Selenium UI tests and Postman API tests, visualized in a modern analytics dashboard.

## Prerequisites

Install the following before setup:

| Tool | Version |
|------|---------|
| Python | 3.9+ |
| Node.js | 18+ |
| Java JDK | 11+ |
| Apache Maven | 3.8+ |
| Google Chrome | Latest |
| Newman (Postman CLI) | `npm install -g newman` |

## Project Structure

```
qa-testing-dashboard/
├── backend/        # Python Flask API
├── frontend/       # React + Vite dashboard
├── tests/          # JUnit 5 + Selenium tests (Maven)
└── postman/        # Postman collection (Newman)
```

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Running Tests Manually (Optional)

**Selenium (JUnit):**
```bash
cd tests
mvn test
```

**Postman / Newman:**
```bash
cd postman
newman run reqres_collection.json --reporters json --reporter-json-export results.json
```

### 4. Open Dashboard

Visit: [http://localhost:5173](http://localhost:5173)

Click **"Run Test Suite"** to trigger all tests and view analytics.

---

> The backend triggers both Selenium + Newman tests and returns live analytics to the dashboard.
