#  CollabBoard – Real-time Collaborative Canvas

A modern, feature-rich collaborative drawing application built with **Fabric.js**, **Yjs**, **Socket.io**, and **React**.

##  Features

- ️ **Real-time Drawing** – Multiple users drawing on the same canvas simultaneously
-  **Live Collaboration** – See cursor positions and presence of collaborators
-  **Auto-save** – Canvas state persists to MongoDB
-  **Optimized Sync** – Message batching for efficient network usage
- ️ **Secure** – JWT authentication, HttpOnly cookies, CORS protection
-  **Production-ready** – Deployed on Railway + Vercel

---

##  Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB Atlas** account (free tier works)
- **VSCode** or your favorite editor

### Local Development

1. **Clone and install dependencies**:
```bash
git clone <repository>
cd collabboard

# Install root dependencies (if any)
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies  
cd ../client && npm install
```

2. **Set up environment variables**:
```bash
# Copy template and fill in values
cp .env.example .env
cp client/.env.example client/.env

# Edit with your MongoDB URI and JWT secrets
nano .env
```

3. **Start the application**:
```bash
# Terminal 1: Start server (port 5000)
cd server && npm run dev

# Terminal 2: Start client (port 5173 with Vite proxy)
cd client && npm run dev
```

4. **Open browser**:
- Visit `http://localhost:5173`
- Register and create a board
- Share the invite code with others to collaborate!

---

##  Project Structure

```
collabboard/
├── server/                    # Express + Socket.io backend
│   ├── src/
│   │   ├── config/           # JWT, Database config
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── models/           # Mongoose schemas (User, Board)
│   │   ├── routes/           # Auth & Board API routes
│   │   ├── socket/           # Real-time socket handlers
│   │   └── index.js          # Server entry point
│   └── package.json
│
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── context/          # React Context (Auth)
│   │   ├── hooks/            # Custom hooks (useCollaboration)
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── utils/            # API, Socket, Helpers
│   │   └── main.jsx
│   ├── vite.config.js        # Vite configuration
│   └── package.json
│

├── .env.example              # Sample environment config
└── README.md                 # This file
```

---

##  Configuration

### Environment Variables

**Server (.env)**:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
CLIENT_URL=http://localhost:5173
```

**Client (client/.env)**:
```env
VITE_SERVER_URL=          # Empty for dev (uses proxy), URL for production
```

See [`.env.example`](./.env.example) for complete reference.

---

## ️ Development

### Available Commands

**Server**:
```bash
npm run dev      # Start with nodemon (auto-reload)
npm run start    # Start in production
```

**Client**:
```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Key Technologies

- **Backend**: Express.js, Socket.io, Mongoose, JWT
- **Frontend**: React 18, Vite, Tailwind CSS, Fabric.js
- **Collaboration**: Yjs + y-protocols for CRDT sync
- **Database**: MongoDB Atlas
- **Deployment**: Railway (backend) + Vercel (frontend)

---

##  ️ Common Issues & Troubleshooting

### Socket Connection Error 'NO_TOKEN'
- Ensure you're logged in before accessing the board
- Check that login returned an accessToken


### Slow Collaboration / Canvas not syncing
- Check WebSocket connection: DevTools → Network → WS
- Multiple users must be in the same room
- Check server logs for socket errors: `railway logs`


### CORS Errors in Production
- **Critical**: Set `CLIENT_URL` to match your exact Vercel URL
- Must include `https://` and exact domain


### Cannot Connect to MongoDB
- Check `MONGODB_URI` is correct
- Add Railway IP to MongoDB Atlas Network Access




---

##  Production Deployment

### Deploy to Railway (Backend)

1. **Connect GitHub**:
   - Push your code to GitHub
   - Link Railway to your GitHub account

2. **Set environment variables in Railway**:
   - `MONGODB_URI` – Your MongoDB connection string
   - `JWT_ACCESS_SECRET` – Random 32-char string
   - `JWT_REFRESH_SECRET` – Different random 32-char string
   - `CLIENT_URL` – Your Vercel deployment URL (with https://)
   - `NODE_ENV` – `production`

3. **Deploy**:
   ```bash
   npm install -g @railway/cli
   railway link
   railway up
   ```

### Deploy to Vercel (Frontend)

1. **Push to GitHub** and connect Vercel
2. **Build command**: `cd client && npm run build`
3. **Output directory**: `client/dist`
4. **Environment variables**:
   - `VITE_SERVER_URL` – Your Railway backend URL (e.g., https://app-name.railway.app)
5. **Deploy** – Vercel will auto-deploy on push

### Verify Deployment

```bash
# Test server health
curl https://your-railway-url.railway.app/health

# Monitor logs
railway logs --follow

# Check socket connection
# Open DevTools in Vercel app → Network → look for WebSocket
```



---

##  API Documentation

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |

### Boards

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/boards` | List user's boards |
| POST | `/api/boards` | Create new board |
| GET | `/api/boards/:id` | Get board details |
| PATCH | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| GET | `/api/boards/join/:roomCode` | Join via share code |

### WebSocket Events

**Client → Server**:
- `room:join` – Join collaborative room
- `yjs:message` – Yjs sync protocol (binary)
- `canvas:save` – Save canvas state
- `cursor:move` – Broadcast cursor position
- `board:title-update` – Update board title

**Server → Client**:
- `room:joined` – Room join successful
- `room:user-joined` – Another user joined
- `room:user-left` – User disconnected
- `yjs:message` – Yjs sync messages (binary)
- `cursor:moved` – Cursor position from another user
- `board:title-updated` – Title updated by another user

---

##  Security Considerations

-  JWT tokens with 15-minute expiration (refreshable for 7 days)
-  HttpOnly, Secure cookies prevent XSS attacks
-  CORS whitelist restricts cross-origin requests
-  Helmet.js adds security headers
-  Rate limiting on auth endpoints (10 attempts per 15min)
-  No sensitive data in localStorage (uses sessionStorage + HttpOnly cookies)

---

##  License

MIT License – See LICENSE file for details.

---

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

##  Support


- **Questions**: Open a GitHub issue
- **Bug reports**: Include server logs and browser console errors

---

**Happy Collaborating! **
