# Veritas AI

**Veritas AI** is an intelligent AI fact-checking tool that analyzes the reliability of online articles. It helps users determine the trustworthiness of content by providing a reliability score and insights. 
"THE TRUTH WILL SET US FREE"

## Features
- **URL Analysis**: Input a URL to check the reliability of an article, social media post, blog, etc.
- **AI-Powered Insights**: Get detailed insights into the article's credibility and potential biases (political, religious, racial, gender, personal, etc.).
- **User-Friendly Interface**: Simple and intuitive design for easy and frequent use.

## How to Use

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)

### Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/UUHakusho/veritas-ai.git
   cd veritas-ai
   ```

2. **Install Dependencies**:
   - For the **frontend**:
     ```bash
     cd frontend
     npm install
     ```
   - For the **backend**:
     ```bash
     cd backend
     npm install
     ```

3. **Run the Backend Server**:
   - Navigate to the `backend` directory:
     ```bash
     cd backend
     npm start
     ```
   - The backend will start at `http://localhost:5000`.

4. **Run the Frontend**:
   - Navigate to the `frontend` directory:
     ```bash
     cd frontend
     npm start
     ```
   - The frontend will open in your browser at `http://localhost:3000`.

5. **Use the App**:
   - Paste a URL into the input field and click **Check Reliability** to see the analysis.

## Tech Stack

Frontend:
- React.js
- Tailwind CSS
- JavaScript

Backend:
- Node.js
- Express.js
- CORS middleware

## Database Schemas