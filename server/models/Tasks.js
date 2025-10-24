import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        currentStatus: {
            type: String,
            enum: ["pending", "in-progress", "completed"],
            default: "pending",
        },
        dueDate: {
            type: Date,
        },
        folder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            required: true,
        }
        ,
        owner: {
            type: String,
            required: true,
            index: true,
        }
        ,
        // Soft-delete timestamp. When set, the task is considered deleted.
        deletedAt: {
            type: Date,
            default: null,
        }
        ,
        // Track timestamps for each status. These arrays record every time the
        // task entered the corresponding status (useful for history/analytics).
        pendingTimestamps: {
            type: [Date],
            default: []
        },
        inProgressTimestamps: {
            type: [Date],
            default: []
        },
        completedTimestamps: {
            type: [Date],
            default: []
        }
    },
    { timestamps: true }
);

const Tasks = mongoose.model("Tasks", taskSchema);

export default Tasks;