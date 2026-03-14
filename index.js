require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 1. Health Check
app.get('/', (req, res) => {
    res.send('🚀 PharmPro AI Engine is LIVE with Failover Support!');
});

// 2. API Key Rotation List
// Render ke Environment Variables mein GROQ_API_KEY_1, GROQ_API_KEY_2 wagaira add karein
const API_KEYS = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5
].filter(key => key); // Khali keys ko nikaal dega

// 3. Main Route
app.post('/api/process-medicine', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: "Pehle medicine list likhein!" });
    if (API_KEYS.length === 0) return res.status(500).json({ error: "Server par koi API Key nahi mili!" });

    let lastError = null;

    // --- FAILOVER LOOP (Agli API Key try karega agar pehli fail ho) ---
    for (let i = 0; i < API_KEYS.length; i++) {
        const currentKey = API_KEYS[i];

        try {
            console.log(`Trying with API Key #${i + 1}...`);

            const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `You are a Pharmacy Expert. Extract medicines into a JSON object.
                        Rule 1: Always use a root key "medicines" for the array.
                        Rule 2: Maximum 50 items per response to avoid cutting the JSON.
                        Rule 3: Fields: name, power, qty, price, expiry (YYYY-MM-DD).
                        Example: {"medicines": [{"name":"Panadol","power":"500mg","qty":10,"price":50,"expiry":"2027-12-31"}]}`
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
                    "Authorization": `Bearer ${currentKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 50000 // 50 seconds wait
            });

            // AI ka raw content nikaalo
            let aiContent = response.data.choices[0].message.content;
            let parsedData = JSON.parse(aiContent);

            // Data ko array mein convert karo
            const finalArray = parsedData.medicines || parsedData.items || (Array.isArray(parsedData) ? parsedData : [parsedData]);

            console.log(`✅ Success with Key #${i + 1}! Items: ${finalArray.length}`);
            return res.json(finalArray);

        } catch (error) {
            console.error(`❌ Key #${i + 1} Failed:`, error.message);
            lastError = error;
            // Agar ye aakhri key thi aur wo bhi fail ho gayi
            if (i === API_KEYS.length - 1) break;
        }
    }

    // Agar saari keys fail ho jayein
    res.status(500).json({
        error: "Sari API Keys block hain ya busy hain. Thori dair baad try karein.",
        details: lastError ? lastError.message : "Timeout"
    });
});

// Port Setting for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
