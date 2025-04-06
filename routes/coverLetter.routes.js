
const express = require('express');
const auth = require('../middleware/auth');
const CoverLetterModel = require('../models/CoverLetter');
const OpenAIService = require('../services/openai.service');

const router = express.Router();

// POST /api/cover-letter/generate
router.post('/generate', auth, async (req, res) => {
  try {
    const coverLetterData = req.body;
    const userId = req.user.id;
    
    // Enhance cover letter with OpenAI
    let enhancedData = { ...coverLetterData };
    
    try {
      enhancedData = await OpenAIService.enhanceCoverLetter(coverLetterData);
    } catch (error) {
      console.error('OpenAI enhancement error:', error);
      // Continue with original data if enhancement fails
    }
    
    // Add userId to the data
    enhancedData.userId = userId;
    
    // Save to Firebase Realtime Database
    try {
      const savedCoverLetter = await CoverLetterModel.create(enhancedData);
      
      res.status(201).json({
        success: true,
        data: savedCoverLetter
      });
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // If database save fails, still return the enhanced data
      res.status(201).json({
        success: true,
        data: {
          ...enhancedData
        },
        warning: 'Cover letter was enhanced but could not be saved to database'
      });
    }
  } catch (error) {
    console.error('Cover letter generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate cover letter'
    });
  }
});

// GET /api/cover-letter/:coverLetterId
router.get('/:coverLetterId', auth, async (req, res) => {
  try {
    const coverLetterId = req.params.coverLetterId;
    const userId = req.user.id;
    
    // Get cover letter from database
    const coverLetter = await CoverLetterModel.findById(coverLetterId);
    
    // Check if cover letter exists and belongs to the user
    if (!coverLetter) {
      return res.status(404).json({
        success: false,
        message: 'Cover letter not found'
      });
    }
    
    if (coverLetter.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this cover letter'
      });
    }
    
    res.status(200).json({
      success: true,
      data: coverLetter
    });
  } catch (error) {
    console.error('Get cover letter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cover letter',
      error: error.message
    });
  }
});

// GET /api/cover-letter
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all cover letters for the user
    const coverLetters = await CoverLetterModel.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: coverLetters
    });
  } catch (error) {
    console.error('Get cover letters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cover letters',
      error: error.message
    });
  }
});

module.exports = router;
