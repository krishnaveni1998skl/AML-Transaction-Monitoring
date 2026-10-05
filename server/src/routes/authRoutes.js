import express from 'express';
import { login, getMe, logout, getUsers } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, getUsers);
router.post('/logout', authenticate, logout);

export default router;
