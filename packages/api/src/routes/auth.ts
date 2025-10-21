import { Router, type Router as IRouter } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';

const router: IRouter = Router();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route GET /api/auth/me
 * @desc Get current user information
 * @access Protected (requires authentication)
 */
router.get('/me', authenticate, AuthController.getCurrentUser);

/**
 * @route POST /api/auth/logout
 * @desc Logout current user
 * @access Protected (requires authentication)
 */
router.post('/logout', authenticate, AuthController.logout);

export default router;
