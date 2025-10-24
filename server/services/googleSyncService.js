import cron from 'node-cron';
import UserSync from '../models/UserSync.js';
import { google } from 'googleapis';

class GoogleSyncService {
    constructor() {
        this.isRunning = false;
        this.setupCronJob();
    }

    setupCronJob() {
        // Run every 30 minutes: '*/30 * * * *'
        // For testing, you can use '*/2 * * * *' (every 2 minutes)
        cron.schedule('*/30 * * * *', async () => {
            console.log('[GoogleSyncService] Starting scheduled sync...');
            await this.syncAllUsers();
        });

        console.log('[GoogleSyncService] Cron job scheduled for every 30 minutes');
    }

    async syncAllUsers() {
        if (this.isRunning) {
            console.log('[GoogleSyncService] Sync already running, skipping...');
            return;
        }

        this.isRunning = true;
        
        try {
            // Get all users with valid access tokens
            const users = await UserSync.find({ 
                accessToken: { $exists: true, $ne: null },
                $or: [
                    { tokenExpiry: { $gt: new Date() } }, // Token not expired
                    { tokenExpiry: { $exists: false } }    // No expiry set
                ]
            });

            console.log(`[GoogleSyncService] Found ${users.length} users to sync`);

            // Sync each user in parallel (but with a reasonable limit)
            const syncPromises = users.map(user => this.syncUser(user));
            const results = await Promise.allSettled(syncPromises);

            // Log results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            console.log(`[GoogleSyncService] Sync completed: ${successful} successful, ${failed} failed`);
        } catch (error) {
            console.error('[GoogleSyncService] Error during bulk sync:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async syncUser(userSync) {
        try {
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: userSync.accessToken });

            const [calendarData, gmailData] = await Promise.allSettled([
                this.syncCalendar(auth),
                this.syncGmail(auth)
            ]);

            // Prepare update data
            const updateData = {
                lastSynced: new Date(),
                $unset: { syncErrors: 1 } // Clear previous errors
            };

            if (calendarData.status === 'fulfilled') {
                updateData.events = calendarData.value;
            } else {
                updateData.$push = {
                    syncErrors: {
                        type: 'calendar',
                        message: calendarData.reason?.message || 'Unknown calendar error',
                        timestamp: new Date()
                    }
                };
            }

            if (gmailData.status === 'fulfilled') {
                updateData.mails = gmailData.value;
            } else {
                if (!updateData.$push) updateData.$push = {};
                updateData.$push.syncErrors = {
                    type: 'gmail',
                    message: gmailData.reason?.message || 'Unknown gmail error',
                    timestamp: new Date()
                };
            }

            await UserSync.findByIdAndUpdate(userSync._id, updateData);
            console.log(`[GoogleSyncService] Successfully synced user ${userSync.email}`);
        } catch (error) {
            console.error(`[GoogleSyncService] Failed to sync user ${userSync.email}:`, error);
            
            // Log the error to user's sync errors
            await UserSync.findByIdAndUpdate(userSync._id, {
                $push: {
                    syncErrors: {
                        type: 'general',
                        message: error.message,
                        timestamp: new Date()
                    }
                }
            });
        }
    }

    async syncCalendar(auth) {
        const calendar = google.calendar({ version: 'v3', auth });

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return response.data.items?.map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description,
            location: event.location,
        })) || [];
    }

    async syncGmail(auth) {
        const gmail = google.gmail({ version: 'v1', auth });

        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'subject:(schedule OR meeting)',
            maxResults: 5,
        });

        const mails = [];
        
        if (response.data.messages) {
            for (const message of response.data.messages) {
                try {
                    const msgDetail = await gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'metadata',
                        metadataHeaders: ['Subject', 'From', 'Date']
                    });

                    const headers = msgDetail.data.payload?.headers || [];
                    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                    const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
                    const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

                    mails.push({
                        id: message.id,
                        subject,
                        from,
                        date,
                        snippet: msgDetail.data.snippet
                    });
                } catch (msgError) {
                    console.error('Failed to fetch message details:', msgError);
                }
            }
        }

        return mails;
    }

    // Manual trigger for immediate sync
    async triggerSync() {
        console.log('[GoogleSyncService] Manual sync triggered');
        await this.syncAllUsers();
    }
}

// Create and export singleton instance
const googleSyncService = new GoogleSyncService();

export default googleSyncService;