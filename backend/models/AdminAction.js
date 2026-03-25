const mongoose = require('mongoose');

const adminActionSchema = mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: [
        'doctor_add',
        'doctor_update',
        'doctor_delete',
        'patient_add',
        'patient_update',
        'patient_delete',
        'user_delete',
        'admin_add',
        'admin_remove',
        'bulk_import',
        'system_config'
      ],
      required: [true, 'Action type is required'],
    },
    
    actionNamespace: {
      type: String,
      description: 'Category of action (doctor, patient, user, admin, system)',
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Payload data is required'],
    },

    initiatedBy: {
      type: String,
      required: [true, 'Initiator admin is required'],
    },

    initiatorName: {
      type: String,
      required: true,
    },

    approvals: [
      {
        adminId: {
          type: String,
          required: true,
        },
        adminName: String,
        approvedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    rejections: [
      {
        adminId: {
          type: String,
          required: true,
        },
        adminName: String,
        reason: String,
        rejectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'executed', 'expired', 'cancelled'],
      default: 'pending',
    },

    executionResult: {
      success: Boolean,
      message: String,
      details: mongoose.Schema.Types.Mixed,
      executedAt: Date,
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
      index: true,
    },

    auditLog: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: String,
        adminId: mongoose.Schema.Types.ObjectId,
        adminName: String,
        details: String,
      },
    ],

    targetEntity: {
      type: {
        type: String, // 'doctor', 'patient', 'user', etc.
      },
      entityId: mongoose.Schema.Types.ObjectId,
      entityName: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding pending actions
adminActionSchema.index({ status: 1, createdAt: -1 });
adminActionSchema.index({ initiatedBy: 1, createdAt: -1 });

// Virtual for approval count
adminActionSchema.virtual('approvalCount').get(function () {
  return this.approvals.length;
});

// Method to check if action requires more approvals
adminActionSchema.methods.needsMoreApprovals = function (requiredApprovals = 3) {
  return this.approvals.length < requiredApprovals;
};

// Method to check if admin already approved
adminActionSchema.methods.hasAdminApproved = function (adminId) {
  return this.approvals.some(a => a.adminId.toString() === adminId.toString());
};

// Method to check if admin already rejected
adminActionSchema.methods.hasAdminRejected = function (adminId) {
  return this.rejections.some(r => r.adminId.toString() === adminId.toString());
};

// Method to check if action is expired
adminActionSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Static method to get pending actions for an admin
adminActionSchema.statics.getPendingForAdmin = async function (adminId) {
  return await this.find({
    status: 'pending',
    'approvals.adminId': { $ne: adminId },
    expiresAt: { $gt: new Date() },
  })
    .populate('initiatedBy', 'name email')
    .populate('approvals.adminId', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get all pending actions
adminActionSchema.statics.getAllPending = async function () {
  return await this.find({
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('initiatedBy', 'name email')
    .populate('approvals.adminId', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('AdminAction', adminActionSchema);
