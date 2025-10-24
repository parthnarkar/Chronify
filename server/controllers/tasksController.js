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
        const folderDoc = await Folder.findOne({ _id: folder, owner, deletedAt: null })
        if (!folderDoc) {
            return res.status(404).json({ message: 'Folder not found for this user' })
        }

        // initialize timestamps for the initial status and priority history
        const now = new Date()
        const timestamps = {
            pendingTimestamps: [],
            completedTimestamps: []
        }
        const initialStatus = currentStatus || 'Pending'
        if (initialStatus === 'Pending') timestamps.pendingTimestamps.push(now)
        if (initialStatus === 'Completed') timestamps.completedTimestamps.push(now)

        const initialPriority = req.body.priority || 'low'

    const task = new Tasks({ title, description, currentStatus: initialStatus, dueDate, folder, owner, priority: initialPriority, priorityHistory: [initialPriority], ...timestamps })
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

    // only return non-deleted tasks
    const tasks = await Tasks.find({ owner, deletedAt: null }).populate("folder", "name"); //populate folder name
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
    const { currentStatus, title, description, dueDate, folder, priority } = req.body;
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })

        // Validate status if provided
        const validStatus = ["Pending", "Completed"];
        if (currentStatus && !validStatus.includes(currentStatus)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        // Load existing task to compare and append timestamps/history as needed
    const existing = await Tasks.findOne({ _id: req.params.id, owner, deletedAt: null })
    if (!existing) return res.status(404).json({ message: 'Task not found' })

        // if folder is being changed, validate it exists and belongs to user
        if (folder) {
            const Folder = (await import('../models/Folder.js')).default
            const folderDoc2 = await Folder.findOne({ _id: folder, owner, deletedAt: null })
            if (!folderDoc2) return res.status(404).json({ message: 'Target folder not found for this user' })
        }

        const setFields = {}
        const ops = { }

        // update simple fields when provided
        if (typeof title !== 'undefined') setFields.title = title
        if (typeof description !== 'undefined') setFields.description = description
        if (typeof dueDate !== 'undefined') setFields.dueDate = dueDate
        if (typeof folder !== 'undefined') setFields.folder = folder

        // handle status change and timestamp pushes
        if (currentStatus && currentStatus !== existing.currentStatus) {
            setFields.currentStatus = currentStatus
            const now2 = new Date()
            if (currentStatus === 'Pending') ops.pendingTimestamps = now2
            if (currentStatus === 'Completed') ops.completedTimestamps = now2
        }

        // handle priority change independently of status
        if (typeof priority !== 'undefined' && priority !== existing.priority) {
            setFields.priority = priority
            // record the name into priorityHistory (push)
            ops.priorityHistory = priority
        }

        // build update object for mongoose
        const updateObj = { $set: setFields }
        if (ops.pendingTimestamps || ops.completedTimestamps || ops.priorityHistory) {
            updateObj.$push = {}
            if (ops.pendingTimestamps) updateObj.$push.pendingTimestamps = ops.pendingTimestamps
            if (ops.completedTimestamps) updateObj.$push.completedTimestamps = ops.completedTimestamps
            if (ops.priorityHistory) updateObj.$push.priorityHistory = ops.priorityHistory
        }

        const task = await Tasks.findOneAndUpdate(
            { _id: req.params.id, owner, deletedAt: null },
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

    // soft-delete the task by setting deletedAt
    const task = await Tasks.findOneAndUpdate({ _id: req.params.id, owner, deletedAt: null }, { $set: { deletedAt: new Date() } }, { new: true });
    if (!task) return res.status(404).json({ message: "Task not found" });

    res.json({ message: "Task deleted (soft)" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};