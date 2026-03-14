const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('PharmPro AI Backend is Running! System is ready for Allopathic extraction.');
});

app.post('/api/process-medicine', async (req, res) => {
    try {
        const { prompt } = req.body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!prompt) return res.status(400).json({ error: "Prompt is required" });
        if (!GROQ_API_KEY) return res.status(500).json({ error: "API Key missing in Render" });

        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a professional Pharmacist. Extract data from any Allopathic medicine description.
                    Rules:
                    1. name: Brand name only (e.g., Panadol, Augmentin, Flagyl).
                    2. power: Extract strength accurately (e.g., 500mg, 625mg, 120ml, 1g, 0.5%).
                    3. qty: Extract numbers only. If user says '10 boxes', calculate or use 10.
                    4. price: Extract price as a number.
                    5. expiry: Convert to YYYY-MM-DD. If year is '26', make it '2026-12-31'. If missing, use '2027-12-31'.
                    Return ONLY a valid JSON object.`
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

        let aiContent = response.data.choices[0].message.content;

        // JSON safety check
        if (typeof aiContent === 'string') {
            aiContent = JSON.parse(aiContent);
        }

        res.json(aiContent);

    } catch (error) {
        console.error("Server Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "AI processing failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Backend live on port ${PORT}`);
});
