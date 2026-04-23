import express from 'express';
import Board from '../models/Board.model.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { boardValidator } from '../middleware/validation.middleware.js';

const router = express.Router();

// ── GET /api/boards — List user's boards ─────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const boards = await Board.find({ owner: req.user._id })
      .select('-canvasData -yjsState')
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email cursorColor')
      .lean();

    res.json({ success: true, data: { boards } });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/boards — Create a new board ────────────────────
router.post('/', protect, boardValidator, async (req, res, next) => {
  try {
    const { title = 'Untitled Board' } = req.body;

    const board = await Board.create({
      title,
      owner: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Board created.',
      data: { board },
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/boards/join/:roomCode — Join by room code ────────
router.get('/join/:roomCode', protect, async (req, res, next) => {
  try {
    const board = await Board.findOne({
      roomCode: req.params.roomCode.toUpperCase(),
    })
      .select('-yjsState')
      .populate('owner', 'name email cursorColor');

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Room not found. Check your code and try again.',
      });
    }

    // Add user to collaborators if not already there
    const isCollaborator = board.collaborators.some(
      (c) => c.user?.toString() === req.user._id.toString()
    );
    const isOwner = board.owner._id.toString() === req.user._id.toString();

    if (!isCollaborator && !isOwner) {
      board.collaborators.push({ user: req.user._id });
      await board.save();
    }

    res.json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/boards/:id — Get single board ────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner', 'name email cursorColor')
      .populate('collaborators.user', 'name email cursorColor');

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found.' });
    }

    // Access check: owner or collaborator
    const hasAccess =
      board.owner._id.toString() === req.user._id.toString() ||
      board.isPublic ||
      board.collaborators.some((c) => c.user?._id?.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: { board } });
  } catch (error) {
    next(error);
  }
});

// ── PATCH /api/boards/:id — Update board (title, canvas data) ─
router.patch('/:id', protect, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found.' });
    }

    const isOwner = board.owner.toString() === req.user._id.toString();
    const isCollaborator = board.collaborators.some(
      (c) => c.user?.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const allowedUpdates = isOwner
      ? ['title', 'isPublic', 'canvasData', 'thumbnail']
      : ['canvasData', 'thumbnail'];
      
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) board[field] = req.body[field];
    });

    board.lastModifiedBy = req.user._id;
    await board.save();

    res.json({ success: true, message: 'Board updated.', data: { board } });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /api/boards/:id — Delete board ────────────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found.' });
    }

    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can delete this board.' });
    }

    await board.deleteOne();
    res.json({ success: true, message: 'Board deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
