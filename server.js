const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/process-medicine', async (req, res) => {
    const { prompt } = req.body;
    
    // Render ke Environment Variable se key uthana
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: "API Key not configured on server" });
    }

    try {
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [{
                role: "system",
                content: "Extract medicine details into JSON. Fields: name, power, qty (number), price (number), expiry (YYYY-MM-DD). If data is missing, use empty strings for text and 0 for numbers. Only return JSON."
            }, { 
                role: "user", 
                content: prompt 
            }],
            response_format: { type: "json_object" }
        }, {
            headers: { 
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        res.json(response.data.choices[0].message.content); 
    } catch (error) {
        console.error("Groq Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "AI failed to process medicine data" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
