import { Router, type Router as IRouter } from 'express';
import { SessionController } from '../controllers/SessionController';
import { authenticate } from '../middleware/auth';

const router: IRouter = Router();
const sessionController = new SessionController();

/**
 * Session Management Routes
 * Base path: /api/sessions
 * All routes require authentication
 */

/**
 * @route GET /api/sessions
 * @desc Get all active sessions for current user
 * @access Protected
 */
router.get('/', authenticate, sessionController.getSessions.bind(sessionController));

/**
 * @route GET /api/sessions/current
 * @desc Get current session details
 * @access Protected
 */
router.get('/current', authenticate, sessionController.getCurrentSession.bind(sessionController));

/**
 * @route DELETE /api/sessions/:sessionId
 * @desc Revoke a specific session
 * @access Protected
 */
router.delete('/:sessionId', authenticate, sessionController.revokeSession.bind(sessionController));

/**
 * @route DELETE /api/sessions
 * @desc Revoke all sessions except current
 * @access Protected
 */
router.delete('/', authenticate, sessionController.revokeOtherSessions.bind(sessionController));

/**
 * @route DELETE /api/sessions/all
 * @desc Revoke all sessions including current (logout everywhere)
 * @access Protected
 */
router.delete('/all', authenticate, sessionController.revokeAllSessions.bind(sessionController));

/**
 * @route POST /api/sessions/validate
 * @desc Validate session token
 * @access Protected
 */
router.post('/validate', authenticate, sessionController.validateSession.bind(sessionController));

export default router;
