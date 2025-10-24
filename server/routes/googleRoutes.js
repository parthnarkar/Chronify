import express from 'express';
import { google } from 'googleapis';
import UserSync from '../models/UserSync.js';

const router = express.Router();

// Connect Google services - store access token
router.post('/connect', async (req, res) => {
    try {
        const { accessToken, email } = req.body;
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(401).json({ message: 'Missing X-Client-Uid header' });
        }
        
        if (!accessToken || !email) {
            return res.status(400).json({ message: 'accessToken and email are required' });
        }

        // Store or update user sync data
        await UserSync.findOneAndUpdate(
            { uid },
            { 
                email, 
                uid, 
                accessToken,
                tokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour from now
            },
            { upsert: true, new: true }
        );

        res.json({ message: 'Google services connected successfully' });
    } catch (error) {
        console.error('Connect Google services error:', error);
        res.status(500).json({ message: 'Failed to connect Google services' });
    }
});

// Fetch calendar events
router.get('/calendar', async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(401).json({ message: 'Missing X-Client-Uid header' });
        }

        const userSync = await UserSync.findOne({ uid });
        if (!userSync || !userSync.accessToken) {
            return res.status(404).json({ message: 'Google services not connected' });
        }

        // Check if token is expired
        if (userSync.tokenExpiry && new Date() > userSync.tokenExpiry) {
            return res.status(401).json({ message: 'Access token expired. Please reconnect.' });
        }

        // Setup Google Calendar API
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: userSync.accessToken });
        
        const calendar = google.calendar({ version: 'v3', auth });

        // Fetch next 10 upcoming events
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items?.map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description,
            location: event.location,
        })) || [];

        // Update user sync data
        await UserSync.findOneAndUpdate(
            { uid },
            { 
                events,
                lastSynced: new Date(),
                $unset: { syncErrors: 1 } // Clear previous errors
            }
        );

        res.json({ events });
    } catch (error) {
        console.error('Calendar fetch error:', error);
        
        // Store error in user sync
        await UserSync.findOneAndUpdate(
            { uid: req.headers['x-client-uid'] },
            { 
                $push: { 
                    syncErrors: {
                        type: 'calendar',
                        message: error.message,
                        timestamp: new Date()
                    }
                }
            }
        );

        res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
});

// Fetch Gmail emails
router.get('/gmail', async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(401).json({ message: 'Missing X-Client-Uid header' });
        }

        const userSync = await UserSync.findOne({ uid });
        if (!userSync || !userSync.accessToken) {
            return res.status(404).json({ message: 'Google services not connected' });
        }

        // Check if token is expired
        if (userSync.tokenExpiry && new Date() > userSync.tokenExpiry) {
            return res.status(401).json({ message: 'Access token expired. Please reconnect.' });
        }

        // Setup Gmail API
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: userSync.accessToken });
        
        const gmail = google.gmail({ version: 'v1', auth });

        // Search for emails with broader meeting-related terms
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: '(schedule OR meeting OR appointment OR PM OR AM OR time OR event OR calendar)',
            maxResults: 10,
        });

        console.log('📧 GMAIL STANDALONE - RAW API RESPONSE:', JSON.stringify(response.data, null, 2));

        const mails = [];
        
        if (response.data.messages) {
            console.log(`📧 FOUND ${response.data.messages.length} MESSAGES IN STANDALONE GMAIL FETCH`);
            // Fetch details for each message
            for (const message of response.data.messages) {
                try {
                    const msgDetail = await gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full'
                    });

                    console.log(`📧 STANDALONE MESSAGE ${message.id} DETAILS:`, JSON.stringify(msgDetail.data, null, 2));

                    const headers = msgDetail.data.payload?.headers || [];
                    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                    const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
                    const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

                    // Get email body content
                    let bodyText = '';
                    if (msgDetail.data.payload?.body?.data) {
                        bodyText = Buffer.from(msgDetail.data.payload.body.data, 'base64').toString('utf-8');
                    } else if (msgDetail.data.payload?.parts) {
                        const textPart = msgDetail.data.payload.parts.find(part => 
                            part.mimeType === 'text/plain' && part.body?.data
                        );
                        if (textPart) {
                            bodyText = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                        }
                    }

                    mails.push({
                        id: message.id,
                        subject,
                        from,
                        date,
                        snippet: msgDetail.data.snippet,
                        body: bodyText
                    });

                    console.log(`📧 PROCESSED STANDALONE EMAIL:`, {
                        id: message.id,
                        subject,
                        from,
                        snippet: msgDetail.data.snippet,
                        bodyPreview: bodyText.substring(0, 200)
                    });
                } catch (msgError) {
                    console.error('Failed to fetch message details:', msgError);
                }
            }
        } else {
            console.log('📧 NO MESSAGES FOUND IN STANDALONE GMAIL FETCH');
        }

        // Update user sync data
        await UserSync.findOneAndUpdate(
            { uid },
            { 
                mails,
                lastSynced: new Date(),
                $unset: { syncErrors: 1 } // Clear previous errors
            }
        );

        res.json({ mails });
    } catch (error) {
        console.error('Gmail fetch error:', error);
        
        // Store error in user sync
        await UserSync.findOneAndUpdate(
            { uid: req.headers['x-client-uid'] },
            { 
                $push: { 
                    syncErrors: {
                        type: 'gmail',
                        message: error.message,
                        timestamp: new Date()
                    }
                }
            }
        );

        res.status(500).json({ message: 'Failed to fetch Gmail emails' });
    }
});

// Sync both calendar and gmail data
router.post('/sync', async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        console.log('🚀 STARTING GOOGLE SYNC FOR USER:', uid);
        
        if (!uid) {
            return res.status(401).json({ message: 'Missing X-Client-Uid header' });
        }

        const userSync = await UserSync.findOne({ uid });
        console.log('🔍 USER SYNC DATA:', userSync ? {
            email: userSync.email,
            hasAccessToken: !!userSync.accessToken,
            tokenExpiry: userSync.tokenExpiry,
            lastSynced: userSync.lastSynced
        } : 'No sync data found');
        
        if (!userSync || !userSync.accessToken) {
            return res.status(404).json({ message: 'Google services not connected' });
        }

        // Check if token is expired
        if (userSync.tokenExpiry && new Date() > userSync.tokenExpiry) {
            console.log('❌ ACCESS TOKEN EXPIRED');
            return res.status(401).json({ message: 'Access token expired. Please reconnect.' });
        }

        console.log('✅ ACCESS TOKEN IS VALID, PROCEEDING WITH SYNC');

        // Setup Google APIs
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: userSync.accessToken });
        
        const calendar = google.calendar({ version: 'v3', auth });
        const gmail = google.gmail({ version: 'v1', auth });

        // Sync both calendar and gmail in parallel
        const [calendarResult, gmailResult] = await Promise.allSettled([
            // Calendar sync
            calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: 10,
                singleEvents: true,
                orderBy: 'startTime',
            }),
            // Gmail sync - search for broader meeting-related terms
            gmail.users.messages.list({
                userId: 'me',
                q: '(schedule OR meeting OR appointment OR PM OR AM OR time OR event OR calendar)',
                maxResults: 10,
            })
        ]);

        // Process calendar events
        let events = [];
        if (calendarResult.status === 'fulfilled') {
            console.log('📅 CALENDAR API RAW RESPONSE:', JSON.stringify(calendarResult.value.data, null, 2));
            events = calendarResult.value.data.items?.map(event => ({
                id: event.id,
                summary: event.summary,
                start: event.start?.dateTime || event.start?.date,
                end: event.end?.dateTime || event.end?.date,
                description: event.description,
                location: event.location,
            })) || [];
            console.log('📅 PROCESSED CALENDAR EVENTS:', JSON.stringify(events, null, 2));
        } else {
            console.log('❌ CALENDAR SYNC FAILED:', calendarResult.reason);
        }

        // Process Gmail emails
        let mails = [];
        if (gmailResult.status === 'fulfilled' && gmailResult.value.data.messages) {
            console.log('📧 GMAIL API RAW RESPONSE (message list):', JSON.stringify(gmailResult.value.data, null, 2));
            console.log(`📧 FOUND ${gmailResult.value.data.messages.length} MESSAGES MATCHING SEARCH QUERY`);
            
            for (const message of gmailResult.value.data.messages) {
                try {
                    const msgDetail = await gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full' // Get full message content
                    });

                    console.log(`📧 MESSAGE ${message.id} FULL DETAILS:`, JSON.stringify(msgDetail.data, null, 2));

                    const headers = msgDetail.data.payload?.headers || [];
                    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                    const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
                    const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

                    // Get email body content
                    let bodyText = '';
                    if (msgDetail.data.payload?.body?.data) {
                        bodyText = Buffer.from(msgDetail.data.payload.body.data, 'base64').toString('utf-8');
                    } else if (msgDetail.data.payload?.parts) {
                        // For multipart messages, find text/plain part
                        const textPart = msgDetail.data.payload.parts.find(part => 
                            part.mimeType === 'text/plain' && part.body?.data
                        );
                        if (textPart) {
                            bodyText = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                        }
                    }

                    const mailData = {
                        id: message.id,
                        subject,
                        from,
                        date,
                        snippet: msgDetail.data.snippet,
                        body: bodyText
                    };

                    console.log(`📧 PROCESSED EMAIL DATA:`, JSON.stringify(mailData, null, 2));

                    mails.push(mailData);
                } catch (msgError) {
                    console.error('❌ Failed to fetch message details:', msgError);
                }
            }
            console.log('📧 FINAL PROCESSED EMAILS:', JSON.stringify(mails, null, 2));
        } else if (gmailResult.status === 'fulfilled') {
            console.log('📧 NO EMAILS FOUND MATCHING SEARCH CRITERIA');
        } else {
            console.log('❌ GMAIL SYNC FAILED:', gmailResult.reason);
        }

        // Update user sync data
        await UserSync.findOneAndUpdate(
            { uid },
            { 
                events,
                mails,
                lastSynced: new Date(),
                $unset: { syncErrors: 1 } // Clear previous errors
            }
        );

        const results = {
            calendar: calendarResult.status === 'fulfilled' ? 'success' : 'failed',
            gmail: gmailResult.status === 'fulfilled' ? 'success' : 'failed'
        };

        res.json({ 
            message: 'Sync completed',
            results,
            events,
            mails,
            lastSynced: new Date()
        });
    } catch (error) {
        console.error('Sync error:', error);
        
        // Store error in user sync
        await UserSync.findOneAndUpdate(
            { uid: req.headers['x-client-uid'] },
            { 
                $push: { 
                    syncErrors: {
                        type: 'sync',
                        message: error.message,
                        timestamp: new Date()
                    }
                }
            }
        );

        res.status(500).json({ message: 'Sync failed' });
    }
});

// Get user sync status and data
router.get('/status', async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(401).json({ message: 'Missing X-Client-Uid header' });
        }

        const userSync = await UserSync.findOne({ uid });
        
        if (!userSync) {
            return res.json({ 
                connected: false,
                events: [],
                mails: [],
                lastSynced: null
            });
        }

        res.json({
            connected: !!userSync.accessToken,
            events: userSync.events || [],
            mails: userSync.mails || [],
            lastSynced: userSync.lastSynced,
            syncErrors: userSync.syncErrors || []
        });
    } catch (error) {
        console.error('Status fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch sync status' });
    }
});

// Clean up folder icons (remove XML declarations)
router.post('/cleanup-icons', async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(401).json({ message: 'Missing X-Client-Uid header' });
        }

        // Import Folder model
        const Folder = (await import('../models/Folder.js')).default;
        
        // Find folders with XML declaration in icon
        const folders = await Folder.find({ 
            owner: uid, 
            icon: { $regex: /<?xml|&lt;\?xml/i }
        });

        let updated = 0;
        for (const folder of folders) {
            // Clean the SVG by removing XML declaration and normalizing
            let cleanIcon = folder.icon
                .replace(/<?xml[^>]*>/gi, '')
                .replace(/&lt;\?xml[^&]*&gt;/gi, '')
                .replace(/\n/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            await Folder.findByIdAndUpdate(folder._id, { icon: cleanIcon });
            updated++;
        }

        res.json({ 
            message: `Cleaned ${updated} folder icons`,
            updated
        });
    } catch (error) {
        console.error('Icon cleanup error:', error);
        res.status(500).json({ message: 'Failed to cleanup icons' });
    }
});

export default router;