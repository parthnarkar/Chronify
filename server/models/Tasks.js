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
            enum: ["Pending", "Completed"],
            default: "Pending",
        },
        // Priority of the task
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "low",
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
        completedTimestamps: {
            type: [Date],
            default: []
        }
        ,
        // Track priority change history as an array of priority names (e.g. ['low','medium'])
        priorityHistory: {
            type: [String],
            default: []
        },
        // Metadata for AI-generated tasks and email integration
        metadata: {
            type: {
                emailId: String,
                aiGenerated: Boolean,
                confidence: Number,
                type: String, // 'meeting', 'regular', etc.
                meetingDate: String, // Meeting date in dd-mm-yyyy format
                meetingTime: String, // Meeting time in display format (e.g., "08:30" or "21:30")
                createdAt: Date,
                aiModel: String,
                meetingDetails: {
                    type: {
                        originalSubject: String,
                        scheduledDateTime: Date, // Full ISO datetime
                        meetingDate: String, // Display format (e.g., "Friday, October 24, 2025")
                        meetingTime: String, // Display format (e.g., "8:30 AM")
                        participants: [String],
                        location: String,
                        agenda: String
                    }
                }
            }
        }
    },
    { timestamps: true }
);

const Tasks = mongoose.model("Tasks", taskSchema);

export default Tasks;