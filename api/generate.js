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
    if (!inputText) {
        return res.status(400).json({ error: '생각과 감정 원본 글(inputText)을 입력해 주세요.' });
    }

    const selectedProvider = provider || 'gemini';
    const cleanTopic = (topic && topic.trim()) ? topic.trim() : '글을 분석하여 AI가 가장 잘 어울리는 명상 주제를 임의로 선정';
    const prompt = `사용자 원본 글: "${inputText}"\n주제: "${cleanTopic}"\n\n위 원본 글을 바탕으로 소셜 콘텐츠(블로그 포스팅, 마음 명상 가이드, 인스타 캡션, 유튜브 쇼츠 대본)를 가공하여 생성해 주세요. 명상 주제가 지정되지 않았거나 임의 선정이 필요한 경우, 원본 글의 핵심 정서와 고민을 가장 잘 치유해 줄 수 있는 차분한 명상 주제를 직접 정의해서 생성해 주세요.\n\n다음 지침을 엄격히 지켜주세요:\n1. [어법/어순 교정 및 교열]: 사용자가 작성하여 입력한 원본 본문 전체의 내용과 원래 의도, 핵심 메시지를 마음대로 축소하거나 생략 및 왜곡하지 말고 그대로 100% 보존해 주세요. 비문 수정, 맞춤법/띄어쓰기 교정, 매끄러운 어순 및 주술 호응 다듬기를 통해 가독성이 아주 뛰어난 정갈한 블로그 글로 완성해 주세요.\n2. [오늘의 명상 주제 및 SEO 제목]: 오늘의 명상 주제를 한눈에 들어오는 짧은 문구(예: "비교하는 마음 내려놓기")로 정하고, 이 주제와 어울리는 SEO 최적화된 매력적인 블로그 제목을 따로 지어주세요.\n3. [인스타 캡션]: 블로그 본문 내용을 한눈에 읽기 편하도록 깔끔하고 정돈된 구조(일반적인 요약 형식)의 인스타용 글로 재작성하고, 관련 태그(#)를 포함해 주세요.\n4. [명상 관련 고급 이미지 키워드]: 글의 주제 및 감성과 긴밀히 연결되며, 깔끔하고 고급스러운 명상 분위기(zen, calm, nature, lake, forest 등)를 담은 영문 이미지 검색 키워드 3개를 추출하여 배열로 제공해 주세요.\n\n출력은 반드시 다른 부연 설명 없이 아래 JSON 스키마 규격을 완벽히 따르는 순수 JSON 텍스트로만 반환해 주세요. \`\`\`json 기호 등 마크다운 태그도 일절 넣지 마세요:\n{\n  "topic": "오늘의 명상 주제 (만약 입력받았다면 입력받은 주제를 그대로 사용하고, 입력받지 못했다면 AI가 새롭게 도출한 명상 주제)",\n  "title": "SEO 최적화된 매력적인 블로그 제목",\n  "blog": "교정/교열 및 가독성이 개선된 블로그 포스팅 본문 (줄바꿈 포함)",\n  "meditation": "마음 명상 가이드 본문 (줄바꿈 포함)",\n  "instagram": "정리된 인스타 캡션 및 관련 태그 본문 (줄바꿈 포함)",\n  "youtube": "유튜브 대본 본문 (줄바꿈 포함)",\n  "imageKeywords": ["영어키워드1", "영어키워드2", "영어키워드3"]\n}`;

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
