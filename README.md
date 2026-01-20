# CharX Generator

RisuAI용 캐릭터 카드(CharX)를 쉽게 생성할 수 있는 웹 기반 도구입니다.

> 🌐 온라인 사용: [GitHub Pages에서 바로 사용하기](https://VaCream.github.io/charXGenerator/)

## ✨ 주요 기능

### 📝 캐릭터 정보
- 자유 형식의 캐릭터 설정을 RisuAI 디스크립션 형식으로 자동 변환
- LLM(Gemini)을 활용한 스마트 변환
- 영어→한국어 번역 지원

### 👋 퍼스트 메시지
- 여러 개의 인트로 메시지 작성 및 관리
- `{{user}}` 플레이스홀더 지원

### 📖 로어북
- 로어북 엔트리 일괄 생성 및 관리
- LLM(Gemini)을 활용한 로어북 자동 변환

### 🪟 상태창
- 원하는 스타일의 상태창을 자연어로 설명하면 자동 생성
- HTML/CSS 템플릿 및 정규식 패턴 자동 생성
- 실시간 미리보기 지원

### 🖼️ 이미지
- 대표 이미지(아이콘) 설정
- 에셋 이미지 관리
- 이미지 이름 자동 변환 (RisuAI 형식)

## 🚀 사용 방법

1. 설정에서 Gemini API 키 입력
   - [Google AI Studio](https://aistudio.google.com/apikey)에서 무료 발급
2. 각 탭에서 캐릭터 정보 입력
3. CharX 저장 버튼으로 `.charx` 파일 다운로드
4. RisuAI에서 불러오기

## 📦 기술 스택

- Vanilla HTML/CSS/JavaScript
- Google Gemini API
- JSZip (CharX 파일 생성)