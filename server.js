const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root Route (Checking ke liye)
app.get('/', (req, res) => {
    res.send('PharmPro AI Backend is Running!');
});

// Main AI Route
app.post('/api/process-medicine', async (req, res) => {
    try {
        const { prompt } = req.body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: "API Key is missing in Render settings" });
        }

        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "Extract medicine details into JSON. Fields: name (string), power (string), qty (number), price (number), expiry (YYYY-MM-DD). If data is missing, use empty strings or 0. Return ONLY JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" }
        }, {
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const aiData = response.data.choices[0].message.content;
        res.json(JSON.parse(aiData));

    } catch (error) {
        console.error("Error details:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "AI processing failed" });
    }
});

// Port Binding for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is live on port ${PORT}`);
});
