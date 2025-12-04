/**
 * DDB Letter - LLM Module
 * Gemini 2.5 Pro API 연동 모듈
 */

const LLM = {
  // API 엔드포인트
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
  
  /**
   * 공통 시스템 프롬프트 생성
   * @param {Object} settings - 사용자 설정
   * @returns {string} 시스템 프롬프트
   */
  buildSystemPrompt(settings) {
    const speechStyle = settings.formalSpeech ? '존댓말' : '반말';
    const userName = settings.userName || '사용자';
    const userInfo = settings.userPrompt ? `\n사용자에 대한 정보: ${settings.userPrompt}` : '';
    
    return `당신은 ${settings.characterPrompt || '다정하고 따뜻한 성격의 캐릭터'}를 따르는 캐릭터입니다.
사용자의 이름은 "${userName}"이고, 사용자와의 관계는 "${settings.relationship || '친구'}"입니다.${userInfo}
말투는 ${speechStyle}로 유지하세요.
설정에 어긋나지 않는 범위에서 자연스럽고 진심 어린 텍스트를 생성하세요.`;
  },
  
  /**
   * Gemini API 호출
   * @param {string} apiKey - API 키
   * @param {string} systemPrompt - 시스템 프롬프트
   * @param {string} userPrompt - 사용자 프롬프트
   * @returns {Promise<string>} 생성된 텍스트
   */
  async callGemini(apiKey, systemPrompt, userPrompt) {
    const url = `${this.GEMINI_API_URL}?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt + '\n\n' + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 30000
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE'
        }
      ]
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Gemini API 응답:', JSON.stringify(data, null, 2));
      
      // 응답 파싱 - 여러 가지 응답 형식 처리
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const text = candidate.content.parts[0].text;
          if (text) return text;
        }
      }
      
      // 대체 응답 형식 확인
      if (data.text) {
        return data.text;
      }
      
      console.error('예상치 못한 API 응답 형식:', data);
      throw new Error('응답에서 텍스트를 찾을 수 없습니다. 응답: ' + JSON.stringify(data));
      
    } catch (error) {
      console.error('Gemini API 호출 오류:', error);
      throw error;
    }
  },
  
  /**
   * 편지 답장 생성
   * @param {Object} settings - 사용자 설정
   * @param {string} userLetter - 사용자가 보낸 편지
   * @returns {Promise<string>} 답장 내용
   */
  async generateLetterReply(settings, userLetter) {
    const systemPrompt = this.buildSystemPrompt(settings);
    
    const userPrompt = `사용자가 오늘 보낸 편지의 내용은 다음과 같습니다:
"${userLetter}"

이에 대한 답장을 작성해주세요.
문체는 편지 형식으로, 300~1500자 정도로 작성해주세요.
진심 어린 감정을 담아 따뜻하게 답장해주세요.`;
    
    return await this.callGemini(settings.apiKey, systemPrompt, userPrompt);
  },
  
  /**
   * 오늘의 운세 생성
   * @param {Object} settings - 사용자 설정
   * @returns {Promise<string>} 운세 내용
   */
  async generateFortune(settings) {
    const systemPrompt = this.buildSystemPrompt(settings);
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    
    const userPrompt = `오늘(${dateStr})의 운세를 이 캐릭터가 직접 말해주는 짧은 메시지로 작성해주세요.

구성 요소:
1) 오늘 하루의 전반적인 기운 (너무 좋기만 하지 말고, 약간의 긴장 요소나 주의할 점도 함께 제시)
2) 행운의 색상 또는 아이템 1~2개
3) 오늘 피하면 좋은 행동이나 상황 1~2가지
4) 이 캐릭터가 사용자에게 건네는 짧은 조언과 응원의 말

작성 규칙:
- 150~300자 이내.
- 캐릭터의 말투와 성격을 유지해서 말하기.
- 전체 분위기는 지나치게 어둡지 않게, 현실적인 경고와 함께 기본적으로는 ‘오늘을 잘 보낼 수 있다’는 희망적인 뉘앙스를 유지할 것.
- 점술/운세처럼 느껴지도록, 너무 구체적이거나 단정적인 예언(“반드시”, “100%”)은 피하고, 가능성·조언 위주로 표현할 것.`;

    
    return await this.callGemini(settings.apiKey, systemPrompt, userPrompt);
  }
};

// 전역으로 노출
window.LLM = LLM;
