import Tasks from "../models/Tasks.js";

//Create a new task
export const createNewTask = async (req, res) => {
    try {
        const { title, description, currentStatus, dueDate, folder } = req.body;
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })
        console.log(`[tasksController] createNewTask owner=${owner} body=`, { title, folder })

        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }
        if (!folder) {
            return res.status(400).json({ message: "Folder id is required" });
        }

        // ensure the folder exists and belongs to this owner
        const Folder = (await import('../models/Folder.js')).default
        const folderDoc = await Folder.findOne({ _id: folder, owner })
        if (!folderDoc) {
            return res.status(404).json({ message: 'Folder not found for this user' })
        }

        // initialize timestamps for the initial status
        const now = new Date()
        const timestamps = {
            pendingTimestamps: [],
            inProgressTimestamps: [],
            completedTimestamps: []
        }
        const initialStatus = currentStatus || 'pending'
        if (initialStatus === 'pending') timestamps.pendingTimestamps.push(now)
        if (initialStatus === 'in-progress') timestamps.inProgressTimestamps.push(now)
        if (initialStatus === 'completed') timestamps.completedTimestamps.push(now)

        const task = new Tasks({ title, description, currentStatus: initialStatus, dueDate, folder, owner, ...timestamps })
        await task.save();

        res.status(201).json(task);
    }
    catch (error) {
        console.error('[tasksController] createNewTask error', error)
        res.status(400).json({ message: error.message })
    }
};

//Get all tasks (with folder info)
export const getAllTasks = async (req, res) => {
    try {
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })
        console.log(`[tasksController] getAllTasks owner=${owner}`)

        const tasks = await Tasks.find({ owner }).populate("folder", "name"); //populate folder name
        res.json(tasks);
    }
    catch (error) {
        console.error('[tasksController] getAllTasks error', error)
        res.status(400).json({ message: error.message });
    }
};

//Update the Task
export const updateTask = async (req, res) => {
    try {
        const { currentStatus, title, description, dueDate, folder } = req.body;
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })

        // Validate status if provided
        const validStatus = ["pending", "in-progress", "completed"];
        if (currentStatus && !validStatus.includes(currentStatus)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        // If status is changing, append a timestamp to the corresponding array
        const existing = await Tasks.findOne({ _id: req.params.id, owner })
        if (!existing) return res.status(404).json({ message: 'Task not found' })

        const setFields = { title, description, dueDate, folder }
        const ops = {}
        if (currentStatus && currentStatus !== existing.currentStatus) {
            setFields.currentStatus = currentStatus
            const now = new Date()
            if (currentStatus === 'pending') ops.$push = { pendingTimestamps: now }
            if (currentStatus === 'in-progress') ops.$push = { inProgressTimestamps: now }
            if (currentStatus === 'completed') ops.$push = { completedTimestamps: now }
        }

        const updateObj = { $set: setFields, ...(ops.$push ? { $push: ops.$push } : {}) }

        const task = await Tasks.findOneAndUpdate(
            { _id: req.params.id, owner },
            updateObj,
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
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })

        const task = await Tasks.findOneAndDelete({ _id: req.params.id, owner });
        if (!task) return res.status(404).json({ message: "Task not found" });

        res.json({ message: "Task deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};