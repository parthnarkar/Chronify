import mongoose, { mongo } from "mongoose";

const folderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        }
        ,
        owner: {
            type: String,
            required: true,
            index: true,
        }
        ,
        // Soft-delete timestamp. When set, the folder is considered deleted.
        deletedAt: {
            type: Date,
            default: null,
        }
        ,
        // Optional icon for the folder (emoji or small string)
        icon: {
            type: String,
            default: '📁'
        }
    },
    { timestamps: true }
);

const Folder = mongoose.model("Folder", folderSchema);

export default Folder;