# 🌿 JanSeva: Intelligent Resource Allocation Platform

JanSeva is a state-of-the-art civic-tech platform that empowers NGOs to manage disaster relief and community development through data-driven intelligence. By bridging the gap between donors, volunteers, and high-need regions, JanSeva ensures that every Rupee and every hour of volunteer time is directed where it will have the maximum impact.

---

## ✨ Key Features

### 🧠 ML Intelligence Hub
Our core engine uses advanced clustering and scoring algorithms to analyze village vulnerability across four key domains: **Health, Food Security, Education, and Shelter**.
- **Vulnerability Scoring**: Automated ranking of villages based on multi-dimensional survey data.
- **Priority Classification**: Categorization of mission zones into `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` tiers.

### ⚖️ Smart Resource Pipeline
- **Proportional Fund Distribution**: Automatically splits campaign budgets based on vulnerability indices. High-need villages receive larger shares of aid without manual calculation.
- **Diversity-Matched Volunteer Assignment**: A round-robin interleaved algorithm that ensures every village gets a balanced group of experienced (Tier A/B) and novice volunteers, preventing "expertise silos."
- **Multi-Domain Targeting**: Support for campaigns focusing on specific sectors (e.g., Medical missions) or broad "Multi-Domain Aid" missions.

### 📊 Real-time Dashboard
- **Impact Visualizations**: Dynamic heatmaps and charts showing resource distribution.
- **NGO Mission Control**: Comprehensive tools for NGOs to create campaigns, ingest survey data via CSV, and monitor deployment plans.
- **Volunteer Tracking**: Real-time registration and match status updates.

---

## 📁 Project Architecture

```bash
JanSeva/
├── Frontend/           # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # ML Hub, Dashboards, Campaign Details
│   │   └── utils/      # API wrappers and data formatters
├── Backend/            # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── controllers/# Campaign, User, and NGO logic
│   │   ├── models/     # Mongoose Schemas (Campaigns, VillageScores, Assignments)
│   │   └── routes/     # API endpoints
├── ML/                 # Intelligent Matching Core
│   ├── controllers/    # Proportional allocation and diversity algorithms
│   └── python/         # ML seeding and data processing scripts
└── scratch/            # Administrative and maintenance utilities
```

---

## 🚀 Installation & Setup

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MongoDB** (Local instance or Atlas URI)
- **npm** or **yarn**

### 2. Backend Setup
```bash
cd Backend
npm install
# Configure your .env file with MONGO_URI, JWT_SECRET, etc.
npm run dev
```

### 3. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000` (or `5173` depending on configuration).

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS 4, Recharts |
| **Backend** | Node.js, Express, Mongoose |
| **Database** | MongoDB |
| **Security** | JWT, Passport.js, Helmet, Rate Limiting |
| **ML Engine** | Custom JavaScript Heuristics & Python Data Tools |

---

## 🤝 Contributing

We welcome contributions to make JanSeva even more effective!
1. **Fork** the repository.
2. **Branch**: `git checkout -b feature/amazing-feature`.
3. **Commit**: `git commit -m "feat: adds specific value"`.
4. **Push**: `git push origin feature/amazing-feature`.
5. **Open PR**: Submit a pull request for review.

---

## 📃 License

This project is licensed under the **MIT License**. See `LICENSE` for more details.

---
*Built with ❤️ for social impact by the JanSeva Team.*
