/**
 * Capabilities Routes
 *
 * Endpoints to verify connectivity to SAP systems via BTP Destination service.
 * Requires Admin role for security (capability checks can reveal system topology).
 */

import { Router } from 'express';
import { CapabilitiesController } from '../../controllers/CapabilitiesController';

const router: Router = Router();

/**
 * GET /api/capabilities/summary
 * Returns a summary of all connectivity capabilities
 */
router.get('/summary', CapabilitiesController.getSummary);

/**
 * GET /api/capabilities/s4/apis
 * Lists available S/4HANA Cloud APIs and tests connectivity
 */
router.get('/s4/apis', CapabilitiesController.getS4HANAAPIs);

/**
 * GET /api/capabilities/sfsf/apis
 * Lists available SuccessFactors OData APIs and tests connectivity
 */
router.get('/sfsf/apis', CapabilitiesController.getSuccessFactorsAPIs);

/**
 * GET /api/capabilities/ariba/apis
 * Lists available Ariba APIs and tests connectivity
 */
router.get('/ariba/apis', CapabilitiesController.getAribaAPIs);

/**
 * GET /api/capabilities/events
 * Checks Event Mesh connectivity and lists subscriptions
 */
router.get('/events', CapabilitiesController.getEventMeshStatus);

export default router;
