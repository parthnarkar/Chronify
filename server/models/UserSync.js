import mongoose from "mongoose";

const userSyncSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        uid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        accessToken: {
            type: String,
            required: false, // Can be null if user hasn't connected Google services
        },
        refreshToken: {
            type: String,
            required: false,
        },
        tokenExpiry: {
            type: Date,
            required: false,
        },
        events: {
            type: Array,
            default: [],
        },
        mails: {
            type: Array,
            default: [],
        },
        lastSynced: {
            type: Date,
            default: null,
        },
        syncErrors: {
            type: Array,
            default: [],
        }
    },
    { timestamps: true }
);

const UserSync = mongoose.model("UserSync", userSyncSchema);

export default UserSync;