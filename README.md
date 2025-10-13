# PGB Event Scheduler - Frontend

## 🎯 React Frontend Application for .gov.ph Deployment

This is the separated frontend repository for the PGB Event Scheduler system.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm install
npm run build
```

### Docker Deployment
```bash
docker build -t pgb-frontend .
docker run -p 80:80 pgb-frontend
```

## 🔧 Environment Variables

Create `.env` file:
```env
VITE_API_URL=https://api-pgb-events.gov.ph
VITE_SOCKET_URL=https://api-pgb-events.gov.ph
VITE_NODE_ENV=production
```

## 📁 Project Structure
```
src/
├── components/     # React components
├── hooks/         # Custom hooks
├── lib/           # Utilities
└── styles/        # CSS files
```

## 🏗️ For IT Department (Coolify Deployment)

1. **Service Type**: Docker
2. **Port**: 80
3. **Domain**: pgb-events.gov.ph
4. **Environment Variables**: See .env.example
5. **Build Command**: `npm run build`

## 📞 Support
Contact development team for technical issues.
