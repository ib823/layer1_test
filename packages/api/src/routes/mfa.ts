import { Router, type Router as IRouter } from 'express';
import { MFAController } from '../controllers/MFAController';
import { authenticate } from '../middleware/auth';

const router: IRouter = Router();
const mfaController = new MFAController();

/**
 * MFA (Multi-Factor Authentication) Routes
 * Base path: /api/mfa
 * All routes require authentication
 */

/**
 * @route POST /api/mfa/totp/setup
 * @desc Generate TOTP setup with QR code
 * @access Protected
 */
router.post('/totp/setup', authenticate, mfaController.setupTOTP.bind(mfaController));

/**
 * @route POST /api/mfa/totp/verify-setup
 * @desc Verify TOTP code and enable TOTP
 * @access Protected
 */
router.post('/totp/verify-setup', authenticate, mfaController.verifyAndEnableTOTP.bind(mfaController));

/**
 * @route POST /api/mfa/totp/verify
 * @desc Verify TOTP code during login
 * @access Protected
 */
router.post('/totp/verify', authenticate, mfaController.verifyTOTP.bind(mfaController));

/**
 * @route POST /api/mfa/totp/disable
 * @desc Disable TOTP for current user
 * @access Protected
 */
router.post('/totp/disable', authenticate, mfaController.disableTOTP.bind(mfaController));

/**
 * @route POST /api/mfa/backup-codes/regenerate
 * @desc Regenerate backup codes
 * @access Protected
 */
router.post('/backup-codes/regenerate', authenticate, mfaController.regenerateBackupCodes.bind(mfaController));

/**
 * @route POST /api/mfa/backup-codes/verify
 * @desc Verify backup code during login
 * @access Protected
 */
router.post('/backup-codes/verify', authenticate, mfaController.verifyBackupCode.bind(mfaController));

/**
 * @route GET /api/mfa/status
 * @desc Get MFA status for current user
 * @access Protected
 */
router.get('/status', authenticate, mfaController.getMFAStatus.bind(mfaController));

/**
 * @route PUT /api/mfa/preferred-method
 * @desc Set preferred MFA method
 * @access Protected
 */
router.put('/preferred-method', authenticate, mfaController.setPreferredMethod.bind(mfaController));

export default router;
