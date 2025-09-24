import express from 'express';
import {
    createFolder,
    getFoldersWithTasks,
    deleteFolderWithTasks,
    deleteFolderOnly,
    updateFolderDetails
} from "../controllers/folderController.js"

const router = express.Router();

//Create a folder
router.post("/", createFolder);

//Get all folders with tasks
router.get("/", getFoldersWithTasks);

//Update Folder Details
router.put("/:id", updateFolderDetails);

//Delete folder with its tasks
router.delete("/folder-with-tasks/:id", deleteFolderWithTasks);

//Delete folder only
router.delete("/only-folder/:id", deleteFolderOnly);

export default router;