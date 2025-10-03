import Folder from "../models/Folder.js";
import Tasks from "../models/Tasks.js";

//Create a new folder
export const createFolder = async (req, res) => {
    try {
        const { name } = req.body;
        const owner = req.headers['x-client-uid'] || null

        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })
        console.log(`[folderController] createFolder owner=${owner} body=`, { name })

        if (!name) {
            return res.status(400).json({ message: 'Folder name is required' });
        }

    const folder = new Folder({ name, owner });
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

        const folders = await Folder.find({ owner }).lean();
        const tasks = await Tasks.find({ owner }).lean();

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

//Update the Folder Details
export const updateFolderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const owner = req.headers['x-client-uid'] || null
        if (!owner) return res.status(401).json({ message: 'Missing X-Client-Uid header' })

        if (!name) {
            res.status(400).json({ message: "Folder name is required" });
        }

        const folder = await Folder.findOneAndUpdate(
            { _id: id, owner },
            { name },
            { new: true }
        )

        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }

        res.json(folder);

    } catch (error) {
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
    const folder = await Folder.findOne({ _id: id, owner });
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }

        //Delete all the tasks in it
    await Tasks.deleteMany({ folder: id, owner });

        //Deleting the Folder
        await Folder.findByIdAndDelete(id);

        res.status(200).json({ message: "Folder and its tasks deleted successfully" });
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
        const folder = await Folder.findOneAndDelete({ _id: id, owner });
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }

        res.json({ message: "Folder deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};