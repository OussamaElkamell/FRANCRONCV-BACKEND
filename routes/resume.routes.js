
const express = require('express');
const auth = require('../middleware/auth');
const ResumeModel = require('../models/Resume');
const OpenAIService = require('../services/openai.service');

const router = express.Router();

// POST /api/resume/generate
router.post('/generate', auth, async (req, res) => {
  try {
    console.log('Received resume generation request:', req.body);
    const resumeData = req.body;
    const userId = req.user.id;
    
    // Enhance resume with OpenAI
    let enhancedData = { ...resumeData };
    
    try {
      console.log('Enhancing resume with OpenAI');
      enhancedData = await OpenAIService.enhanceResume(resumeData);
      console.log('Resume enhanced successfully');
    } catch (error) {
      console.error('OpenAI enhancement error:', error);
      // Continue with original data if enhancement fails
    }
    
    // Add userId to the data
    enhancedData.userId = userId;
    
    // Save to Firebase Realtime Database
    try {
      const savedResume = await ResumeModel.create(enhancedData);
      console.log('Resume saved to database:', savedResume.id);
      
      res.status(201).json({
        success: true,
        data: savedResume
      });
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // If database save fails, still return the enhanced data
      res.status(201).json({
        success: true,
        data: {
          ...enhancedData
        },
        warning: 'Resume was enhanced but could not be saved to database'
      });
    }
  } catch (error) {
    console.error('Resume generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate resume',
      error: error.message
    });
  }
});

// GET /api/resume/:resumeId
router.get('/:resumeId', auth, async (req, res) => {
  try {
    const resumeId = req.params.resumeId;
    const userId = req.user.id;
    
    // Get resume from database
    const resume = await ResumeModel.findById(resumeId);
    
    // Check if resume exists and belongs to the user
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }
    
    if (resume.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resume'
      });
    }
    
    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resume',
      error: error.message
    });
  }
});

// GET /api/resume
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all resumes for the user
    const resumes = await ResumeModel.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resumes',
      error: error.message
    });
  }
});

module.exports = router;
