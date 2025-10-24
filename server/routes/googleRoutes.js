import express from 'express';
import { google } from 'googleapis';
import UserSync from '../models/UserSync.js';
import geminiService from '../services/geminiService.js';
import Folder from '../models/Folder.js';
import Tasks from '../models/Tasks.js';

const router = express.Router();

// Helpers to decode Gmail base64url payloads and extract a text body
function decodeBase64Url(data = '') {
    // Gmail returns base64url (URL-safe) encoded strings
    const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
    try {
        return Buffer.from(b64, 'base64').toString('utf-8');
    } catch (e) {
        return '';
    }
}

function extractBodyFromPayload(payload) {
    if (!payload) return '';
    // direct body
    if (payload.body && payload.body.data) {
        return decodeBase64Url(payload.body.data);
    }
    // multipart
    if (Array.isArray(payload.parts)) {
        // prefer text/plain
        for (const p of payload.parts) {
            const ct = (p.mimeType || '').toLowerCase();
            if (ct === 'text/plain' && p.body && p.body.data) {
                return decodeBase64Url(p.body.data);
            }
        }
        // fallback to text/html or any text/*
        for (const p of payload.parts) {
            const ct = (p.mimeType || '').toLowerCase();
            if ((ct === 'text/html' || ct.startsWith('text/')) && p.body && p.body.data) {
                return decodeBase64Url(p.body.data);
            }
        }
        // nested parts
        for (const p of payload.parts) {
            const nested = extractBodyFromPayload(p);
            if (nested) return nested;
        }
    }
    return '';
}

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

                    // Get email body content (use helper to handle base64url and multipart)
                    let bodyText = extractBodyFromPayload(msgDetail.data.payload || {});
                    // Truncate very large bodies to protect DB size
                    const MAX_BODY = 20000;
                    const storedBody = bodyText && bodyText.length > MAX_BODY ? bodyText.slice(0, MAX_BODY) + '\n\n[truncated]' : bodyText;

                    mails.push({
                        id: msgDetail.data.id || message.id,
                        threadId: msgDetail.data.threadId,
                        subject,
                        from,
                        date,
                        snippet: msgDetail.data.snippet,
                        body: storedBody
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

                    // Get email body content using helper to support base64url and multipart
                    let bodyText = extractBodyFromPayload(msgDetail.data.payload || {});
                    const MAX_BODY = 20000;
                    const storedBody = bodyText && bodyText.length > MAX_BODY ? bodyText.slice(0, MAX_BODY) + '\n\n[truncated]' : bodyText;

                    const mailData = {
                        id: msgDetail.data.id || message.id,
                        threadId: msgDetail.data.threadId,
                        subject,
                        from,
                        date,
                        snippet: msgDetail.data.snippet,
                        body: storedBody
                    };

                    console.log(`📧 PROCESSED EMAIL DATA:`, JSON.stringify({ id: mailData.id, subject: mailData.subject, from: mailData.from, snippet: mailData.snippet, bodyPreview: (mailData.body || '').substring(0,200) }, null, 2));

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

// AI Analysis - Convert meeting emails to tasks
router.post('/analyze-meetings', async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(401).json({ message: 'Missing X-Client-Uid header' });
        }

        console.log('🤖 STARTING AI MEETING ANALYSIS FOR USER:', uid);

        // Fetch user sync data with emails from MongoDB
        const userSync = await UserSync.findOne({ uid });
        if (!userSync) {
            return res.status(404).json({ message: 'User not found in sync data' });
        }

        if (!userSync.mails || userSync.mails.length === 0) {
            return res.status(404).json({ message: 'No emails found to analyze. Please sync Gmail first.' });
        }

        console.log(`📧 FETCHED ${userSync.mails.length} EMAILS FROM MONGODB FOR ANALYSIS`);
        console.log('📧 EMAIL DATA FROM DB:', JSON.stringify(userSync.mails.slice(0, 2), null, 2)); // Log first 2 emails for debugging

        // Use Gemini AI to analyze emails directly from database
        let analysisResult;
        try {
            console.log('🔄 SENDING EMAILS TO GEMINI AI FOR ANALYSIS...');
            analysisResult = await geminiService.analyzeMeetingEmails(userSync.mails);
            console.log('✅ Gemini AI analysis completed successfully');
        } catch (aiError) {
            console.warn('⚠️ Gemini AI analysis failed, using enhanced fallback method:', aiError.message);
            analysisResult = geminiService.fallbackAnalysis(userSync.mails);
        }

        console.log('🔍 AI ANALYSIS RESULTS:', JSON.stringify(analysisResult, null, 2));

        const meetingTasks = analysisResult.meetings.filter(m => m.isMeeting);
        
        if (meetingTasks.length === 0) {
            return res.json({ 
                message: 'AI found no meetings in the analyzed emails',
                analyzed: userSync.mails.length,
                meetings: [],
                tasksCreated: 0
            });
        }

        console.log(`🎯 AI IDENTIFIED ${meetingTasks.length} MEETINGS OUT OF ${userSync.mails.length} EMAILS`);

        // Ensure MEETINGS folder exists
        let meetingsFolder = await Folder.findOne({ owner: uid, name: 'MEETINGS' });
        if (!meetingsFolder) {
            console.log('📁 Creating MEETINGS folder automatically');
            meetingsFolder = await Folder.create({
                name: 'MEETINGS',
                owner: uid,
                icon: '🤝' // Meeting handshake emoji
            });
            console.log('✅ MEETINGS folder created with ID:', meetingsFolder._id);
        } else {
            console.log('📁 MEETINGS folder already exists with ID:', meetingsFolder._id);
        }

        // Let AI create tasks for detected meetings
        const createdTasks = [];
        for (const meetingData of meetingTasks) {
            try {
                // Check if task already exists for this email
                const existingTask = await Tasks.findOne({ 
                    owner: uid, 
                    'metadata.emailId': meetingData.emailId,
                    deletedAt: null // Only check non-deleted tasks
                });
                
                if (existingTask) {
                    console.log(`⏭️ Task already exists for email ${meetingData.emailId}, skipping...`);
                    continue;
                }

                console.log(`🤖 AI CREATING TASK FOR EMAIL: ${meetingData.emailId}`);
                console.log(`📝 TASK DETAILS:`, JSON.stringify(meetingData.task, null, 2));

                // Parse meeting date for sorting (no priority for meetings)
                const meetingDateTime = meetingData.task.meetingDetails?.scheduledDateTime ? 
                    new Date(meetingData.task.meetingDetails.scheduledDateTime) : 
                    (meetingData.task.meetingDate ? new Date(meetingData.task.meetingDate) : new Date());

                // Format meeting date to dd-mm-yyyy efficiently
                const formatMeetingDateToDMY = (dateStr) => {
                    if (!dateStr) return '--'
                    try {
                        const date = new Date(dateStr)
                        const day = date.getDate().toString().padStart(2, '0')
                        const month = (date.getMonth() + 1).toString().padStart(2, '0')
                        const year = date.getFullYear()
                        return `${day}-${month}-${year}`
                    } catch {
                        return '--'
                    }
                }

                const task = await Tasks.create({
                    title: meetingData.task.title,
                    description: meetingData.task.description,
                    folder: meetingsFolder._id,
                    owner: uid,
                    // NO PRIORITY for meeting tasks - they use date/time instead
                    priority: undefined, // Explicitly set to undefined for meetings
                    dueDate: meetingDateTime, // Use meeting date as due date for sorting
                    currentStatus: 'pending',
                    metadata: {
                        emailId: meetingData.emailId,
                        aiGenerated: true,
                        confidence: meetingData.confidence,
                        type: 'meeting', // Reference variable to identify meeting tasks efficiently
                        meetingDate: formatMeetingDateToDMY(meetingData.task.meetingDate), // dd-mm-yyyy format
                        meetingTime: meetingData.task.meetingTime || '--', // Show '--' if not available
                        meetingDetails: meetingData.task.meetingDetails,
                        createdAt: new Date(),
                        aiModel: 'gemini-2.0-flash'
                    }
                });

                createdTasks.push(task);
                console.log(`✅ AI SUCCESSFULLY CREATED MEETING TASK: "${task.title}" scheduled for ${meetingData.task.meetingTime || 'TBD'}`);
            } catch (taskError) {
                console.error(`❌ Failed to create AI task for email ${meetingData.emailId}:`, taskError);
            }
        }

        // Sort created tasks by meeting date/time (ascending order - earliest first)
        createdTasks.sort((a, b) => {
            const dateA = a.dueDate || new Date();
            const dateB = b.dueDate || new Date();
            return dateA.getTime() - dateB.getTime();
        });

        console.log(`📅 Tasks sorted by meeting date/time - earliest meetings first`);

        // Update user sync with analysis timestamp and results
        await UserSync.findOneAndUpdate(
            { uid },
            { 
                lastMeetingAnalysis: new Date(),
                $push: {
                    analysisHistory: {
                        timestamp: new Date(),
                        emailsAnalyzed: userSync.mails.length,
                        meetingsDetected: meetingTasks.length,
                        tasksCreated: createdTasks.length,
                        aiModel: 'gemini-2.0-flash'
                    }
                }
            }
        );

        console.log(`🎉 AI ANALYSIS COMPLETE: ${createdTasks.length} tasks created from ${meetingTasks.length} detected meetings`);

        res.json({
            message: 'AI meeting analysis completed successfully',
            analyzed: userSync.mails.length,
            meetingsDetected: meetingTasks.length,
            tasksCreated: createdTasks.length,
            meetings: meetingTasks,
            createdTasks: createdTasks.map(t => ({
                id: t._id,
                title: t.title,
                meetingDate: t.metadata?.meetingDate,
                meetingTime: t.metadata?.meetingTime,
                dueDate: t.dueDate,
                confidence: t.metadata?.confidence,
                meetingDetails: t.metadata?.meetingDetails
            })),
            meetingsFolder: {
                id: meetingsFolder._id,
                name: meetingsFolder.name
            }
        });
    } catch (error) {
        console.error('❌ AI Meeting analysis error:', error);
        res.status(500).json({ 
            message: 'Failed to analyze meetings with AI', 
            error: error.message 
        });
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