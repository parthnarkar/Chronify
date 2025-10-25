import Tasks from '../models/Tasks.js';
import Folder from '../models/Folder.js';
import UserSync from '../models/UserSync.js';

class AnalyticsService {
    /**
     * Generate comprehensive user analytics
     */
    async generateUserAnalytics(uid) {
        try {
            const [
                taskAnalytics,
                folderAnalytics,
                syncAnalytics,
                productivityMetrics,
                timeBasedAnalytics
            ] = await Promise.all([
                this.getTaskAnalytics(uid),
                this.getFolderAnalytics(uid),
                this.getSyncAnalytics(uid),
                this.getProductivityMetrics(uid),
                this.getTimeBasedAnalytics(uid)
            ]);

            return {
                success: true,
                data: {
                    overview: {
                        totalTasks: taskAnalytics.totalTasks,
                        completedTasks: taskAnalytics.completedTasks,
                        pendingTasks: taskAnalytics.pendingTasks,
                        deletedTasks: taskAnalytics.deletedTasks,
                        totalFolders: folderAnalytics.totalFolders,
                        activeFolders: folderAnalytics.activeFolders,
                        isGoogleConnected: syncAnalytics.isConnected,
                        lastActivity: Math.max(
                            taskAnalytics.lastActivity || 0,
                            folderAnalytics.lastActivity || 0,
                            syncAnalytics.lastActivity || 0
                        )
                    },
                    tasks: taskAnalytics,
                    folders: folderAnalytics,
                    sync: syncAnalytics,
                    productivity: productivityMetrics,
                    timeBased: timeBasedAnalytics
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze task data for user
     */
    async getTaskAnalytics(uid) {
        const allTasks = await Tasks.find({ owner: uid }).sort({ createdAt: 1 });
        const activeTasks = allTasks.filter(task => !task.deletedAt);
        const deletedTasks = allTasks.filter(task => task.deletedAt);

        const completedTasks = activeTasks.filter(task => task.currentStatus === 'Completed');
        const pendingTasks = activeTasks.filter(task => task.currentStatus === 'Pending');

        // Priority distribution
        const priorityStats = activeTasks.reduce((acc, task) => {
            const priority = task.priority || 'low';
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {});

        // Task type analysis (meeting vs regular)
        const taskTypes = activeTasks.reduce((acc, task) => {
            const type = task.metadata?.type || 'regular';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // Completion rate by priority
        const completionByPriority = ['low', 'medium', 'high'].map(priority => {
            const tasksWithPriority = activeTasks.filter(t => t.priority === priority);
            const completedWithPriority = tasksWithPriority.filter(t => t.currentStatus === 'Completed');
            return {
                priority,
                total: tasksWithPriority.length,
                completed: completedWithPriority.length,
                completionRate: tasksWithPriority.length > 0 ? (completedWithPriority.length / tasksWithPriority.length) * 100 : 0
            };
        });

        // Task creation timeline (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentTasks = allTasks.filter(task => task.createdAt >= thirtyDaysAgo);
        
        const dailyTaskCreation = this.generateDailyStats(recentTasks, 30, 'createdAt');
        const dailyTaskCompletion = this.generateCompletionStats(allTasks, 30);

        // Average completion time
        const tasksWithCompletionTime = completedTasks.filter(task => 
            task.completedTimestamps && task.completedTimestamps.length > 0
        );
        
        const avgCompletionTime = tasksWithCompletionTime.length > 0 ? 
            tasksWithCompletionTime.reduce((sum, task) => {
                const completionTime = new Date(task.completedTimestamps[task.completedTimestamps.length - 1]);
                const creationTime = new Date(task.createdAt);
                return sum + (completionTime - creationTime);
            }, 0) / tasksWithCompletionTime.length / (1000 * 60 * 60 * 24) : 0; // in days

        return {
            totalTasks: allTasks.length,
            activeTasks: activeTasks.length,
            completedTasks: completedTasks.length,
            pendingTasks: pendingTasks.length,
            deletedTasks: deletedTasks.length,
            completionRate: activeTasks.length > 0 ? (completedTasks.length / activeTasks.length) * 100 : 0,
            priorityStats,
            taskTypes,
            completionByPriority,
            dailyTaskCreation,
            dailyTaskCompletion,
            avgCompletionTimeInDays: Math.round(avgCompletionTime * 10) / 10,
            mostRecentTasks: activeTasks.slice(-10).reverse(),
            lastActivity: allTasks.length > 0 ? Math.max(...allTasks.map(t => new Date(t.updatedAt || t.createdAt).getTime())) : null
        };
    }

    /**
     * Analyze folder data for user
     */
    async getFolderAnalytics(uid) {
        const allFolders = await Folder.find({ owner: uid }).sort({ createdAt: 1 });
        const activeFolders = allFolders.filter(folder => !folder.deletedAt);

        // Get task counts per folder
        const folderTaskCounts = await Promise.all(
            activeFolders.map(async (folder) => {
                const taskCount = await Tasks.countDocuments({ 
                    folder: folder._id, 
                    owner: uid,
                    deletedAt: null
                });
                const completedCount = await Tasks.countDocuments({ 
                    folder: folder._id, 
                    owner: uid,
                    deletedAt: null,
                    currentStatus: 'Completed'
                });
                return {
                    folderId: folder._id,
                    folderName: folder.name,
                    folderIcon: folder.icon,
                    taskCount,
                    completedCount,
                    completionRate: taskCount > 0 ? (completedCount / taskCount) * 100 : 0,
                    createdAt: folder.createdAt
                };
            })
        );

        // Folder usage patterns
        const mostUsedFolders = folderTaskCounts.sort((a, b) => b.taskCount - a.taskCount);
        const mostProductiveFolders = folderTaskCounts.sort((a, b) => b.completionRate - a.completionRate);

        return {
            totalFolders: allFolders.length,
            activeFolders: activeFolders.length,
            deletedFolders: allFolders.length - activeFolders.length,
            folderTaskCounts,
            mostUsedFolders,
            mostProductiveFolders,
            avgTasksPerFolder: activeFolders.length > 0 ? 
                folderTaskCounts.reduce((sum, f) => sum + f.taskCount, 0) / activeFolders.length : 0,
            lastActivity: allFolders.length > 0 ? Math.max(...allFolders.map(f => new Date(f.updatedAt || f.createdAt).getTime())) : null
        };
    }

    /**
     * Analyze sync data for user
     */
    async getSyncAnalytics(uid) {
        const userSync = await UserSync.findOne({ uid });

        if (!userSync) {
            return {
                isConnected: false,
                totalEvents: 0,
                totalEmails: 0,
                analysisHistory: [],
                lastSynced: null,
                syncFrequency: 0,
                lastActivity: null
            };
        }

        const events = userSync.events || [];
        const mails = userSync.mails || [];
        const analysisHistory = userSync.analysisHistory || [];

        // Sync frequency analysis (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentAnalyses = analysisHistory.filter(analysis => 
            analysis.timestamp && new Date(analysis.timestamp) >= thirtyDaysAgo
        );

        // AI model usage statistics
        const aiModelStats = analysisHistory.reduce((acc, analysis) => {
            const model = analysis.aiModel || 'unknown';
            acc[model] = (acc[model] || 0) + 1;
            return acc;
        }, {});

        // Meeting detection efficiency
        const totalMeetingsDetected = analysisHistory.reduce((sum, analysis) => 
            sum + (analysis.meetingsDetected || 0), 0);
        const totalTasksCreated = analysisHistory.reduce((sum, analysis) => 
            sum + (analysis.tasksCreated || 0), 0);

        // Daily sync activity (last 30 days)
        const dailySyncActivity = this.generateDailyStats(recentAnalyses, 30, 'timestamp');

        return {
            isConnected: !!userSync.accessToken,
            totalEvents: events.length,
            totalEmails: mails.length,
            lastSynced: userSync.lastSynced,
            lastMeetingAnalysis: userSync.lastMeetingAnalysis,
            totalAnalyses: analysisHistory.length,
            recentAnalyses: recentAnalyses.length,
            syncFrequency: recentAnalyses.length, // syncs in last 30 days
            aiModelStats,
            totalMeetingsDetected,
            totalTasksCreated,
            meetingDetectionRate: analysisHistory.length > 0 ? totalMeetingsDetected / analysisHistory.length : 0,
            taskCreationRate: analysisHistory.length > 0 ? totalTasksCreated / analysisHistory.length : 0,
            dailySyncActivity,
            recentEvents: events.slice(-5),
            recentEmails: mails.slice(-5),
            lastActivity: userSync.updatedAt ? new Date(userSync.updatedAt).getTime() : null
        };
    }

    /**
     * Calculate productivity metrics
     */
    async getProductivityMetrics(uid) {
        const allTasks = await Tasks.find({ owner: uid, deletedAt: null });
        const completedTasks = allTasks.filter(task => task.currentStatus === 'Completed');

        // Weekly productivity (last 4 weeks)
        const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
        const weeklyCompletions = this.generateWeeklyStats(completedTasks, 4);

        // Daily completion patterns (which days of week are most productive)
        const dayOfWeekStats = completedTasks.reduce((acc, task) => {
            if (task.completedTimestamps && task.completedTimestamps.length > 0) {
                const completionDate = new Date(task.completedTimestamps[task.completedTimestamps.length - 1]);
                const dayOfWeek = completionDate.getDay(); // 0 = Sunday, 6 = Saturday
                acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
            }
            return acc;
        }, {});

        // Hourly completion patterns
        const hourlyStats = completedTasks.reduce((acc, task) => {
            if (task.completedTimestamps && task.completedTimestamps.length > 0) {
                const completionDate = new Date(task.completedTimestamps[task.completedTimestamps.length - 1]);
                const hour = completionDate.getHours();
                acc[hour] = (acc[hour] || 0) + 1;
            }
            return acc;
        }, {});

        // Productivity score (0-100)
        const totalTasks = allTasks.length;
        const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
        const recentActivity = this.getRecentActivityScore(allTasks, 7); // last 7 days
        const consistencyScore = this.getConsistencyScore(weeklyCompletions);
        
        const productivityScore = Math.round(
            (completionRate * 0.4) + (recentActivity * 0.3) + (consistencyScore * 0.3)
        );

        return {
            productivityScore,
            weeklyCompletions,
            dayOfWeekStats,
            hourlyStats,
            completionRate,
            recentActivityScore: recentActivity,
            consistencyScore,
            streakDays: this.calculateStreakDays(completedTasks),
            bestDay: this.getBestDay(dayOfWeekStats),
            bestHour: this.getBestHour(hourlyStats)
        };
    }

    /**
     * Generate time-based analytics
     */
    async getTimeBasedAnalytics(uid) {
        const allTasks = await Tasks.find({ owner: uid }).sort({ createdAt: 1 });
        const allFolders = await Folder.find({ owner: uid }).sort({ createdAt: 1 });

        // Monthly growth (last 6 months)
        const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
        const monthlyTaskGrowth = this.generateMonthlyStats(allTasks, 6);
        const monthlyFolderGrowth = this.generateMonthlyStats(allFolders, 6);

        // Activity heatmap (last 90 days)
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const recentTasks = allTasks.filter(task => task.createdAt >= ninetyDaysAgo);
        const activityHeatmap = this.generateActivityHeatmap(recentTasks, 90);

        return {
            monthlyTaskGrowth,
            monthlyFolderGrowth,
            activityHeatmap,
            totalDaysActive: this.getTotalDaysActive(allTasks),
            firstTaskDate: allTasks.length > 0 ? allTasks[0].createdAt : null,
            accountAge: allTasks.length > 0 ? 
                Math.floor((Date.now() - new Date(allTasks[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0
        };
    }

    // Helper methods for analytics calculations

    generateDailyStats(items, days, dateField = 'createdAt') {
        const stats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            
            const count = items.filter(item => {
                const itemDate = new Date(item[dateField]);
                return itemDate >= dayStart && itemDate < dayEnd;
            }).length;

            stats.push({
                date: dayStart.toISOString().split('T')[0],
                count,
                label: `${date.getDate()}/${date.getMonth() + 1}`
            });
        }
        return stats;
    }

    generateCompletionStats(tasks, days) {
        const stats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            
            const count = tasks.filter(task => {
                if (!task.completedTimestamps || task.completedTimestamps.length === 0) return false;
                const completionDate = new Date(task.completedTimestamps[task.completedTimestamps.length - 1]);
                return completionDate >= dayStart && completionDate < dayEnd;
            }).length;

            stats.push({
                date: dayStart.toISOString().split('T')[0],
                count,
                label: `${date.getDate()}/${date.getMonth() + 1}`
            });
        }
        return stats;
    }

    generateWeeklyStats(items, weeks) {
        const stats = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
            const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const count = items.filter(item => {
                if (!item.completedTimestamps || item.completedTimestamps.length === 0) return false;
                const completionDate = new Date(item.completedTimestamps[item.completedTimestamps.length - 1]);
                return completionDate >= weekStart && completionDate < weekEnd;
            }).length;

            stats.push({
                week: `Week ${weeks - i}`,
                count,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0]
            });
        }
        return stats;
    }

    generateMonthlyStats(items, months) {
        const stats = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            
            const count = items.filter(item => {
                const itemDate = new Date(item.createdAt);
                return itemDate >= monthStart && itemDate < monthEnd;
            }).length;

            stats.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                count,
                date: monthStart.toISOString().split('T')[0]
            });
        }
        return stats;
    }

    generateActivityHeatmap(tasks, days) {
        const heatmap = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            
            const activity = tasks.filter(task => {
                const taskDate = new Date(task.createdAt);
                return taskDate >= dayStart && taskDate < dayEnd;
            }).length;

            heatmap.push({
                date: dayStart.toISOString().split('T')[0],
                activity,
                intensity: activity > 0 ? Math.min(4, Math.ceil(activity / 2)) : 0 // 0-4 intensity levels
            });
        }
        return heatmap;
    }

    getRecentActivityScore(tasks, days) {
        const recentDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const recentTasks = tasks.filter(task => task.createdAt >= recentDate || task.updatedAt >= recentDate);
        const maxScore = days * 2; // Assume max 2 tasks per day for 100% score
        return Math.min(100, (recentTasks.length / maxScore) * 100);
    }

    getConsistencyScore(weeklyCompletions) {
        if (weeklyCompletions.length === 0) return 0;
        
        const counts = weeklyCompletions.map(w => w.count);
        const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation = higher consistency
        const maxStdDev = avg; // If stdDev equals avg, consistency is 0%
        const consistencyScore = maxStdDev > 0 ? Math.max(0, 100 - (stdDev / maxStdDev) * 100) : 100;
        
        return Math.round(consistencyScore);
    }

    calculateStreakDays(completedTasks) {
        if (completedTasks.length === 0) return 0;

        const completionDates = completedTasks
            .filter(task => task.completedTimestamps && task.completedTimestamps.length > 0)
            .map(task => {
                const date = new Date(task.completedTimestamps[task.completedTimestamps.length - 1]);
                return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            })
            .filter((date, index, array) => array.indexOf(date) === index) // Remove duplicates
            .sort((a, b) => b - a); // Sort desc (most recent first)

        let streak = 0;
        let expectedDate = new Date();
        expectedDate = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate()).getTime();

        for (const date of completionDates) {
            if (date === expectedDate) {
                streak++;
                expectedDate -= 24 * 60 * 60 * 1000; // Previous day
            } else if (date === expectedDate + 24 * 60 * 60 * 1000) {
                // Skip today if no tasks completed yet
                expectedDate -= 24 * 60 * 60 * 1000;
                if (date === expectedDate) {
                    streak++;
                    expectedDate -= 24 * 60 * 60 * 1000;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        return streak;
    }

    getBestDay(dayOfWeekStats) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let bestDay = 'Monday';
        let maxCount = 0;

        Object.entries(dayOfWeekStats).forEach(([day, count]) => {
            if (count > maxCount) {
                maxCount = count;
                bestDay = days[parseInt(day)] || 'Monday';
            }
        });

        return { day: bestDay, count: maxCount };
    }

    getBestHour(hourlyStats) {
        let bestHour = 9;
        let maxCount = 0;

        Object.entries(hourlyStats).forEach(([hour, count]) => {
            if (count > maxCount) {
                maxCount = count;
                bestHour = parseInt(hour);
            }
        });

        const formatHour = (hour) => {
            if (hour === 0) return '12 AM';
            if (hour === 12) return '12 PM';
            if (hour < 12) return `${hour} AM`;
            return `${hour - 12} PM`;
        };

        return { hour: formatHour(bestHour), count: maxCount, rawHour: bestHour };
    }

    getTotalDaysActive(tasks) {
        if (tasks.length === 0) return 0;

        const activeDates = new Set();
        
        tasks.forEach(task => {
            // Add creation date
            const creationDate = new Date(task.createdAt);
            activeDates.add(new Date(creationDate.getFullYear(), creationDate.getMonth(), creationDate.getDate()).getTime());
            
            // Add update date if different
            if (task.updatedAt) {
                const updateDate = new Date(task.updatedAt);
                activeDates.add(new Date(updateDate.getFullYear(), updateDate.getMonth(), updateDate.getDate()).getTime());
            }
        });

        return activeDates.size;
    }
}

export default new AnalyticsService();