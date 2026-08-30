const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

// SECURITY FIX: input validation for admin-created/updated projects — was
// previously missing entirely, allowing oversized fields and non-http(s)
// URLs (e.g. javascript:) to be written straight to the database.
const validateProjectInput = [
  body('title')
    .optional()
    .isString().withMessage('Title must be a string.')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.')
    .isLength({ max: 5000 }).withMessage('Description must be at most 5000 characters.'),
  body('github_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('GitHub URL must be a valid http/https URL.'),
  body('demo_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Demo URL must be a valid http/https URL.'),
  body('status')
    .optional()
    .isIn(['published', 'draft', 'hidden']).withMessage('Status must be published, draft, or hidden.'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/block', adminController.blockUser);
router.put('/users/:id/block', adminController.blockUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/projects', adminController.getProjects);
router.post('/projects', upload.single('thumbnail'), validateProjectInput, handleValidationErrors, adminController.addProjectForStudent);
router.patch('/projects/:id', validateProjectInput, handleValidationErrors, adminController.updateProject);
router.put('/projects/:id', validateProjectInput, handleValidationErrors, adminController.updateProject);
router.delete('/projects/:id', adminController.deleteProject);
router.get('/search', adminController.globalSearch);
router.get('/notifications', adminController.getAdminNotifications);
router.patch('/notifications/:id/read', adminController.markNotificationRead);
router.patch('/notifications/read-all', adminController.markAllNotificationsRead);

module.exports = router;