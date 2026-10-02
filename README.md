# ⚡ Modern AI Chatbot (Groq & Vercel)

A clean, modern, and fast AI Chatbot powered by **Groq**'s ultra-low latency inference. Works seamlessly **both locally** and on **Vercel** with zero external dependencies.

---

## 📁 Project Structure

```text
├── index.html        # Modern ChatGPT-style responsive web interface
├── server.js         # Zero-dependency local Node.js HTTP server
├── api/
│   └── chat.js       # Vercel serverless function (POST /api/chat)
├── package.json      # npm start script
├── .env.example      # Environment variables template
└── .gitignore        # Keeps API keys & build artifacts out of Git
```

---

## 🚀 1. Run Locally

### Step 1: Create `.env` or `.env.local`
Create a `.env.local` file in this directory and add your free Groq API key:

```env
GROQ_API_KEY=gsk_your_actual_key_here
```
*(Get a key from [console.groq.com/keys](https://console.groq.com/keys))*

### Step 2: Start the server
Run in your terminal:

```bash
node server.js
```
*(or `npm start`)*

Open **http://localhost:3000** in your browser!

---

## ☁️ 2. Deploy to Vercel

1. Push your project to GitHub:
   ```bash
   git add .
   git commit -m "Fresh modern chatbot setup"
   git push
   ```
2. In [Vercel Dashboard](https://vercel.com):
   - Import this repository.
   - Under **Settings** &rarr; **Environment Variables**, add:
     - **Name**: `GROQ_API_KEY`
     - **Value**: `gsk_...` (your Groq key)
     - *(Make sure Production, Preview, and Development are all checked)*
3. Click **Deploy**!
