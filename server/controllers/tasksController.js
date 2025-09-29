import Tasks from "../models/Tasks.js";

//Create a new task
export const createNewTask = async (req, res) => {
    try {
        const { title, description, status, dueDate, folder } = req.body;

        if (!title || !folder) {
            return res.status(400).json({ message: "Title and folder are required" });
        }

        const task = new Tasks({ title, description, status, dueDate, folder })
        await task.save();

        res.status(201).json(task);
    }
    catch (error) {
        res.status(401).json({ message: error.message });
    }
};

//Get all tasks (with folder info)
export const getAllTasks = async (req, res) => {
    try {
        const tasks = await Tasks.find().populate("folder", "name"); //populate folder name
        res.json(tasks);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};

//Update the Task
export const updateTask = async (req, res) => {
    try {
        const { status, title, description, dueDate, folder } = req.body;

        // Validate status if provided
        const validStatus = ["pending", "in-progress", "completed"];
        if (status && !validStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const task = await Tasks.findByIdAndUpdate(
            req.params.id,
            { title, description, dueDate, folder, status },
            { new: true, runValidators: true } // ensures enum validation
        );

        if (!task) {
            res.status(400).json({ message: "Task not found" });
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
};

//Delete a Task
export const deleteTask = async (req, res) => {
    try {
        const task = await Tasks.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        res.json({ message: "Task deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};