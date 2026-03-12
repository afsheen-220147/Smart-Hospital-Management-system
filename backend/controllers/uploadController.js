const asyncHandler = require('express-async-handler');
const { deleteFromCloudinary, getPublicIdFromUrl } = require('../config/cloudinary');
const Visit = require('../models/Visit');

// @desc    Upload medical report
// @route   POST /api/v1/uploads/report
// @access  Private
const uploadMedicalReport = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a file');
  }

  // Cloudinary response includes the URL
  const fileUrl = req.file.path;
  const publicId = req.file.filename;

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      url: fileUrl,
      publicId: publicId,
      originalName: req.file.originalname,
      size: req.file.size,
      format: req.file.mimetype
    }
  });
});

// @desc    Upload prescription
// @route   POST /api/v1/uploads/prescription
// @access  Private (Doctor only)
const uploadPrescription = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a file');
  }

  const fileUrl = req.file.path;
  const publicId = req.file.filename;

  // If visitId is provided, attach to visit record
  if (req.body.visitId) {
    const visit = await Visit.findById(req.body.visitId);
    if (visit) {
      visit.fileUrl = fileUrl;
      await visit.save();
    }
  }

  res.status(200).json({
    success: true,
    message: 'Prescription uploaded successfully',
    data: {
      url: fileUrl,
      publicId: publicId,
      originalName: req.file.originalname,
      size: req.file.size,
      format: req.file.mimetype
    }
  });
});

// @desc    Upload profile image
// @route   POST /api/v1/uploads/profile
// @access  Private
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image');
  }

  const fileUrl = req.file.path;
  const publicId = req.file.filename;

  res.status(200).json({
    success: true,
    message: 'Profile image uploaded successfully',
    data: {
      url: fileUrl,
      publicId: publicId,
      originalName: req.file.originalname,
      size: req.file.size
    }
  });
});

// @desc    Delete uploaded file
// @route   DELETE /api/v1/uploads/:publicId
// @access  Private
const deleteUpload = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  const { resourceType } = req.query; // 'image', 'raw' for PDFs

  if (!publicId) {
    res.status(400);
    throw new Error('Public ID is required');
  }

  const result = await deleteFromCloudinary(publicId, resourceType || 'image');

  if (result && result.result === 'ok') {
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

module.exports = {
  uploadMedicalReport,
  uploadPrescription,
  uploadProfileImage,
  deleteUpload
};
