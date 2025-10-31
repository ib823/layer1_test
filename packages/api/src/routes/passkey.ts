import { Router, type Router as IRouter } from 'express';
import { PasskeyController } from '../controllers/PasskeyController';
import { authenticate } from '../middleware/auth';

const router: IRouter = Router();
const passkeyController = new PasskeyController();

/**
 * Passkey (WebAuthn) Routes
 * Base path: /api/passkey
 * All routes require authentication except authentication endpoints
 */

/**
 * @route POST /api/passkey/register/options
 * @desc Generate WebAuthn registration options
 * @access Protected
 */
router.post('/register/options', authenticate, passkeyController.getRegistrationOptions.bind(passkeyController));

/**
 * @route POST /api/passkey/register/verify
 * @desc Verify WebAuthn registration response
 * @access Protected
 */
router.post('/register/verify', authenticate, passkeyController.verifyRegistration.bind(passkeyController));

/**
 * @route POST /api/passkey/auth/options
 * @desc Generate WebAuthn authentication options
 * @access Public (used during login)
 */
router.post('/auth/options', passkeyController.getAuthenticationOptions.bind(passkeyController));

/**
 * @route POST /api/passkey/auth/verify
 * @desc Verify WebAuthn authentication response
 * @access Public (used during login)
 */
router.post('/auth/verify', passkeyController.verifyAuthentication.bind(passkeyController));

/**
 * @route GET /api/passkey/list
 * @desc Get all passkeys for current user
 * @access Protected
 */
router.get('/list', authenticate, passkeyController.listPasskeys.bind(passkeyController));

/**
 * @route DELETE /api/passkey/:id
 * @desc Remove a passkey
 * @access Protected
 */
router.delete('/:id', authenticate, passkeyController.removePasskey.bind(passkeyController));

/**
 * @route PUT /api/passkey/:id/rename
 * @desc Rename a passkey
 * @access Protected
 */
router.put('/:id/rename', authenticate, passkeyController.renamePasskey.bind(passkeyController));

export default router;
