const express = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  mutex,
  getEvents,
  getRegistrations,
  saveRegistrations,
} = require('../data/store');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/events/:eventId/register', async (req, res, next) => {
  const { eventId } = req.params;

  const release = await mutex.acquire(eventId);

  try {
    const { userName } = req.body;

    // --- Validation ---
    if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'User name is required and must be a non-empty string.');
    }

    // --- Check event exists ---
    const events = getEvents();
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found.');
    }

    if (new Date(event.date) <= new Date()) {
      throw new ApiError(400, 'EVENT_PASSED', 'Cannot register for an event that has already passed.');
    }

    const registrations = getRegistrations();

    const existingReg = registrations.find(
      (r) =>
        r.eventId === eventId &&
        r.userName.toLowerCase() === userName.trim().toLowerCase() &&
        r.status === 'active'
    );
    if (existingReg) {
      throw new ApiError(
        409,
        'DUPLICATE_REGISTRATION',
        `User "${userName.trim()}" is already registered for this event.`
      );
    }

    const activeCount = registrations.filter(
      (r) => r.eventId === eventId && r.status === 'active'
    ).length;

    if (activeCount >= event.totalSeats) {
      throw new ApiError(400, 'EVENT_FULL', 'This event is fully booked. No seats available.');
    }

    const newRegistration = {
      id: uuidv4(),
      eventId,
      userName: userName.trim(),
      status: 'active',
      registeredAt: new Date().toISOString(),
      cancelledAt: null,
    };

    registrations.push(newRegistration);
    saveRegistrations(registrations);

    res.status(201).json({ success: true, data: newRegistration });
  } catch (err) {
    next(err);
  } finally {
    mutex.release(eventId, release);
  }
});

router.patch('/registrations/:id/cancel', async (req, res, next) => {
  const registrations = getRegistrations();
  const registration = registrations.find((r) => r.id === req.params.id);

  if (!registration) {
    return next(new ApiError(404, 'REGISTRATION_NOT_FOUND', 'Registration not found.'));
  }

  const release = await mutex.acquire(registration.eventId);

  try {
    const freshRegistrations = getRegistrations();
    const freshReg = freshRegistrations.find((r) => r.id === req.params.id);

    if (!freshReg) {
      throw new ApiError(404, 'REGISTRATION_NOT_FOUND', 'Registration not found.');
    }

    if (freshReg.status === 'cancelled') {
      throw new ApiError(400, 'ALREADY_CANCELLED', 'This registration has already been cancelled.');
    }

    freshReg.status = 'cancelled';
    freshReg.cancelledAt = new Date().toISOString();

    saveRegistrations(freshRegistrations);

    res.json({
      success: true,
      message: 'Registration cancelled successfully. The seat is now available.',
      data: freshReg,
    });
  } catch (err) {
    next(err);
  } finally {
    mutex.release(registration.eventId, release);
  }
});

module.exports = router;
