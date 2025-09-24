import mongoose, { mongo } from "mongoose";

const folderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        }
    },
    { timestamps: true }
);

const Folder = mongoose.model("Folder", folderSchema);

export default Folder;