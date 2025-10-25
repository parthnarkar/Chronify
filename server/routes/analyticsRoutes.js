import express from 'express';
import { 
    getUserAnalytics, 
    getTaskAnalytics, 
    getFolderAnalytics, 
    getProductivityMetrics, 
    getSyncAnalytics, 
    getTimeBasedAnalytics 
} from '../controllers/analyticsController.js';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';

const router = express.Router();

// All analytics routes require authentication
router.use(verifyFirebaseToken);

// Comprehensive user analytics
router.get('/user', getUserAnalytics);

// Specific analytics endpoints
router.get('/tasks', getTaskAnalytics);
router.get('/folders', getFolderAnalytics);
router.get('/productivity', getProductivityMetrics);
router.get('/sync', getSyncAnalytics);
router.get('/time-based', getTimeBasedAnalytics);

export default router;