require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const Parser = require('rss-parser');

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

// Utility to find RSS feed URLs
const findRSSFeeds = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const feeds = [];
    
    // Look for RSS/Atom feed links
    $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, element) => {
      feeds.push($(element).attr('href'));
    });
    
    return feeds;
  } catch (error) {
    console.log('No RSS feeds found');
    return [];
  }
};

// RSS Parser
const parseRSSFeed = async (url) => {
  try {
    const parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const feed = await parser.parseURL(url);
    return feed.items[0]?.content || null;
  } catch (error) {
    console.log('RSS parsing failed:', error.message);
    return null;
  }
};

// Main scraping function that tries multiple methods
const scrapeArticle = async (url) => {
  let content = null;
  let error = null;

  // 1. First try RSS if available
  try {
    const feeds = await findRSSFeeds(url);
    if (feeds.length > 0) {
      content = await parseRSSFeed(feeds[0]);
      if (content) return content;
    }
  } catch (e) {
    error = e;
  }

  // 2. Try Puppeteer (most robust but resource-intensive)
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set common browser headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      // Enable JavaScript and wait until network is idle
      await page.setJavaScriptEnabled(true);
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for content to load
      await page.waitForSelector('body', { timeout: 5000 });

      // Handle cookie/popup banners if they exist
      try {
        const commonButtonSelectors = [
          'button[contains(text(), "Accept")]',
          'button[contains(text(), "Agree")]',
          'button[contains(text(), "Continue")]',
          '.cookie-accept',
          '#cookie-notice button'
        ];
        
        for (const selector of commonButtonSelectors) {
          const button = await page.$(selector);
          if (button) await button.click();
        }
      } catch (e) {
        console.log('No cookie banner found or already handled');
      }

      // Extract content
      content = await page.evaluate(() => {
        // Remove unwanted elements
        const removeSelectors = [
          'script', 'style', 'nav', 'header', 'footer', 'iframe',
          '.ads', '.advertisement', '.social-share', '.comments',
          '#cookie-notice', '.popup', '.modal'
        ];
        
        removeSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Get title
        const title = document.querySelector('h1')?.textContent?.trim() || '';

        // Get main content - try different common article selectors
        const articleSelectors = [
          'article',
          '[role="main"]',
          '.post-content',
          '.article-content',
          '.entry-content',
          'main'
        ];

        let mainContent;
        for (const selector of articleSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            mainContent = element;
            break;
          }
        }

        // If no article container found, fall back to all paragraphs
        const paragraphs = (mainContent || document).querySelectorAll('p');
        const textContent = Array.from(paragraphs)
          .map(p => p.textContent.trim())
          .filter(text => text.length > 20) // Filter out short snippets
          .join('\n\n');

        return `${title}\n\n${textContent}`;
      });

    } finally {
      await browser.close();
    }

    if (content && content.trim()) return content;

  } catch (e) {
    error = e;
    console.log('Puppeteer scraping failed:', e.message);
  }

  // 3. Fall back to simple axios+cheerio method
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, nav, header, footer, iframe, .ads, .comments').remove();

    const title = $('h1').first().text().trim();
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(text => text.length > 20);

    content = `${title}\n\n${paragraphs.join('\n\n')}`;
    if (content.trim()) return content;

  } catch (e) {
    error = e;
    console.log('Axios/Cheerio scraping failed:', e.message);
  }

  // If all methods fail, throw error
  throw new Error(`Failed to scrape content: ${error?.message || 'Unknown error'}`);
};

// Error handling middleware
const handleScrapingErrors = (error, req, res, next) => {
  console.error('Scraping error:', error);
  res.status(500).json({
    error: 'Failed to scrape content',
    message: error.message
  });
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
      model: "gpt-4",
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
    
    // Add this log
    console.log("Processed Insights:", insights);

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
  const insights = [];
  
  // Split the analysis into lines
  const lines = analysis.split('\n');
  
  let currentSection = '';
  
  for (const line of lines) {
    // Skip empty lines and section headers
    if (!line.trim() || line.includes('Reliability Score:') || 
        line === 'Accuracy & Context:' || line === 'Potential Biases:' ||
        line === 'Journalistic Quality:') {
      if (line.includes('Accuracy & Context:') || 
          line.includes('Potential Biases:') ||
          line.includes('Journalistic Quality:')) {
        currentSection = line.trim();
      }
      continue;
    }
    
    // Add the section prefix to each insight
    if (line.trim()) {
      insights.push(`${currentSection.replace(':', '')}: ${line.trim()}`);
    }
  }
  
  return insights.filter(insight => insight.length > 0);
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

module.exports = {
  scrapeArticle,
  handleScrapingErrors
};