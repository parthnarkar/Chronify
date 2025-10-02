import express from 'express';
import cors from 'cors';
import folderRoutes from './routes/folderRoutes.js';
import tasksRoutes from './routes/tasksRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

//middlewares
app.use(cors());
app.use(express.json());

//routes
app.use('/api/folders', folderRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api', authRoutes);

// Test route
app.get("/api/health", (req, res) => {
    res.json({ status: "Server is running ✅" });
});

export default app;