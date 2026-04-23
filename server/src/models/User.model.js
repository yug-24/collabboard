import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    avatar: {
      type: String,
      default: null,
    },
    // Color used for this user's cursor in collaborative boards
    cursorColor: {
      type: String,
      default: () => {
        const colors = [
          '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
          '#10B981', '#EF4444', '#06B6D4', '#F97316',
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },
    refreshTokens: {
      type: [String],
      default: [],
      select: false, // Security: never expose refresh tokens
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    // Disable versioning (__v field) to prevent optimistic concurrency conflicts
    // on concurrent refreshToken updates
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    cursorColor: this.cursorColor,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
export default User;
