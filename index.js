const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Environment variables ke liye

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 1. Health Check (Browser mein check karne ke liye)
app.get('/', (req, res) => {
    res.send('🚀 PharmPro AI Engine is LIVE and Running!');
});

// 2. Main AI Processing Route
app.post('/api/process-medicine', async (req, res) => {
    try {
        const { prompt } = req.body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        // Basic validations
        if (!prompt) return res.status(400).json({ error: "Prompt is empty" });
        if (!GROQ_API_KEY) return res.status(500).json({ error: "API Key missing on server" });

        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a Pharmacy Data Expert. Extract medicines from text.
                    Rules:
                    1. Return a JSON object with a key "medicines" containing the array.
                    2. Fields: name, power, qty (number), price (number), expiry (YYYY-MM-DD).
                    3. If brand name missing, skip it.
                    4. Default expiry: 2027-12-31.
                    Format: {"medicines": [{"name":"Panadol","power":"500mg","qty":10,"price":50,"expiry":"2027-12-31"}]}`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0,
            response_format: { type: "json_object" }
        }, {
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        // AI Response parsing
        let aiRawContent = response.data.choices[0].message.content;
        let parsedData = JSON.parse(aiRawContent);
        
        // --- SMART EXTRACTION LOGIC ---
        // 1. Agar 'medicines' key mein hai (Best Case)
        // 2. Agar direct array hai
        // 3. Agar 'items' key mein hai
        let finalArray = [];
        if (parsedData.medicines && Array.isArray(parsedData.medicines)) {
            finalArray = parsedData.medicines;
        } else if (Array.isArray(parsedData)) {
            finalArray = parsedData;
        } else if (parsedData.items && Array.isArray(parsedData.items)) {
            finalArray = parsedData.items;
        } else {
            // Agar sirf ek single object aa gaya ho
            finalArray = [parsedData];
        }

        console.log(`✅ Success: Extracted ${finalArray.length} items.`);
        res.json(finalArray);

    } catch (error) {
        console.error("❌ AI Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: "Extraction failed", 
            details: error.message 
        });
    }
});

// Port configuration for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
