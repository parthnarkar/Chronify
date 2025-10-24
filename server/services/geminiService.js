import axios from 'axios';

class GeminiService {
    constructor() {
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        this.apiKey = null;
    }

    initializeApiKey() {
        this.apiKey = process.env.GEMINI_API_KEY;
        
        console.log('🔍 Gemini Environment check:');
        console.log('- GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
        console.log('- API Key length:', this.apiKey ? this.apiKey.length : 0);
        console.log('- API Key preview:', this.apiKey ? `${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}` : 'NOT SET');
        
        if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('GEMINI_API_KEY not configured - please add your API key to .env file');
        }
        
        if (!this.apiKey.startsWith('AIza')) {
            throw new Error('Invalid Gemini API key format - should start with "AIza"');
        }
        
        console.log('✅ Gemini API key validated successfully');
        return true;
    }

    async analyzeMeetingEmails(emails) {
        try {
            this.initializeApiKey();
        } catch (error) {
            console.log('❌ Gemini API Key validation failed:', error.message);
            console.log('🔄 Using enhanced fallback analysis...');
            return this.fallbackAnalysis(emails);
        }

        console.log('🤖 USING GEMINI AI for intelligent meeting analysis...');

        try {
            const prompt = this.createAnalysisPrompt(emails);
            console.log('📝 Sending request to Gemini API...');
            console.log('🌐 API URL:', `${this.apiUrl}?key=${this.apiKey.substring(0, 10)}...`);
            
            const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000,
                validateStatus: function (status) {
                    return status < 500;
                }
            });

            console.log('📡 Gemini API Response Status:', response.status);

            if (response.status === 400) {
                throw new Error('Bad request - check your API key and request format');
            } else if (response.status === 403) {
                throw new Error('API key invalid or quota exceeded');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded - please try again later');
            } else if (response.status >= 400) {
                throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(response.data)}`);
            }

            console.log('✅ Gemini API response received successfully');
            
            const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!aiResponse) {
                throw new Error('Empty response from Gemini API');
            }

            console.log('🔍 Raw Gemini Response length:', aiResponse.length);

            // Parse the JSON response
            const analysisResult = this.parseAIResponse(aiResponse);
            console.log('🎯 Gemini Analysis completed successfully');
            console.log('📊 Found meetings:', analysisResult.meetings?.length || 0);
            return analysisResult;

        } catch (error) {
            console.error('❌ Gemini API Error Details:');
            console.error('- Status:', error.response?.status);
            console.error('- Data:', error.response?.data);
            console.error('- Message:', error.message);
            
            // For API errors, use fallback
            if (error.response?.status === 403) {
                console.log('🔑 Gemini API key issue. Using enhanced fallback analysis...');
                return this.fallbackAnalysis(emails);
            }
            
            if (error.response?.status === 429) {
                console.log('⏱️ Gemini rate limit hit. Using enhanced fallback analysis...');
                return this.fallbackAnalysis(emails);
            }
            
            if (error.code === 'ECONNREFUSED') {
                console.log('🔄 Connection failed. Using enhanced fallback analysis...');
                return this.fallbackAnalysis(emails);
            } else if (error.code === 'ETIMEDOUT') {
                console.log('⏱️ API timeout. Using enhanced fallback analysis...');
                return this.fallbackAnalysis(emails);
            }
            
            // For other errors, also use fallback
            console.log('🔄 API error occurred. Using enhanced fallback analysis...');
            return this.fallbackAnalysis(emails);
        }
    }

    createAnalysisPrompt(emails) {
        const emailData = emails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            date: email.date,
            snippet: email.snippet,
            body: email.body ? email.body.substring(0, 1000) : email.snippet
        }));

        return `You are an intelligent meeting analyzer for a task management system. Analyze emails from MongoDB and identify REAL meetings, then create professional tasks.

EMAILS FROM DATABASE:
${JSON.stringify(emailData, null, 2)}

STRICT MEETING CRITERIA:
- Must contain specific times (8:30, 9 PM, "at 3", etc.)
- Must be about scheduling actual meetings/appointments  
- Must have clear meeting purpose or agenda
- REJECT: newsletters, promotions, automated emails, general articles

TASK CREATION RULES:
- Create SMART, professional titles (not just copy subject)
- Extract and format meeting dates and times precisely (8:30 → 08:30:00, 9 PM → 21:00:00)
- NO PRIORITY ASSIGNMENT - meetings are sorted by date/time only
- Generate SMART, natural descriptions that summarize the meeting purpose and key details
- Write descriptions in a conversational, informative style without structured formatting
- Include timing information naturally within the description text if mentioned in email
- Use proper ISO date formats for meeting scheduling
- Parse relative dates (today, tomorrow, next Monday, etc.)
- Extract specific times from various formats (8:30, 8.30, eight-thirty, etc.)

EXAMPLE TRANSFORMATION:
Input: "Meeting at 8:30 Today on Java Programming"
Output Title: "Java Programming Meeting"
Output Description: "A meeting focused on Java programming concepts scheduled for today at 8:30. Come prepared with all relevant concepts and be ready to discuss programming fundamentals."
Output Meeting Time: "2025-10-24T08:30:00"
Output Meeting Date: "October 24, 2025"
NO Priority: meetings are chronologically ordered

REQUIRED JSON RESPONSE FORMAT:
{
    "meetings": [
        {
            "emailId": "email_id",
            "isMeeting": true,
            "confidence": 0.95,
            "reasoning": "Contains specific time and clear purpose",
            "task": {
                "title": "Professional Meeting Title",
                "description": "Generate a smart, natural description based on the email subject and content. Write it as a brief summary of what the meeting is about, when it's happening (if mentioned), and any key details. Keep it conversational and informative without using structured format with emojis or sections.",
                "meetingDate": "2025-10-24",
                "meetingTime": "08:30:00",
                "meetingDetails": {
                    "originalSubject": "Original email subject",
                    "scheduledDateTime": "2025-10-24T08:30:00",
                    "meetingDate": "October 24, 2025",
                    "meetingTime": "8:30 AM",
                    "participants": ["email addresses"],
                    "location": "TBD or extracted location",
                    "agenda": "Meeting agenda/topic"
                }
            }
        }
    ]
}

BE STRICT: Only identify as meetings if they contain actual scheduling with specific times and purposes. Return ONLY the JSON response, no other text.`;
    }

    parseAIResponse(aiResponse) {
        try {
            let cleanResponse = aiResponse.trim();
            
            // Remove potential markdown code blocks
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
            }
            
            // Find JSON content if response has extra text
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanResponse = jsonMatch[0];
            }
            
            const parsed = JSON.parse(cleanResponse);
            
            // Validate structure
            if (!parsed.meetings || !Array.isArray(parsed.meetings)) {
                throw new Error('Invalid response structure: missing meetings array');
            }

            return parsed;
        } catch (error) {
            console.error('Failed to parse Gemini response:', aiResponse.substring(0, 500) + '...');
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    // Enhanced intelligent fallback analysis (same as before)
    fallbackAnalysis(emails) {
        console.log('🔄 Using ENHANCED INTELLIGENT fallback analysis - analyzing emails from MongoDB');
        
        const meetingKeywords = [
            'meeting', 'schedule', 'appointment', 'call', 'discussion',
            'conference', 'zoom', 'teams', 'meet', 'session', 'regarding'
        ];
        
        const timeKeywords = ['pm', 'am', 'at', 'clock', 'time', 'tomorrow', 'today', ':', 'o\'clock'];
        
        return {
            meetings: emails.map(email => {
                const text = `${email.subject} ${email.snippet} ${email.body || ''}`.toLowerCase();
                const subject = email.subject.toLowerCase();
                
                const hasMeetingKeyword = meetingKeywords.some(keyword => text.includes(keyword));
                const hasTimeKeyword = timeKeywords.some(keyword => text.includes(keyword));
                
                // Enhanced meeting detection patterns
                const specificPatterns = [
                    /meeting\s+at\s+\d+\.?\d*\s*(pm|am)/i,
                    /\d+\.?\d*\s*(pm|am).*regarding/i,
                    /meeting.*today/i,
                    /\d+\.?\d*\s*(pm|am).*today/i,
                    /discussion.*\d+\.?\d*\s*(pm|am)/i,
                    /call.*\d+\.?\d*\s*(pm|am)/i
                ];
                
                const matchesPattern = specificPatterns.some(pattern => pattern.test(email.subject + ' ' + email.snippet));
                
                // Check for promotional/newsletter indicators
                const spamIndicators = [
                    'unsubscribe', 'newsletter', 'daily digest', 'promotional',
                    'marketing', 'offer', 'deal', 'sale', 'discount', 'buy now',
                    'click here', 'visit', 'follow us', 'social media'
                ];
                
                const isSpam = spamIndicators.some(indicator => text.includes(indicator));
                
                // Enhanced confidence scoring
                let confidence = 0.3;
                if (matchesPattern) confidence += 0.4;
                if (hasMeetingKeyword && hasTimeKeyword) confidence += 0.3;
                if (subject.includes('meeting')) confidence += 0.2;
                if (text.includes('today') || text.includes('tomorrow')) confidence += 0.2;
                if (isSpam) confidence -= 0.5;
                
                const isLikelyMeeting = confidence > 0.5 && !isSpam;
                
                if (isLikelyMeeting) {
                    // Enhanced date and time extraction
                    let meetingDate = new Date();
                    let scheduledDateTime = null;
                    let extractedTime = null;
                    let extractedDate = null;
                    
                    // Parse relative dates
                    if (text.includes('today')) {
                        meetingDate = new Date();
                        extractedDate = 'Today';
                    } else if (text.includes('tomorrow')) {
                        meetingDate = new Date();
                        meetingDate.setDate(meetingDate.getDate() + 1);
                        extractedDate = 'Tomorrow';
                    } else if (text.includes('monday') || text.includes('tuesday') || text.includes('wednesday') || 
                              text.includes('thursday') || text.includes('friday') || text.includes('saturday') || text.includes('sunday')) {
                        // Handle day names - find next occurrence
                        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                        const mentionedDay = dayNames.find(day => text.includes(day));
                        if (mentionedDay) {
                            const targetDay = dayNames.indexOf(mentionedDay);
                            const today = new Date();
                            const currentDay = today.getDay();
                            const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7; // Next occurrence
                            meetingDate = new Date(today.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
                            extractedDate = mentionedDay.charAt(0).toUpperCase() + mentionedDay.slice(1);
                        }
                    }
                    
                    // Enhanced time parsing with multiple formats
                    const timePatterns = [
                        /(\d+)\.(\d+)\s*(pm|am)/i,           // 8.30 PM
                        /(\d+):(\d+)\s*(pm|am)/i,           // 8:30 PM
                        /(\d+)\s*(pm|am)/i,                 // 8 PM
                        /at\s+(\d+)\.(\d+)/i,               // at 8.30
                        /at\s+(\d+):(\d+)/i,                // at 8:30
                        /at\s+(\d+)\s*o'?clock/i,           // at 8 o'clock
                        /(\d+)\s*o'?clock\s*(pm|am)/i       // 8 o'clock PM
                    ];
                    
                    let timeMatch = null;
                    for (const pattern of timePatterns) {
                        timeMatch = text.match(pattern);
                        if (timeMatch) break;
                    }
                    
                    if (timeMatch) {
                        let hour, minute, period;
                        
                        if (timeMatch.length === 4) { // Has minutes and period
                            hour = parseInt(timeMatch[1]);
                            minute = parseInt(timeMatch[2]) || 0;
                            period = timeMatch[3];
                        } else if (timeMatch.length === 3 && timeMatch[2].match(/pm|am/i)) { // Hour and period only
                            hour = parseInt(timeMatch[1]);
                            minute = 0;
                            period = timeMatch[2];
                        } else { // No period specified
                            hour = parseInt(timeMatch[1]);
                            minute = parseInt(timeMatch[2]) || 0;
                            // Assume PM for business hours (8-11), AM for early hours (1-7)
                            period = hour >= 8 && hour <= 11 ? 'PM' : (hour >= 1 && hour <= 7 ? 'AM' : 'PM');
                        }
                        
                        // Convert to 24-hour format
                        if (period && period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
                        if (period && period.toLowerCase() === 'am' && hour === 12) hour = 0;
                        
                        const meetingDateStr = meetingDate.toISOString().split('T')[0];
                        scheduledDateTime = `${meetingDateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
                        
                        // Format time for display
                        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                        const displayPeriod = hour >= 12 ? 'PM' : 'AM';
                        extractedTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${displayPeriod}`;
                    }
                    
                    // Create intelligent task title
                    let taskTitle = email.subject.replace(/^(re:|fwd?:)\s*/i, '').trim();
                    
                    if (taskTitle.toLowerCase().includes('meeting at')) {
                        const topicMatch = taskTitle.match(/on\s+(.+?)(?:\s*$)/i) || taskTitle.match(/regarding\s+(.+?)(?:\s*$)/i);
                        if (topicMatch) {
                            taskTitle = `${topicMatch[1].trim()} Meeting`;
                        }
                    }
                    
                    // Extract location if mentioned
                    const locationKeywords = ['zoom', 'teams', 'meet', 'room', 'office', 'conference', 'hall', 'auditorium', 'venue'];
                    let extractedLocation = 'TBD';
                    for (const keyword of locationKeywords) {
                        if (text.includes(keyword)) {
                            extractedLocation = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                            break;
                        }
                    }
                    
                    // Format meeting date for display
                    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    const displayDate = meetingDate.toLocaleDateString('en-US', options);
                    
                    const formattedDateForDisplay = (() => {
                        const day = meetingDate.getDate().toString().padStart(2, '0');
                        const month = (meetingDate.getMonth() + 1).toString().padStart(2, '0');
                        const year = meetingDate.getFullYear();
                        return `${day}-${month}-${year}`;
                    })();
                    
                    // Generate smart, natural description
                    let description = `${email.snippet || 'Meeting discussion'}`;
                    
                    // Add timing information naturally if available
                    if (extractedTime && extractedTime !== 'Time TBD') {
                        if (extractedDate) {
                            description += ` scheduled for ${extractedDate.toLowerCase()} at ${extractedTime}`;
                        } else {
                            description += ` scheduled at ${extractedTime}`;
                        }
                    } else if (extractedDate) {
                        description += ` scheduled for ${extractedDate.toLowerCase()}`;
                    }
                    
                    // Add location if available
                    if (extractedLocation !== 'TBD') {
                        description += `. Meeting will be held via ${extractedLocation}`;
                    }
                    
                    // Add any additional context from email body if available
                    if (email.body && email.body.trim() && email.body !== email.snippet) {
                        const bodyPreview = email.body.trim().substring(0, 200);
                        if (bodyPreview.length > 0) {
                            description += `. ${bodyPreview}${email.body.length > 200 ? '...' : ''}`;
                        }
                    }
                    
                    return {
                        emailId: email.id,
                        isMeeting: true,
                        confidence: Math.min(confidence, 0.9),
                        reasoning: `Enhanced detection: ${matchesPattern ? 'specific meeting pattern' : ''} ${hasMeetingKeyword ? 'meeting keyword' : ''} ${hasTimeKeyword ? 'time reference' : ''} ${timeMatch ? `specific time (${extractedTime})` : ''}`,
                        task: {
                            title: taskTitle,
                            description: description,
                            meetingDate: (() => {
                                const day = meetingDate.getDate().toString().padStart(2, '0');
                                const month = (meetingDate.getMonth() + 1).toString().padStart(2, '0');
                                const year = meetingDate.getFullYear();
                                return `${day}-${month}-${year}`;
                            })(),
                            meetingTime: extractedTime || 'TBD',
                            meetingDetails: {
                                originalSubject: email.subject,
                                scheduledDateTime: scheduledDateTime,
                                meetingDate: (() => {
                                    const day = meetingDate.getDate().toString().padStart(2, '0');
                                    const month = (meetingDate.getMonth() + 1).toString().padStart(2, '0');
                                    const year = meetingDate.getFullYear();
                                    return `${day}-${month}-${year}`;
                                })(),
                                meetingTime: extractedTime || 'TBD',
                                participants: [email.from],
                                location: extractedLocation,
                                agenda: email.snippet
                            }
                        }
                    };
                }
                
                return {
                    emailId: email.id,
                    isMeeting: false,
                    confidence: 0.9,
                    reasoning: isSpam ? 'Detected as promotional/spam content' : 'No clear meeting indicators found'
                };
            }).filter(item => item.isMeeting)
        };
    }
}

export default new GeminiService();