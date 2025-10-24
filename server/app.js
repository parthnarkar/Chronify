import express from 'express';
import cors from 'cors';
import folderRoutes from './routes/folderRoutes.js';
import tasksRoutes from './routes/tasksRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

//middlewares
app.use(cors());
app.use(express.json());

// simple request logger to help debug owner header issues
app.use((req, res, next) => {
    const owner = req.headers['x-client-uid'] || null
    if (owner) console.log(`[req] ${req.method} ${req.path} X-Client-Uid=${owner}`)
    else console.log(`[req] ${req.method} ${req.path} (no X-Client-Uid)`)
    next()
})

//routes
app.use('/api/folders', folderRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api', authRoutes);

// Avatar proxy to avoid blocked third-party image/resource issues in dev
// Example: GET /api/avatar?u=<encoded image url>
app.get('/api/avatar', async (req, res) => {
    try {
        const url = req.query.u || req.query.url
        if (!url) return res.status(400).send('Missing url')
        // basic safety: only allow googleusercontent images for now
        const parsed = new URL(url)
        const hostname = parsed.hostname || ''
        if (!hostname.endsWith('googleusercontent.com')) {
            return res.status(403).send('Forbidden')
        }

        // use global fetch (Node 18+) to get the image
        const resp = await fetch(url)
        if (!resp.ok) return res.status(502).send('Failed to fetch')
        const contentType = resp.headers.get('content-type') || 'application/octet-stream'
        const buffer = await resp.arrayBuffer()
        res.setHeader('Content-Type', contentType)
        res.send(Buffer.from(buffer))
    } catch (err) {
        console.error('[avatar proxy] error', err)
        res.status(500).send('Internal error')
    }
})

// Test route
app.get("/api/health", (req, res) => {
    res.json({ status: "Server is running ✅" });
});

export default app;