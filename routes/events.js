const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getEvents, saveEvents, getRegistrations } = require('../data/store');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();
router.post('/', (req, res, next) => {
  try {
    const { name, totalSeats, date } = req.body;

    // --- Validation ---
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Event name is required and must be a non-empty string.');
    }

    if (totalSeats === undefined || totalSeats === null) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Total seats is required.');
    }
    if (typeof totalSeats !== 'number' || !Number.isInteger(totalSeats) || totalSeats <= 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Total seats must be a positive integer greater than 0.');
    }

    if (!date) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Event date is required.');
    }
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid date format. Use ISO 8601 (e.g., 2025-12-31T18:00:00Z).');
    }
    if (eventDate <= new Date()) {
      throw new ApiError(400, 'DATE_IN_PAST', 'Event date must be in the future.');
    }

    // --- Uniqueness check ---
    const events = getEvents();
    const duplicate = events.find(
      (e) => e.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) {
      throw new ApiError(409, 'DUPLICATE_EVENT', `An event with the name "${name.trim()}" already exists.`);
    }

    // --- Create ---
    const newEvent = {
      id: uuidv4(),
      name: name.trim(),
      totalSeats,
      date: eventDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    events.push(newEvent);
    saveEvents(events);

    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  try {
    let events = getEvents();
    const registrations = getRegistrations();

    if (req.query.upcoming === 'true') {
      const now = new Date();
      events = events.filter((e) => new Date(e.date) > now);
    }

    if (req.query.sort === 'date') {
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    const enriched = events.map((event) => {
      const activeRegs = registrations.filter(
        (r) => r.eventId === event.id && r.status === 'active'
      );
      return {
        ...event,
        totalRegistrations: activeRegs.length,
        availableSeats: event.totalSeats - activeRegs.length,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const events = getEvents();
    const event = events.find((e) => e.id === req.params.id);

    if (!event) {
      throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found.');
    }

    const registrations = getRegistrations();
    const activeRegs = registrations.filter(
      (r) => r.eventId === event.id && r.status === 'active'
    );

    res.json({
      success: true,
      data: {
        ...event,
        totalRegistrations: activeRegs.length,
        availableSeats: event.totalSeats - activeRegs.length,
        registrations: activeRegs.map((r) => ({
          id: r.id,
          userName: r.userName,
          registeredAt: r.registeredAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
