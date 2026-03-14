const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Root route to check if server is live
app.get('/', (req, res) => {
    res.send('PharmPro Bulk AI Engine is Running!');
});

app.post('/api/process-medicine', async (req, res) => {
    try {
        const { prompt } = req.body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!prompt) return res.status(400).json({ error: "No data provided" });
        if (!GROQ_API_KEY) return res.status(500).json({ error: "Server API Key missing" });

        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a Professional Pharmacy Data Entry Expert.
                    Your task is to extract EVERY medicine mentioned in the text.
                    
                    STRICT RULES:
                    1. If the user says "Add 50 medicines" or "3000 items", IGNORE those counts. Only extract the ACTUAL medicine names and their specific data.
                    2. Data Format: name, power, qty, price, expiry.
                    3. If "3000 Panadol" is written, 'Panadol' is the name and '3000' is the qty.
                    4. ALWAYS return a JSON Array, even for 1 medicine.
                    5. If expiry is missing, use '2027-12-31'.
                    6. Ensure NO medicine from the list is skipped.
                    
                    Return ONLY a JSON array: [{"name": "...", "power": "...", "qty": 0, "price": 0, "expiry": "YYYY-MM-DD"}]`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            // Temperature 0 rakha hai taake AI "Creative" na ho balki "Accurate" rahay
            temperature: 0,
            max_tokens: 4000, 
            response_format: { type: "json_object" }
        }, {
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        let aiContent = response.data.choices[0].message.content;
        
        // Smart Parsing: AI kabhi 'medicines' key mein array deta hai, kabhi direct array.
        let parsed = JSON.parse(aiContent);
        let finalData = Array.isArray(parsed) ? parsed : (parsed.medicines || parsed.items || [parsed]);

        // Backend hamesha Array hi bhejey ga taake frontend loop sahi chalay
        res.json(finalData);

    } catch (error) {
        console.error("AI Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "AI failed to process. Try a shorter list." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Backend listening on port ${PORT}`);
});
