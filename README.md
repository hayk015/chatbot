# Workshop Chatbot (Vercel demo)

Files:
- index.html     -> the page the user sees
- api/chat.js    -> server route that holds the API key and calls the AI
- .gitignore     -> keeps secrets/local files out of GitHub
- .env.example   -> shows WHICH variable is needed (no real key)

Deploy:
1. Push to GitHub
2. Import repo in Vercel
3. Settings -> Environment Variables -> add GROQ_API_KEY
4. Redeploy

Local test (optional): create .env.local with your key, then run `npx vercel dev`
