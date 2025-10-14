const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/calendar.controller');
const schemas = require('../validators/calendar.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/', validate(schemas.calendarView, 'query'), controller.getCalendarView);
router.get('/occupancy', validate(schemas.occupancy, 'query'), controller.getOccupancy);
router.get('/suggest-kennel', validate(schemas.suggestKennel, 'query'), controller.suggestKennel);
router.post('/bookings/:bookingId/assign', validate(schemas.assignKennel), controller.assignKennel);
router.patch('/segments/:segmentId/reassign', validate(schemas.reassignKennel), controller.reassignKennel);

module.exports = router;
