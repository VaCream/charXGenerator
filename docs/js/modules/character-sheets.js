/**
 * 캐릭터 시트 템플릿
 * Python llm/character_sheets.py 포팅
 */

// Template 0: 자유 형식 - 마크다운만 정리
const template0 = `<description>
### [Character Name]

[Reorganize the original character information with minimal changes.
Keep the original structure and content as much as possible.
Only apply markdown formatting with headers starting at ### level.
Use markdown elements to improve readability.
Translate to English if the original is in another language.]
</description>`;

// Template 1: BCS 폭탄 캐릭터 시트
const template1 = `<description>
### Basic Information
* Name/Age/Gender:
* Occupation: (What social role do they fulfill through their job?)
* Residence: (What kind of environment do they inhabit?)
* Specific Goal: (What is the most visible desire currently driving this character?)

### Appearance & Impression
* First Impression: (What is their overall aura upon first meeting?)
* Physical Look: (An objective physical description.)
* Characteristics: (Unique signals perceived by sight and smell.)

### Verbal Habits & Voice
* Content: Voice tone, frequently used words, sample dialogue lines.

### Behavioral Patterns
* Stress Response: (In what situations do they feel stressed, and what tendencies do they show?)
* Self-Control Ability: (How well do they control their emotions or impulses?)

### Relationships
* External Social Attitude: (What is the persona they typically wear in public?)
* Social Skills: (Their ability to initiate and maintain relationships.)
* In Intimate Relationships: (The side they only show to close ones.)

### Core Identity
* Archetype: (A single word that summarizes the character's role.)
* Motivation: (What is the deepest desire that drives all of their actions?)
* Key Traits: (Three core keywords that describe the character's personality.)

### Backstory & Formation
* Setting: (The objective rules of the world the character is rooted in.)
* Backstory: (A summary of the major past events.)
* Trauma / Defining Moment: (The single event that changed their life.)

### Psychological Structure
* Worldview: (How do they fundamentally perceive the world?)
* Mental Maturity: (Their mental age and ability to restrain impulses.)
* Value Hierarchy: (The ranking of values the character holds important.)
* Decision-Making Process: (What do they prioritize at a crossroads?)

### Self-Perception & Inner Conflict
* Pride & Strengths: (What they are most proud of.)
* Inferiority Complex & Weaknesses: (What they are most ashamed of.)
* A Secret to Hide: (A fatal secret they believe could ruin them.)
* True Desire: (What does this character's soul truly yearn for?)

### Cracks & Seeds
* The Key to Break Defenses: (What can temporarily break down their mental walls?)
* The Potential to be Unleashed: (What latent positive nature is revealed?)
* The Task for Growth: (What internal challenge must they overcome?)
</description>`;

// Template 2: UCS 진 궁극의 캐릭터 시트
const template2 = `<description>
### Profile
Name: (Choose a unique, memorable name)
Age: (Specify the character's age)
Gender: (Define gender identity and orientation)
Origin: (Place of origin)
Race: (Ethnicity or fantasy race)
Birthday: (Specific birth date)

### Form
Appearance: (Detailed physical description)
Body image: (How they perceive their own appearance)
Fashion style: (Preferred clothing styles)
Signature item: (Meaningful object they carry)
Perfume: (Preferred scent)
Aura: (Overall impression or energy)

### Background
Health: (Physical condition and health issues)
Intelligence: (Cognitive abilities and expertise)
Family: (Family structure and status)
Past: (Key events that shaped them)
Education: (Educational background)
Job: (Occupation or role)
Residence: (Living situation)
Reputation: (How others perceive them)

### Personality
Trauma: (Past traumatic experiences)
Belief: (Core values and worldview)
Morality: (Ethical framework)
Achievement: (Approach to goals)
Relationship: (How they interact with others)
Identity: (Sense of self)
Flaw: (Main weaknesses)
Archetype: (Personality types)

### Visible side
Desire: (Primary needs and wants)
Dream: (Long-term aspirations)
Goal: (Current objectives)
Motivation: (What pushes them)
Routine: (Typical daily activities)
Habit: (Recurring behaviors)
Speech: (Unique aspects of speaking)

### Hidden side
Weakness: (Significant flaw)
Fear: (Deepest fears)
Dilemma: (Internal conflicts)
Secret: (Hidden quirk)
Sexuality: (Sexual preferences if relevant)

### Preference
Like: (Things they enjoy)
Hobby: (Activities for pleasure)
Obsession: (Notable fixation)
Romance: (Type of person attracted to)
Hate: (Things they dislike)

### Special
(Additional unique traits, abilities, or circumstances)
</description>`;

// Template 3: ICS 상호작용 시트 V3
const template3 = `<description>
### Basic Information
* Name: { Full name, nicknames, aliases, titles }
* Age/Gender: { Age and gender identity }
* Nationality/Ethnicity: { National origin and ethnic background }
* Backstory: { Concise summary of life history and key events }
* Appearance: { Detailed physical appearance description }
* Residence: { Where they currently live }
* Occupation: { Current job or primary occupation }

### Core Identity
* Dominant Personality: { Most prominent personality traits }
* Beliefs and Values: { Core principles and moral standards }
* Worldview: { Overall perspective on life and society }
* Goals and Motivations: { Short-term and long-term objectives }
* Insecurities/Conflicts: { Sources of self-doubt and internal struggles }
* Key Relationships: { Important people in their life }

### Behavioral Patterns
* Decision-Making: { Approach to making choices }
* Emotional Patterns:
  - Commonly felt emotions: { Frequent emotions }
  - Ability to regulate emotions: { Emotional control }
  - Way of expressing emotions: { How they show feelings }
* Stress Responses: { Reactions under pressure }
* Speech Patterns: { Manner of speaking }
* Social Interaction:
  - In normal situations: { Everyday behavior }
  - In close relationships: { With trusted people }
  - In conflict situations: { During disagreements }
* Habitual behavior:
  - Daily routine: { Typical day-to-day activities }
  - Habits: { Recurring behaviors and quirks }
* Sexual behavior: { Sexual activity and proclivities }

### Preferences and Abilities
* Hobbies/Interests: { Activities they enjoy }
* Likes/Dislikes: { Things they enjoy or dislike }
* Skills/Expertise: { Areas of excellence }
* Weaknesses: { Limitations and areas of struggle }

### Extra Details
- { Additional interesting facts about the character }
</description>`;

// 시트 프리셋
export const SHEET_PRESETS = {
    "자유 형식 (마크다운 정리)": {
        template: template0,
        preview: `[자유 형식]

사용자가 입력한 캐릭터 정보를 최대한 변형 없이 유지하면서,
마크다운 포맷만 정리합니다.

- 마크다운 헤더는 ### 레벨로 시작
- 영어로 번역
- 정해진 양식이 없어 자유롭게 구성`
    },
    "BCS: 폭탄 캐릭터 시트": {
        template: template1,
        preview: `[BCS: 폭탄 캐릭터 시트]

### 기본 정보
* 이름/나이/성별
* 직업, 거주지, 구체적인 목표

### 외모 및 인상
* 첫인상, 신체적 외형, 특징

### 언어 습관 및 목소리
### 행동 패턴
### 관계
### 핵심 정체성
### 배경 및 형성 과정
### 심리 구조
### 자기 인식 및 내적 갈등
### 균열과 씨앗`
    },
    "UCS: 진 궁극의 캐릭터 시트": {
        template: template2,
        preview: `[UCS: 진 궁극의 캐릭터 시트]

### 프로필
이름, 나이, 성별, 출신, 인종, 생일

### 외형
외모, 신체상, 패션, 시그니처 아이템

### 배경
건강, 지능, 가족, 과거, 학력, 직업

### 성격
트라우마, 신념, 도덕성, 정체성

### 드러나는 면 / 숨겨진 면
### 선호
### 특이사항`
    },
    "ICS: 상호작용 시트 V3": {
        template: template3,
        preview: `[ICS: 상호작용 시트 V3]

### 기본 정보
이름, 나이/성별, 국적, 과거사, 외모, 거주지, 직업

### 핵심 정체성
주된 성격, 신념, 세계관, 목표, 갈등, 관계

### 행동 패턴
의사 결정, 감정 패턴, 스트레스, 말투
사회적 상호작용, 습관적 행동, 성적 행동

### 선호와 능력
취미, 호불호, 기술, 약점

### 추가 세부 정보`
    }
};

/**
 * LLM에게 전달할 영어 원문 템플릿 반환
 */
export function getSheetTemplate(presetName = null) {
    if (!presetName) {
        presetName = Object.keys(SHEET_PRESETS)[0];
    }
    const preset = SHEET_PRESETS[presetName];
    return preset ? preset.template : template1;
}

/**
 * GUI 미리보기용 한국어 번역문 반환
 */
export function getSheetPreview(presetName = null) {
    if (!presetName) {
        presetName = Object.keys(SHEET_PRESETS)[0];
    }
    const preset = SHEET_PRESETS[presetName];
    return preset ? preset.preview : '';
}

/**
 * 사용 가능한 프리셋 이름 목록 반환
 */
export function getPresetNames() {
    return Object.keys(SHEET_PRESETS);
}
