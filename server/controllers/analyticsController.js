import analyticsService from '../services/analyticsService.js';

/**
 * Get comprehensive user analytics
 */
export const getUserAnalytics = async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const analytics = await analyticsService.generateUserAnalytics(uid);
        
        if (!analytics.success) {
            return res.status(500).json({
                success: false,
                error: analytics.error
            });
        }

        res.json({
            success: true,
            data: analytics.data
        });
    } catch (error) {
        console.error('Error getting user analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get task analytics only
 */
export const getTaskAnalytics = async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const taskAnalytics = await analyticsService.getTaskAnalytics(uid);

        res.json({
            success: true,
            data: taskAnalytics
        });
    } catch (error) {
        console.error('Error getting task analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get folder analytics only
 */
export const getFolderAnalytics = async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const folderAnalytics = await analyticsService.getFolderAnalytics(uid);

        res.json({
            success: true,
            data: folderAnalytics
        });
    } catch (error) {
        console.error('Error getting folder analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get productivity metrics only
 */
export const getProductivityMetrics = async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const productivityMetrics = await analyticsService.getProductivityMetrics(uid);

        res.json({
            success: true,
            data: productivityMetrics
        });
    } catch (error) {
        console.error('Error getting productivity metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get sync analytics only
 */
export const getSyncAnalytics = async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const syncAnalytics = await analyticsService.getSyncAnalytics(uid);

        res.json({
            success: true,
            data: syncAnalytics
        });
    } catch (error) {
        console.error('Error getting sync analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get time-based analytics only
 */
export const getTimeBasedAnalytics = async (req, res) => {
    try {
        const uid = req.headers['x-client-uid'];
        
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const timeAnalytics = await analyticsService.getTimeBasedAnalytics(uid);

        res.json({
            success: true,
            data: timeAnalytics
        });
    } catch (error) {
        console.error('Error getting time-based analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};