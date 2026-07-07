const router = require('express').Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  createTeam,
  getTeams,
  createSession,
  getSessionLogs,
  getDiscovery
} = require('../controllers/agentTeam.controller');

router.use(authMiddleware);

router.post('/', createTeam);
router.get('/', getTeams);
router.post('/:teamId/sessions', createSession);
router.get('/sessions/:sessionId/logs', getSessionLogs);
router.get('/:teamId/discovery', getDiscovery);

module.exports = router;