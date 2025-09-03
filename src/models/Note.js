// src/models/Note.js - Add this new file
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    body: {
        type: String,
        required: true,
        maxlength: 5000
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

noteSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("Note", noteSchema);

// src/controllers/noteController.js - Replace your existing file
const Note = require("../models/Note");

// GET /api/v1/notes - Get all notes for user
exports.getNotes = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, tags } = req.query;
        const skip = (page - 1) * limit;

        // Build query - user can see their own notes and public notes
        let query = {
            $or: [
                { author: req.user.id },
                { isPublic: true }
            ]
        };

        // Add search filter
        if (search) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { body: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Add tags filter
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            query.tags = { $in: tagArray };
        }

        const notes = await Note.find(query)
            .populate('author', 'email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Note.countDocuments(query);

        res.json({
            success: true,
            notes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Get notes error:', err);
        res.status(500).json({
            success: false,
            error: "Server Error",
            message: "Failed to fetch notes"
        });
    }
};

// GET /api/v1/notes/:id - Get single note
exports.getNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id)
            .populate('author', 'email');

        if (!note) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: "Note not found"
            });
        }

        // Check access permissions
        if (!note.isPublic && note.author._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Access Denied",
                message: "You don't have permission to view this note"
            });
        }

        res.json({
            success: true,
            note
        });
    } catch (err) {
        console.error('Get note error:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: "Invalid ID",
                message: "Invalid note ID format"
            });
        }
        res.status(500).json({
            success: false,
            error: "Server Error",
            message: "Failed to fetch note"
        });
    }
};

// POST /api/v1/notes - Create new note
exports.createNote = async (req, res) => {
    try {
        const { title, body, isPublic = false, tags = [] } = req.body;

        // Validation
        if (!title || !body) {
            return res.status(400).json({
                success: false,
                error: "Validation Error",
                message: "Title and body are required"
            });
        }

        if (title.trim().length === 0 || body.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Validation Error",
                message: "Title and body cannot be empty"
            });
        }

        const note = new Note({
            title: title.trim(),
            body: body.trim(),
            author: req.user.id,
            isPublic: Boolean(isPublic),
            tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : []
        });

        await note.save();
        await note.populate('author', 'email');

        res.status(201).json({
            success: true,
            message: "Note created successfully",
            note
        });
    } catch (err) {
        console.error('Create note error:', err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: errors.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            error: "Server Error",
            message: "Failed to create note"
        });
    }
};

// PUT /api/v1/notes/:id - Update note
exports.updateNote = async (req, res) => {
    try {
        const { title, body, isPublic, tags } = req.body;

        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: "Note not found"
            });
        }

        // Check ownership
        if (note.author.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Access Denied",
                message: "You can only edit your own notes"
            });
        }

        // Update fields if provided
        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({
                    success: false,
                    error: "Validation Error",
                    message: "Title cannot be empty"
                });
            }
            note.title = title.trim();
        }

        if (body !== undefined) {
            if (!body.trim()) {
                return res.status(400).json({
                    success: false,
                    error: "Validation Error",
                    message: "Body cannot be empty"
                });
            }
            note.body = body.trim();
        }

        if (isPublic !== undefined) note.isPublic = Boolean(isPublic);
        if (tags !== undefined) {
            note.tags = Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [];
        }

        await note.save();
        await note.populate('author', 'email');

        res.json({
            success: true,
            message: "Note updated successfully",
            note
        });
    } catch (err) {
        console.error('Update note error:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: "Invalid ID",
                message: "Invalid note ID format"
            });
        }
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: errors.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            error: "Server Error",
            message: "Failed to update note"
        });
    }
};

// DELETE /api/v1/notes/:id - Delete note
exports.deleteNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({
                success: false,
                error: "Not Found",
                message: "Note not found"
            });
        }

        // Check ownership or admin role
        const isOwner = note.author.toString() === req.user.id;
        const isAdmin = req.user.roles && req.user.roles.includes('ADMIN');

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: "Access Denied",
                message: "You can only delete your own notes"
            });
        }

        await Note.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Note deleted successfully"
        });
    } catch (err) {
        console.error('Delete note error:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: "Invalid ID",
                message: "Invalid note ID format"
            });
        }
        res.status(500).json({
            success: false,
            error: "Server Error",
            message: "Failed to delete note"
        });
    }
};

// GET /api/v1/notes/my - Get only user's own notes
exports.getMyNotes = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const notes = await Note.find({ author: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Note.countDocuments({ author: req.user.id });

        res.json({
            success: true,
            notes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Get my notes error:', err);
        res.status(500).json({
            success: false,
            error: "Server Error",
            message: "Failed to fetch your notes"
        });
    }
};

// src/routes/noteRoutes.js - Update your existing file
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    getMyNotes
} = require("../controllers/noteController");

// All note routes require authentication
router.use(auth);

// Routes
router.get("/", getNotes);           // GET /api/v1/notes
router.get("/my", getMyNotes);       // GET /api/v1/notes/my
router.get("/:id", getNote);         // GET /api/v1/notes/:id
router.post("/", createNote);        // POST /api/v1/notes
router.put("/:id", updateNote);      // PUT /api/v1/notes/:id
router.delete("/:id", deleteNote);   // DELETE /api/v1/notes/:id

module.exports = router;