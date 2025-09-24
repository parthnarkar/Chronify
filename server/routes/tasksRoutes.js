import express from "express";
import {
    createNewTask,
    getAllTasks,
    updateTask,
    deleteTask
} from "../controllers/tasksController.js";

const router = express.Router();

// Create a task
router.post("/", createNewTask);

// Get all tasks
router.get("/", getAllTasks);

// Update a task
router.put("/:id", updateTask);

// Delete a task
router.delete("/:id", deleteTask);

export default router;