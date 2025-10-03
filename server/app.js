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

// Test route
app.get("/api/health", (req, res) => {
    res.json({ status: "Server is running ✅" });
});

export default app;