import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { dbManager } from '../database';

export interface ISharedUser extends Document {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  phone?: string;
  systemRole: 'superadmin' | 'admin' | 'user';
  isActive: boolean;
  isEmailVerified: boolean;
  isSuspended: boolean;
  suspendedReason?: string;
  emailSuffix?: string;
  userType: 'individual' | 'enterprise';
  removedFromEnterprises?: mongoose.Types.ObjectId[];
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  lastLoginPlatform?: string;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const sharedUserSchema = new Schema<ISharedUser>({
  email: {
    type: String,
    required: [true, '邮箱是必需的'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, '密码是必需的'],
    minlength: [6, '密码至少6位']
  },
  name: {
    type: String,
    required: [true, '姓名是必需的'],
    trim: true,
    maxlength: [50, '姓名不能超过50个字符']
  },
  avatar: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\-\+\(\)\s]+$/, '请输入有效的电话号码']
  },
  systemRole: {
    type: String,
    enum: ['superadmin', 'admin', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspendedReason: {
    type: String,
    trim: true
  },
  emailSuffix: {
    type: String,
    trim: true
  },
  userType: {
    type: String,
    enum: ['individual', 'enterprise'],
    default: 'enterprise'
  },
  removedFromEnterprises: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedEnterprise'
  }],
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  lastLoginPlatform: {
    type: String,
    trim: true
  },
  loginCount: {
    type: Number,
    default: 0,
    min: [0, '登录次数不能为负数']
  }
}, {
  timestamps: true,
  collection: 'shareduser'
});

// 密码加密中间件
sharedUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 密码比较方法
sharedUserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 索引
sharedUserSchema.index({ email: 1 }, { unique: true });
sharedUserSchema.index({ systemRole: 1 });
sharedUserSchema.index({ emailSuffix: 1 });
sharedUserSchema.index({ isActive: 1 });
sharedUserSchema.index({ isEmailVerified: 1 });
sharedUserSchema.index({ isSuspended: 1 });
sharedUserSchema.index({ userType: 1 });
sharedUserSchema.index({ loginCount: 1 });
sharedUserSchema.index({ lastLogin: -1 });
sharedUserSchema.index({ lastLoginPlatform: 1 });
sharedUserSchema.index({ emailVerificationToken: 1 });
sharedUserSchema.index({ passwordResetToken: 1 });
sharedUserSchema.index({ removedFromEnterprises: 1 });

// 延迟初始化模型，避免循环依赖
let SharedUser: mongoose.Model<ISharedUser>;

export const getSharedUserModel = () => {
  if (!SharedUser) {
    try {
      const connection = dbManager.getSharedataConnection();
      if (connection.readyState !== 1) {
        throw new Error(`Sharedata数据库连接状态异常: ${connection.readyState}`);
      }
      SharedUser = connection.model<ISharedUser>('SharedUser', sharedUserSchema);
      console.log('✅ SharedUser模型初始化成功');
    } catch (error) {
      console.error('❌ SharedUser模型初始化失败:', error);
      throw error;
    }
  }
  return SharedUser;
};

export { getSharedUserModel as SharedUser };
export default getSharedUserModel;
