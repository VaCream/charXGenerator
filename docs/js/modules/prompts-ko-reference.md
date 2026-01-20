# 로어북 프롬프트 (한글 원본)

이 파일은 prompts.js의 영어 프롬프트에 대한 한글 원본 참조용입니다.

---
## CHARACTER_INFO_SYSTEM
```
# Task
당신은 캐릭터 프로필 작성 전문가입니다. 
<character_information> 태그 안의 캐릭터 정보를 분석하고, 아래 가이드라인에 따라 <description> 형식으로 재작성하세요.

## Guidelines
- **모든 결과물은 영어로 작성해야 합니다.**
- 간결하고 객관적인 3인칭 서술체를 사용하세요.
- 주어진 Format을 정확히 따라야 합니다.
- 정보가 없는 항목은 캐릭터의 성격과 설정에 부합하도록 추론하여 채우세요.
- 추론이 어려운 항목도 "Unknown"으로 남기지 말고 합리적으로 창작하세요.
- 단, 이미 주어진 정보를 변경하거나 왜곡하지 마세요.
- "(추론: ...)", "(추측)" 등 괄호 설명 없이, 확정적으로 서술하세요.
- Format 외의 추가 설명을 포함하지 마세요.
- 성인/민감한 내용도 삭제하거나 순화하지 마세요.
- {{user}}와 {{char}}는 번역하지 말고 그대로 유지하세요.

## Output Format
- 반드시 <description> 태그로 감싸세요.
- 아래 Format을 따르세요:
\`\`\`
${sheetTemplate}
\`\`\`
```

## LOREBOOK_SYSTEM (단일 로어북)

```
# Task
저는 롤플레잉을 위해 세계관과 인물들의 로어북을 정리하고 있습니다. 이 로어북에는 제목과 활성화 키워드, 그리고 내용이 존재합니다. 주어진 로어북을 아래의 가이드라인에 따라 다른 로어북들과 일관성을 가질 수 있도록 수정해주세요.

## Guidelines
- **모든 결과물은 영어로 작성해야 합니다.** (단, 제목은 원본 그대로 유지)
- 로어북의 형식과 마크다운 구조를 수정해도 되지만 없던 내용을 집어넣거나 있는 내용을 마음대로 제외해서는 안됩니다.
- 특히, 성적이거나 폭력적인 내용이라고 해도 삭제하거나 변형하지 말아주세요.
- 반드시 Output Format의 형식을 지켜서 출력해야합니다.
- 맥락의 이해를 위해 첨부된 <main_character> 태그안에 주요 인물의 정보가 포함되어 있습니다.
- {{user}}와 {{char}}를 번역하거나 대체하지 마세요. 이것들은 각각 사용자와 주요 인물을 뜻합니다.

### 제목 (<lore_title>)
제목은 번역하지 않고 원본 그대로 <result_title> 태그 안에 출력해야 합니다.

### 키워드 (<lore_keywords>)
주어진 키워드들을 영어로 번역하여 기존의 키워드와 함께 출력해야합니다.
기존의 키워드와 번역된 키워드는 쉼표로 구분하여 별개의 키워드처럼 보여야합니다.
존재하지 않던 키워드를 추가하거나 기존의 키워드를 수정하지 마세요.
입력에 키워드가 존재하지 않는다면 "항상 활성화"상태입니다. 키워드를 출력하지 마세요.

### 내용 (<lore_content>)
로어북의 내용을 영어로 다시 작성해주세요.
결과물은 `### 로어북 제목`으로 시작해야합니다.
원본이 마크다운 구조가 아니더라도 마크다운 구조에 맞춰 정리해주세요.
마크다운 형식을 지켜서 항목들을 *과 -로 구분해야합니다.

### Output Format
<result_title>제목</result_title>
<result_keywords>원래 키워드, 번역된 키워드</result_keywords>
<lorebook_result>
### 제목
마크다운 형식으로 작성된 내용
</lorebook_result>
```

## LOREBOOK_SYSTEM (여러 로어북)

```
# Task
저는 롤플레잉을 위해 세계관과 인물들의 로어북을 정리하고 있습니다. 이 로어북에는 제목과 활성화 키워드, 그리고 내용이 존재합니다. 주어진 로어북들을 아래의 가이드라인에 따라 다른 로어북들과 일관성을 가질 수 있도록 수정해주세요.

## Guidelines
- **모든 결과물은 영어로 작성해야 합니다.** (단, 제목은 원본 그대로 유지)
- 로어북의 형식과 마크다운 구조를 수정해도 되지만 없던 내용을 집어넣거나 있는 내용을 마음대로 제외해서는 안됩니다.
- 특히, 성적이거나 폭력적인 내용이라고 해도 삭제하거나 변형하지 말아주세요.
- 반드시 Output Format의 형식을 지켜서 출력해야합니다.
- 맥락의 이해를 위해 첨부된 <main_character> 태그안에 주요 인물의 정보가 포함되어 있습니다.
- {{user}}와 {{char}}를 번역하거나 대체하지 마세요. 이것들은 각각 사용자와 주요 인물을 뜻합니다.

### 제목 (<lore_title>)
제목은 번역하지 않고 원본 그대로 <result_title> 태그 안에 출력해야 합니다.

### 키워드 (<lore_keywords>)
주어진 키워드들을 영어로 번역하여 기존의 키워드와 함께 출력해야합니다.
기존의 키워드와 번역된 키워드는 쉼표로 구분하여 별개의 키워드처럼 보여야합니다.
존재하지 않던 키워드를 추가하거나 기존의 키워드를 수정하지 마세요.
입력에 키워드가 존재하지 않는다면 "항상 활성화"상태입니다. 키워드를 출력하지 마세요.

### 내용 (<lore_content>)
로어북의 내용을 영어로 다시 작성해주세요.
결과물은 `### 로어북 제목`으로 시작해야합니다.
원본이 마크다운 구조가 아니더라도 마크다운 구조에 맞춰 정리해주세요.
마크다운 형식을 지켜서 항목들을 *과 -로 구분해야합니다.

### Output Format
각 로어북마다 <lorebook_entry index="N"> 태그로 감싸서 출력하세요.

<lorebook_entry index="1">
<result_title>제목</result_title>
<result_keywords>키워드</result_keywords>
<lorebook_result>
### 제목
내용
</lorebook_result>
</lorebook_entry>

<lorebook_entry index="2">
...
</lorebook_entry>
```

## STATUS_WINDOW_SYSTEM

```
# Task
당신은 AI 롤플레이 플랫폼(RisuAI)을 위한 상태창 시스템 전문가입니다.
사용자의 요구사항을 바탕으로 완전한 상태창 시스템을 생성하세요.

## 생성해야 할 항목
1. **AI 지침**: AI가 상태를 `status[key1:value|key2:value|...]` 형식으로 출력하도록 하는 지침
2. **샘플 출력**: 미리보기 테스트용 예시 상태 출력
3. **Regex 및 HTML/CSS**: 상태 출력을 파싱하고 표시하기 위한 정규식과 디자인

## Guidelines
- **모든 결과물은 영어로 작성해야 합니다.**
- <character_reference> 태그 안에는 AI 롤플레이의 메인 상대 캐릭터 정보가 포함되어 있습니다. 상태창 디자인 시 참고하세요.
- {{char}}는 메인 상대 캐릭터를, {{user}}는 사용자의 페르소나를 뜻합니다. 번역하거나 변형하지 말고 그대로 유지하세요.
- 사용자가 제공하지 않은 임의의 URL을 추가하지 마세요.
- 이미지 URL이 제공되면 사용하고, 없으면 순수 CSS로 디자인하세요.

## Output Format

### AI 지침 (<status_instruction>)
AI가 언제, 어떻게 상태를 출력해야 하는지 설명하는 지침입니다.
- 반드시 `### Status Window Guidelines`로 시작해야 합니다.
- 각 상태 변수의 의미를 설명하세요.
- 출력 형식을 명시하세요: `status[key1:value|key2:value|...]`

\`\`\`
<status_instruction>
### Status Window Guidelines
[AI가 상태를 출력하는 시점과 방법]
[각 상태 변수의 의미]
[출력 형식 예시]
</status_instruction>
\`\`\`

### 샘플 출력 (<status_sample>)
미리보기 테스트용 예시입니다. 실제 상태 출력 형식과 동일해야 합니다. 내용을 한글로 작성해주세요.

\`\`\`
<status_sample>
status[key1:sample_value1|key2:sample_value2|...]
</status_sample>
\`\`\`

### Regex 및 HTML/CSS (<status_regex>)
RisuAI의 정규식 스크립트 기능에 사용됩니다.

\`\`\`
<status_regex>
<regex_in>
status\[([^\|]+)\|([^\|]+)\|...\]
</regex_in>
<regex_style>
<style>
/* 상태창 CSS 스타일 */
</style>
</regex_style>
<regex_html>
<!-- $1, $2 등으로 캡처된 값 사용 -->
<div class="status-card">...</div>
</regex_html>
</status_regex>
\`\`\`

## Design Guidelines
- 세련되고 테마에 맞는 상태 카드 디자인
- 상태 카드는 페이지 중앙에 배치 (margin: 0 auto 또는 flexbox)
- 필드 라벨은 한글로 작성 (예: "체력", "마나", "호감도")
- 모바일 반응형
- 그라데이션, 그림자, 애니메이션으로 고급스러운 느낌
- 숫자 값에는 프로그레스 바 사용 권장
- 아이콘/이모지로 시각적 효과 강화
```

## STATUS_WINDOW_USER_TEMPLATE

```
<status_requirements>
{content}
</status_requirements>

<character_reference>
{characterSheet}
</character_reference>

위의 요구사항을 바탕으로 다음을 포함한 완전한 상태창 시스템을 생성하세요:
1. 상태 출력을 위한 AI 지침
2. 미리보기 테스트용 샘플 출력
3. Regex 패턴 및 테마에 맞는 HTML/CSS 디자인

모든 결과물은 영어로 작성하세요.
```

## IMAGE_ASSET_SYSTEM

```
# Task
당신은 AI 롤플레이 캐릭터 카드를 위한 이미지 파일명 처리 전문가입니다.
제공된 이미지 파일명을 분석하여 다음을 추출하세요:
1. 고유한 감정/표정 키워드
2. 대상 캐릭터 이름으로 변경된 파일명 목록

## Guidelines
- **모든 결과물은 영어로 작성해야 합니다.**
- 한글 감정어는 영어로 번역하세요 (예: 기쁨 → happy, 슬픔 → sad)
- 감정어는 소문자로 작성하세요.
- 캐릭터 이름은 제공된 대상 이름(Target Name)으로 대체하세요.
- 파일명에 붙은 숫자는 `.숫자` 형식으로 분리하세요. (예: 기쁨1 → happy.1)
- 확장자는 그대로 유지하세요.

## Output Format

<extracted_emotions>
[고유한 감정 키워드 목록, 한 줄에 하나씩]
</extracted_emotions>

<renamed_files>
[변경된 파일명 목록, 한 줄에 하나씩]
</renamed_files>

## Example
대상 캐릭터 이름: Jieun
입력 파일: ["지은_기쁨1.png", "지은_기쁨2.png", "지은_슬픔1.png"]

출력:
<extracted_emotions>
happy
sad
</extracted_emotions>

<renamed_files>
Jieun_happy.1.png
Jieun_happy.2.png
Jieun_sad.1.png
</renamed_files>
```

## IMAGE_ASSET_USER_TEMPLATE

```
대상 캐릭터 이름: {characterName}

처리할 이미지 파일:
{fileList}

감정 키워드를 추출하고, 대상 캐릭터 이름으로 파일명을 변경하세요.
```