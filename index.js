const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Server status check
app.get('/', (req, res) => {
    res.send('PharmPro AI Engine is Running! Ready for Bulk Allopathic Extraction.');
});

app.post('/api/process-medicine', async (req, res) => {
    try {
        const { prompt } = req.body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!prompt) return res.status(400).json({ error: "No prompt provided" });
        if (!GROQ_API_KEY) return res.status(500).json({ error: "API Key is missing in Render environment" });

        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a Professional Pharmacy Data Analyst. 
                    Extract ALL medicines from the user's text accurately.

                    STRICT RULES:
                    1. For each item, extract: name, power (with units like mg/ml), qty (number), price (number), and expiry (YYYY-MM-DD).
                    2. If a user writes "1000 Panadol", the name is "Panadol" and qty is 1000. 
                    3. NEVER use the name "New Medicine" or "Unnamed". If a brand name is not found, skip that specific item entirely.
                    4. ALWAYS return a JSON Array of objects.
                    5. If expiry year is given as '26', format it as '2026-12-31'. If missing, use '2027-12-31'.
                    6. Support all allopathic categories: Tablets, Syrups, Injections, Drops.

                    Return ONLY the JSON array. Example: [{"name":"Augmentin","power":"625mg","qty":100,"price":500,"expiry":"2026-05-20"}]`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0, // Is se AI "creative" nahi hoga, sirf accurate data nikalega
            max_tokens: 4000, // Taake 50-60 medicines ka data pura nikal sakay
            response_format: { type: "json_object" }
        }, {
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        let aiContent = response.data.choices[0].message.content;
        
        // JSON Parsing logic to handle different AI response styles
        const parsedData = typeof aiContent === 'string' ? JSON.parse(aiContent) : aiContent;
        
        // Agar AI ne 'medicines' key ke andar array diya ho toh wo nikaalna
        const finalArray = Array.isArray(parsedData) ? parsedData : (parsedData.medicines || parsedData.items || [parsedData]);
        
        res.json(finalArray);

    } catch (error) {
        console.error("Backend Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "AI failed to process. Try a smaller list or check API key." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is live on port ${PORT}`);
});
