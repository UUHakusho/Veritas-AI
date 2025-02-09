require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');

const app = express();
const PORT = 5000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Store your API key in an environment variable
});

// Add a cache object at the top of the file
const articleCache = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Function to scrape article content
const scrapeArticle = async (url) => {
  const scraperApiKey = 'YOUR_SCRAPERAPI_KEY'; // Replace with your API key
  const scraperUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}&render=true`;
  
  try {
    const response = await axios.get(scraperUrl, { 
      timeout: 30000, // 30 seconds
    });
    const $ = cheerio.load(response.data);

    // Extract content using page.evaluate
    const title = await page.$eval('h1', el => el.innerText);
    const paragraphs = await page.$$eval('p', els => els.map(el => el.innerText));
    const content = paragraphs.join(' ');

    if (!title || !content) {
      throw new Error("Failed to extract meaningful content");
    }

    return `Title: ${title}\n\nContent: ${content}`;
  } catch (error) {
    console.error("Scraping error:", error);
    throw new Error(`Failed to scrape article content: ${error.message}`);
  }
};

// Function to analyze content using OpenAI
const analyzeContent = async (url) => {
  try {
    // Check if we have a cached result
    if (articleCache.has(url)) {
      console.log("Returning cached result for:", url);
      return articleCache.get(url);
    }

    const articleContent = await scrapeArticle(url);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert fact-checker and media analyst. Analyze the provided article for factual accuracy, reliability, potential biases and agendas 
          (e.g. political, personal, religious, financial, and any other agendas), and journalistic quality.
           
          Provide your response in the following format:

          Reliability Score: [number between 0-100]
          
          Accuracy & Context:
          
          Potential Biases:
          
          For each point you make, include a citation in brackets at the end of the sentence when possible, using the format [Source: URL or reference]. 
          If no citation is available, simply state the insight without brackets.`
        },
        {
          role: "user",
          content: `Please analyze this article:\n\n${articleContent}`,
        },
      ],
      temperature: 0, // 0 ensures a deterministic/consistent response. Set to 0.7 for a more creative response
      top_p: 1, // top_p: 1 ensures deterministic/consistent response
      max_tokens: 1000,

    });

    const analysis = response.choices[0].message.content;
    console.log("Raw Analysis:", analysis);

    const reliabilityScore = extractScore(analysis);
    const insights = extractInsights(analysis);

    // Cache the result
    const result = { reliabilityScore, insights };
    articleCache.set(url, result);
    console.log("Cached result for:", url);

    return result;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

// Helper functions
const extractScore = (analysis) => {
  const scoreMatch = analysis.match(/Reliability Score:\s*(\d+)/i);
  return scoreMatch ? parseInt(scoreMatch[1]) : 50; // Default to 50 if no score is found
};

const extractInsights = (analysis) => {
  return analysis
    .split('\n')
    .filter(line => line.trim().startsWith('- '))
    .map(line => line.trim());
};

// API endpoint
app.post("/check-reliability", async (req, res) => {
  const { url } = req.body;
  console.log("Received URL:", url);

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    console.log("Starting content analysis...");
    const result = await analyzeContent(url);
    console.log("Analysis Result:", result);
    res.json(result);
  } catch (error) {
    console.error("Detailed Error:", error);
    res.status(500).json({ 
      error: "Failed to analyze content", 
      details: error.message,
      insights: [
        "- Unable to analyze content due to technical issues",
        "- Please try again later or check if the URL is accessible"
      ],
      reliabilityScore: 50 // Neutral score when analysis fails
    });
  }
});

// Add this endpoint to clear cache
app.post('/clear-cache', (req, res) => {
  articleCache.clear();
  res.json({ message: 'Cache cleared successfully' });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});