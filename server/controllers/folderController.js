import Folder from "../models/Folder.js";
import Tasks from "../models/Tasks.js";

//Create a new folder
export const createFolder = async (req, res) => {
    try {
    const { name, icon } = req.body;
        const owner = req.headers['x-client-uid'] || null

        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })
        console.log(`[folderController] createFolder owner=${owner} body=`, { name })

        if (!name) {
            return res.status(400).json({ message: 'Folder name is required' });
        }

    const folder = new Folder({ name, owner, icon: icon || '📁' });
        await folder.save();

        res.status(201).json(folder);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

//Get all folders
export const getFoldersWithTasks = async (req, res) => {
    try {
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })

        // only return non-deleted folders and tasks
        let folders = await Folder.find({ owner, deletedAt: null }).lean();
        let tasks = await Tasks.find({ owner, deletedAt: null }).lean();

        // Ensure the 'All Tasks' default folder exists for every user
        let hasAll = folders.some(f => f.name === 'All Tasks')
        // star SVG used as default icon (clean format without XML declaration)
        const starSvg = `<svg width="20" height="20" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M923.2 429.6H608l-97.6-304-97.6 304H97.6l256 185.6L256 917.6l256-187.2 256 187.2-100.8-302.4z" fill="#FAD97F" /><path d="M1024 396H633.6L512 21.6 390.4 396H0l315.2 230.4-121.6 374.4L512 770.4l316.8 232L707.2 628 1024 396zM512 730.4l-256 187.2 97.6-302.4-256-185.6h315.2l97.6-304 97.6 304h315.2l-256 185.6L768 917.6l-256-187.2z" fill="" /></svg>`

        if (!hasAll) {
            const created = new Folder({ name: 'All Tasks', owner, icon: starSvg });
            await created.save();
            // re-query folders and tasks after creating default
            folders = await Folder.find({ owner, deletedAt: null }).lean();
            tasks = await Tasks.find({ owner, deletedAt: null }).lean();
            hasAll = true
        }

        // If 'All Tasks' exists but has no icon set, update it to use the star SVG so
        // existing users see the star by default (persisted in DB).
        if (hasAll) {
            const allFolder = folders.find(f => f.name === 'All Tasks')
            if (allFolder && (!allFolder.icon || allFolder.icon === '')) {
                await Folder.findOneAndUpdate({ _id: allFolder._id, owner }, { $set: { icon: starSvg } })
                // refresh folders after update
                folders = await Folder.find({ owner, deletedAt: null }).lean();
            }
        }

        //attach taks to their respective folders
        const data = folders.map(folder => ({
            ...folder,
            tasks: tasks.filter(task => task.folder.toString() === folder._id.toString())
        }));

        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

//Update the Folder Details (supports updating name and/or icon)
export const updateFolderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon } = req.body;
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })

        // Require at least one updatable field
        if (!name && typeof icon === 'undefined') {
            return res.status(400).json({ message: "Provide at least one field to update (name or icon)" });
        }

        const update = {}
        if (name) update.name = name
        if (typeof icon !== 'undefined') update.icon = icon

        const folder = await Folder.findOneAndUpdate(
            { _id: id, owner },
            update,
            { new: true }
        )

        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }

        res.json(folder);

    } catch (error) {
        console.error('[folderController] updateFolderDetails error', error)
        res.status(500).json({ message: "Internal server error" });
    }
};

//Delete the Folder (with Tasks)
export const deleteFolderWithTasks = async (req, res) => {
    try {
        const { id } = req.params;
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })

        //first checking the folder
        //first checking the folder
        const folder = await Folder.findOne({ _id: id, owner, deletedAt: null });
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }

        // Soft-delete: mark tasks in the folder as deleted and mark the folder deleted
        const now = new Date()
        await Tasks.updateMany({ folder: id, owner, deletedAt: null }, { $set: { deletedAt: now } });
        await Folder.findOneAndUpdate({ _id: id, owner }, { $set: { deletedAt: now } });

        res.status(200).json({ message: "Folder and its tasks deleted (soft) successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

//Delete the folder (but not tasks)
export const deleteFolderOnly = async (req, res) => {
    try {
        const { id } = req.params;
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })
        const folder = await Folder.findOne({ _id: id, owner, deletedAt: null });
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }
        const now = new Date()
        await Folder.findOneAndUpdate({ _id: id, owner }, { $set: { deletedAt: now } });
        res.json({ message: "Folder deleted (soft) successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};