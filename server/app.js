import express from 'express';
import cors from 'cors';
import folderRoutes from './routes/folderRoutes.js';
import tasksRoutes from './routes/tasksRoutes.js';

const app = express();

//middlewares
app.use(cors());
app.use(express.json());

//routes
app.use('/api/folders', folderRoutes);
app.use('/api/tasks', tasksRoutes);

export default app;