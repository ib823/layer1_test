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

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset (sends email with reset link)
 * @access Public
 */
router.post('/forgot-password', AuthController.requestPasswordReset);

/**
 * @route GET /api/auth/verify-reset-token
 * @desc Verify that a password reset token is valid
 * @access Public
 */
router.get('/verify-reset-token', AuthController.verifyResetToken);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using valid token
 * @access Public
 */
router.post('/reset-password', AuthController.resetPassword);

/**
 * @route POST /api/auth/register
 * @desc Request user registration with email verification
 * @access Public
 */
router.post('/register', AuthController.requestRegistration);

/**
 * @route POST /api/auth/verify-registration
 * @desc Verify registration token and create user
 * @access Public
 */
router.post('/verify-registration', AuthController.verifyRegistration);

export default router;
