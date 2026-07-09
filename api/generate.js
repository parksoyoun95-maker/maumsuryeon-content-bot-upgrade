export default async function handler(req, res) {
    // Enable CORS for localhost testing and other environments
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { inputText, topic, provider } = req.body;
    if (!inputText || !topic) {
        return res.status(400).json({ error: 'Missing required parameters (inputText or topic)' });
    }

    const selectedProvider = provider || 'gemini';
    const prompt = `사용자 원본 글: "${inputText}"\n주제: "${topic}"\n\n위 원본 글을 바탕으로 소셜 콘텐츠(블로그 포스팅, 마음 명상 가이드, 인스타 캡션, 유튜브 쇼츠 대본)를 가공하여 생성해 주세요. 다음 지침을 엄격히 지켜주세요:\n1. [글의 자연스러운 흐름]: 사용자가 입력한 원본 글의 핵심 의도, 문맥, 그리고 주요 표현을 절대 훼손하지 않고 그대로 유지하되, 비문이나 문맥의 흐름이 어색한 문장들을 자연스럽고 매끄럽게 연결되도록 문장력을 보강하여 윤문(Rewrite)해 주세요.\n2. [SEO 최적화된 제목]: 블로그 글에 잘 어울리고 네이버/구글 검색 최적화(SEO) 및 클릭을 유도할 수 있는 매력적인 제목을 따로 지어주세요.\n3. [불필요한 반복 삭제 및 맞춤법 교정]: 원본 글에서 불필요하게 중복되는 단어나 띄어쓰기, 맞춤법 오류를 깔끔하게 정돈해 주세요.\n4. [이미지 추천 키워드]: 이 글의 정서와 주제(예: 명상, 자연, 호흡, 바다, 위로 등)를 나타낼 수 있는 대표적인 영문 이미지 검색 키워드 3개를 배열로 제공해 주세요.\n\n출력은 반드시 다른 부연 설명 없이 아래 JSON 스키마 규격을 완벽히 따르는 순수 JSON 텍스트로만 반환해 주세요. \`\`\`json 기호 등 마크다운 태그도 일절 넣지 마세요:\n{\n  "title": "SEO 최적화된 매력적인 블로그 제목",\n  "blog": "자연스럽게 윤문 및 정돈된 블로그 포스팅 본문 (줄바꿈 포함)",\n  "meditation": "마음 명상 가이드 본문 (줄바꿈 포함)",\n  "instagram": "인스타 캡션 및 관련 태그 본문 (줄바꿈 포함)",\n  "youtube": "유튜브 대본 본문 (줄바꿈 포함)",\n  "imageKeywords": ["영어키워드1", "영어키워드2", "영어키워드3"]\n}`;

    try {
        let resultText = '';

        if (selectedProvider === 'gemini') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해 주세요.');

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }
            const data = await response.json();
            resultText = data.candidates[0].content.parts[0].text;

        } else if (selectedProvider === 'claude') {
            const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
            if (!apiKey) throw new Error('CLAUDE_API_KEY 또는 ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해 주세요.');

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Claude API Error: ${response.status} - ${errText}`);
            }
            const data = await response.json();
            resultText = data.content[0].text;

        } else if (selectedProvider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해 주세요.');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenAI API Error: ${response.status} - ${errText}`);
            }
            const data = await response.json();
            resultText = data.choices[0].message.content;
        } else {
            return res.status(400).json({ error: `지원하지 않는 AI 엔진입니다: ${selectedProvider}` });
        }

        // Clean JSON wrappers
        resultText = resultText.replace(/^\s*```json/i, '').replace(/```\s*$/, '').trim();
        
        // Parse and return JSON
        const parsed = JSON.parse(resultText);
        return res.status(200).json(parsed);

    } catch (error) {
        console.error('Serverless generation error:', error);
        return res.status(500).json({ error: error.message || '콘텐츠 생성 과정에서 오류가 발생했습니다.' });
    }
}
