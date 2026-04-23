import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Board title is required'],
      trim: true,
      default: 'Untitled Board',
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    // 6-character unique room code for joining
    roomCode: {
      type: String,
      unique: true,
      default: () => nanoid(6).toUpperCase(),
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Collaborators who have accessed this board
    collaborators: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date, default: Date.now },
        role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
      },
    ],
    // Serialized Fabric.js canvas JSON — stored as string for flexibility
    canvasData: {
      type: String,
      default: null,
    },
    // Yjs document state (binary, stored as base64)
    yjsState: {
      type: String,
      default: null,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

boardSchema.index({ owner: 1, createdAt: -1 });

const Board = mongoose.model('Board', boardSchema);
export default Board;
