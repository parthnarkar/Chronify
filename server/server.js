import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import googleSyncService from "./services/googleSyncService.js";

dotenv.config();

connectDB();

// Initialize Google sync service (starts cron job)
console.log('Initializing Google Sync Service...');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Google Sync Service is running with auto-sync every 30 minutes');
});
