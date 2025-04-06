
const axios = require('axios');

/**
 * Service to handle OpenAI API interactions
 */
class OpenAIService {
  /**
   * Generate enhanced content using OpenAI
   * @param {string} prompt - The prompt to send to OpenAI
   * @param {string} systemPrompt - The system prompt to set context
   * @returns {Promise<string>} - Generated content
   */
  static async generateContent(prompt, systemPrompt = "You are a helpful assistant.") {
    try {
      console.log('Generating content with OpenAI...');
      console.log('System prompt:', systemPrompt);
      console.log('User prompt:', prompt);
      
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        },
        {
          headers: { 
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json" 
          }
        }
      );
      
      console.log('OpenAI response received');
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI content');
    }
  }
  
  /**
   * Enhance a resume using OpenAI
   * @param {Object} resumeData - The resume data to enhance
   * @returns {Promise<Object>} - Enhanced resume data
   */
  static async enhanceResume(resumeData) {
    const systemPrompt = "You are a professional resume writer with expertise in creating compelling and effective resumes. Your task is to enhance the provided resume summary to be more professional, impactful, and tailored to the individual's experience and skills. Be specific and highlight key achievements.";
    
    // Create a structured prompt based on available resume information
    let prompt = `Please enhance the following resume to make it more professional and impactful.`;
    
    // Add personal info context
    prompt += `\n\nAbout the person:`;
    if (resumeData.personalInfo) {
      if (resumeData.personalInfo.name) prompt += `\nName: ${resumeData.personalInfo.name}`;
      if (resumeData.personalInfo.location) prompt += `\nLocation: ${resumeData.personalInfo.location}`;
    }
    
    // Add education context
    if (resumeData.education && resumeData.education.length > 0) {
      prompt += `\n\nEducation:`;
      resumeData.education.forEach(edu => {
        if (edu.degree || edu.institution) {
          prompt += `\n- ${edu.degree || ''} from ${edu.institution || ''} (${edu.date || 'No date'})`;
          if (edu.description) prompt += `\n  ${edu.description}`;
        }
      });
    }
    
    // Add experience context
    if (resumeData.experience && resumeData.experience.length > 0) {
      prompt += `\n\nWork Experience:`;
      resumeData.experience.forEach(exp => {
        if (exp.position || exp.company) {
          prompt += `\n- ${exp.position || ''} at ${exp.company || ''} (${exp.date || 'No date'})`;
          if (exp.description) prompt += `\n  ${exp.description}`;
        }
      });
    }
    
    // Add skills context
    if (resumeData.skills && resumeData.skills.length > 0) {
      prompt += `\n\nSkills:`;
      resumeData.skills.forEach(skill => {
        if (skill.category || skill.skills) {
          prompt += `\n- ${skill.category || 'Skills'}: ${skill.skills || ''}`;
        }
      });
    }
    
    // Current summary if available
    if (resumeData.summary) {
      prompt += `\n\nCurrent Summary:\n${resumeData.summary}\n\nPlease enhance the summary to be more professional and highlight key strengths.`;
    } else {
      prompt += `\n\nPlease generate a professional summary based on the information provided above. The summary should be concise (3-5 sentences) and highlight key strengths and qualifications.`;
    }
    
    try {
      console.log('Sending resume data to OpenAI for enhancement');
      const enhancedSummary = await this.generateContent(prompt, systemPrompt);
      
      return {
        ...resumeData,
        summary: enhancedSummary
      };
    } catch (error) {
      console.error('Resume enhancement error:', error);
      return resumeData; // Return original data if enhancement fails
    }
  }
  
  /**
   * Enhance a cover letter using OpenAI
   * @param {Object} coverLetterData - The cover letter data to enhance
   * @returns {Promise<Object>} - Enhanced cover letter data
   */
  static async enhanceCoverLetter(coverLetterData) {
    const systemPrompt = "You are a professional cover letter writer with expertise in creating compelling job application letters. Your task is to create or enhance a cover letter that effectively showcases the applicant's experience, skills, and motivation for the position.";
    
    // Build a comprehensive prompt based on available cover letter information
    let prompt = `Create a professional cover letter based on the following details:`;
    
    // Add personal and recipient info
    if (coverLetterData.personalInfo) {
      prompt += `\n\nApplicant Information:`;
      if (coverLetterData.personalInfo.name) prompt += `\nName: ${coverLetterData.personalInfo.name}`;
      if (coverLetterData.personalInfo.location) prompt += `\nLocation: ${coverLetterData.personalInfo.location}`;
    }
    
    if (coverLetterData.recipientInfo) {
      prompt += `\n\nRecipient Information:`;
      if (coverLetterData.recipientInfo.name) prompt += `\nName: ${coverLetterData.recipientInfo.name}`;
      if (coverLetterData.recipientInfo.title) prompt += `\nTitle: ${coverLetterData.recipientInfo.title}`;
      if (coverLetterData.recipientInfo.company) prompt += `\nCompany: ${coverLetterData.recipientInfo.company}`;
    }
    
    if (coverLetterData.jobInfo) {
      prompt += `\n\nJob Information:`;
      if (coverLetterData.jobInfo.title) prompt += `\nPosition: ${coverLetterData.jobInfo.title}`;
      if (coverLetterData.jobInfo.reference) prompt += `\nReference: ${coverLetterData.jobInfo.reference}`;
    }
    
    // Add existing sections if available
    if (coverLetterData.experience) {
      prompt += `\n\nExisting Experience Section:\n${coverLetterData.experience}`;
    }
    
    if (coverLetterData.skills) {
      prompt += `\n\nExisting Skills Section:\n${coverLetterData.skills}`;
    }
    
    if (coverLetterData.motivation) {
      prompt += `\n\nExisting Motivation Section:\n${coverLetterData.motivation}`;
    }
    
    if (coverLetterData.closing) {
      prompt += `\n\nExisting Closing Section:\n${coverLetterData.closing}`;
    }
    
    // Request format with clear sections
    prompt += `\n\nPlease format the response with four clearly labeled sections:
1) Experience: Highlight relevant work experience and accomplishments
2) Skills: Emphasize key skills relevant to the position
3) Motivation: Explain why the applicant is interested in the position and company
4) Closing: A professional closing statement

Each section should be 1-3 paragraphs. Keep the tone professional yet personable.`;
    
    try {
      console.log('Sending cover letter data to OpenAI for enhancement');
      const generatedContent = await this.generateContent(prompt, systemPrompt);
      
      // Parse the AI response to extract different sections
      const sectionRegex = /(\d+\)|\b)(Experience|Skills|Motivation|Closing)[:\.]/gi;
      let sections = generatedContent.split(sectionRegex);
      
      // Create an enhanced cover letter
      const enhancedData = { ...coverLetterData };
      
      // Find the content for each section
      const findSectionContent = (sectionName) => {
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].toLowerCase().includes(sectionName.toLowerCase()) && i + 1 < sections.length) {
            return sections[i + 1].trim();
          }
        }
        return '';
      };
      
      // Update or set each section
      enhancedData.experience = findSectionContent('Experience') || enhancedData.experience || '';
      enhancedData.skills = findSectionContent('Skills') || enhancedData.skills || '';
      enhancedData.motivation = findSectionContent('Motivation') || enhancedData.motivation || '';
      enhancedData.closing = findSectionContent('Closing') || enhancedData.closing || 'Thank you for considering my application.';
      
      return enhancedData;
    } catch (error) {
      console.error('Cover letter enhancement error:', error);
      return coverLetterData; // Return original data if enhancement fails
    }
  }
}

module.exports = OpenAIService;
