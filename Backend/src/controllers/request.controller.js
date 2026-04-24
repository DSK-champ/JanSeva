const ServiceRequest = require('../models/ServiceRequest');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Build a dynamic MongoDB query from URL query params
 */
const buildFilterQuery = (queryParams) => {
  const { category, priority, status, location, search, startDate, endDate } = queryParams;
  const filter = {};

  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (status) filter.status = status;
  if (location) filter['location.city'] = { $regex: location, $options: 'i' };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'location.city': { $regex: search, $options: 'i' } },
    ];
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  return filter;
};

// ─── @route  POST /api/requests ───────────────────────────────────────────────
// ─── @access Private
const createRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.create({
    ...req.body,
    createdBy: req.user._id,
  });
  await request.populate('createdBy', 'name email role');
  logger.info(`New service request created: "${request.title}" by ${req.user.email}`);
  sendSuccess(res, 201, 'Service request created successfully', request);
});

// ─── @route  GET /api/requests/my — Own requests only ────────────────────────
// ─── @access Private
const getMyRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const filter = { createdBy: req.user._id };

  const [requests, total] = await Promise.all([
    ServiceRequest.find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limitNum),
    ServiceRequest.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Your requests fetched', requests, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});


// ─── @route  GET /api/requests ────────────────────────────────────────────────
// ─── @access Public (with optional auth)
const getRequests = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = 'createdAt',
    order = 'desc',
    ...filterParams
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const allowedSortFields = ['createdAt', 'priority', 'status', 'title'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
  const sortOrder = order === 'asc' ? 1 : -1;

  const filter = buildFilterQuery(filterParams);

  const [requests, total] = await Promise.all([
    ServiceRequest.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedVolunteers', 'name email')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limitNum),
    ServiceRequest.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    'Requests fetched successfully',
    requests,
    {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
    }
  );
});

// ─── @route  GET /api/requests/:id ───────────────────────────────────────────
// ─── @access Public
const getRequestById = asyncHandler(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id)
    .populate('createdBy', 'name email role')
    .populate('assignedVolunteers', 'name email');

  if (!request) return next(new AppError('Service request not found.', 404));
  sendSuccess(res, 200, 'Request fetched', request);
});

// ─── @route  PUT /api/requests/:id ───────────────────────────────────────────
// ─── @access Private (owner or admin)
const updateRequest = asyncHandler(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id);
  if (!request) return next(new AppError('Service request not found.', 404));

  // Only owner or admin can update
  const isOwner = request.createdBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return next(new AppError('Not authorized to update this request.', 403));
  }

  // Prevent direct manipulation of sensitive fields
  delete req.body.createdBy;
  delete req.body.assignedVolunteers;

  const updated = await ServiceRequest.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');

  logger.info(`Request ${req.params.id} updated by ${req.user.email}`);
  sendSuccess(res, 200, 'Request updated successfully', updated);
});

// ─── @route  DELETE /api/requests/:id ────────────────────────────────────────
// ─── @access Private (owner or admin)
const deleteRequest = asyncHandler(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id);
  if (!request) return next(new AppError('Service request not found.', 404));

  const isOwner = request.createdBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return next(new AppError('Not authorized to delete this request.', 403));
  }

  await request.deleteOne();
  logger.info(`Request ${req.params.id} deleted by ${req.user.email}`);
  sendSuccess(res, 200, 'Service request deleted successfully');
});

module.exports = { createRequest, getMyRequests, getRequests, getRequestById, updateRequest, deleteRequest };
