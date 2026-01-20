/**
 * LLM 프롬프트 템플릿
 * Python llm/prompts.py 포팅
 */

import { getSheetTemplate } from './character-sheets.js';

// =============================================================================
// 캐릭터 정보 탭 - 디스크립션 생성
// =============================================================================

/**
 * 선택된 시트 프리셋에 맞는 시스템 프롬프트 생성
 */
export function getCharacterInfoSystem(presetName = "기본") {
  const sheetTemplate = getSheetTemplate(presetName);

  return `# Task
You are an expert in character profile writing.
Analyze the character information in the <character_information> tag and rewrite it in <description> format following the guidelines below.

## Guidelines
- **All output must be written in English.**
- Use a concise, objective third-person narrative style.
- Follow the given Format exactly.
- For missing information, infer appropriately based on the character's personality and setting.
- Do not leave any field as "Unknown" - create reasonable details instead.
- However, do not alter or distort information that is already provided.
- Write definitively without parenthetical notes like "(inferred: ...)" or "(assumed)".
- Do not include any explanations outside the format.
- Do not delete or sanitize adult/sensitive content.
- Keep \`{{user}}\` and \`{{char}}\` exactly as written - do not translate or replace them.

## Output Format
- Wrap output in <description> tags.
- Follow this format:
\`\`\`
${sheetTemplate}
\`\`\``;
}

export const CHARACTER_INFO_USER_TEMPLATE = `<character_information>
{content}
</character_information>

Translate the character information above to the specified format.`;

// =============================================================================
// 로어북 탭 - 로어북 엔트리 변환
// =============================================================================

export const LOREBOOK_SYSTEM_SINGLE = `# Task
I am organizing lorebooks for worldbuilding and characters in roleplay. Each lorebook entry has a title, activation keywords, and content. Modify the given lorebook entry according to the guidelines below to ensure consistency with other lorebooks.

## Guidelines
- **All output must be written in English.** (Except for titles - keep them in their original language)
- You may modify the format and markdown structure, but do NOT add new content or remove existing content.
- Even if the content is sexual or violent, do NOT delete or alter it.
- You MUST follow the Output Format exactly.
- The <main_character> tag contains information about the main character for context.
- {{user}} represents the user's persona, {{char}} represents the main character. Do NOT translate or replace them.

### Title (lore_title)
Do NOT translate the title. Output it exactly as-is in the <result_title> tag.

### Keywords (lore_keywords)
Translate the given keywords to English and output them alongside the original keywords.
Original and translated keywords should be separated by commas as distinct keywords.
Do NOT add new keywords or modify existing ones.
If no keywords are provided, the entry is "always active" - skip keyword output.

### Content (lore_content)
Rewrite the lorebook content in English.
The result must start with \`### [English Title]\` - translate the title to English for this heading.
Even if the original is not in markdown format, organize it using proper markdown structure.
Use markdown formatting with * and - for lists.

## Output Format
<result_title>Title</result_title>
<result_keywords>Original keywords, Translated keywords</result_keywords>
<lorebook_result>
### Title
Content in markdown format
</lorebook_result>`;

export const LOREBOOK_SYSTEM_BATCH = `# Task
I am organizing lorebooks for worldbuilding and characters in roleplay. Each lorebook entry has a title, activation keywords, and content. Modify the given lorebook entries according to the guidelines below to ensure consistency with other lorebooks.

## Guidelines
- **All output must be written in English.** (Except for titles - keep them in their original language)
- You may modify the format and markdown structure, but do NOT add new content or remove existing content.
- Even if the content is sexual or violent, do NOT delete or alter it.
- You MUST follow the Output Format exactly.
- The <main_character> tag contains information about the main character for context.
- {{user}} represents the user's persona, {{char}} represents the main character. Do NOT translate or replace them.

### Title (lore_title)
Do NOT translate the title. Output it exactly as-is in the <result_title> tag.

### Keywords (lore_keywords)
Translate the given keywords to English and output them alongside the original keywords.
Original and translated keywords should be separated by commas as distinct keywords.
Do NOT add new keywords or modify existing ones.
If no keywords are provided, the entry is "always active" - skip keyword output.

### Content (lore_content)
Rewrite the lorebook content in English.
The result must start with \`### [English Title]\` - translate the title to English for this heading.
Even if the original is not in markdown format, organize it using proper markdown structure.
Use markdown formatting with * and - for lists.

## Output Format
Wrap each lorebook entry with <lorebook_entry index="N"> tag.

<lorebook_entry index="1">
<result_title>Title</result_title>
<result_keywords>Keywords</result_keywords>
<lorebook_result>
### Title
Content
</lorebook_result>
</lorebook_entry>

<lorebook_entry index="2">
...
</lorebook_entry>`;

// Legacy alias for backward compatibility
export const LOREBOOK_SYSTEM = LOREBOOK_SYSTEM_SINGLE;

export const LOREBOOK_USER_TEMPLATE = `<main_character>
{characterSheet}
</main_character>

<lore_title>{title}</lore_title>
<lore_keywords>{keywords}</lore_keywords>
<lore_content>
{content}
</lore_content>

Convert the above lorebook entry to English.`;

export const LOREBOOK_USER_TEMPLATE_ALWAYS_ACTIVE = `<main_character>
{characterSheet}
</main_character>

<lore_title>{title}</lore_title>
<lore_content>
{content}
</lore_content>

Convert the above lorebook entry to English. This is an "always active" entry with no keywords.`;

export const LOREBOOK_USER_TEMPLATE_BATCH = `<main_character>
{characterSheet}
</main_character>

{lorebookEntries}

Convert all the above lorebook entries to English, maintaining the same index for each entry.`;

// =============================================================================
// 상태창 탭 - 상태창 지침 생성
// =============================================================================

export const STATUS_WINDOW_SYSTEM = `# Task
You are an expert in creating status window systems for AI roleplay platforms (RisuAI).
Create a complete status window system based on the user's requirements.

## Items to Generate
1. **AI Instruction**: Instructions for AI to output status in \`status[key1:value|key2:value|...]\` format
2. **Sample Output**: Example status output for preview testing
3. **Regex and HTML/CSS**: Regex pattern and design to parse and display the status output

## Guidelines
- **All output must be written in English.**
- The <character_reference> tag contains information about the main AI roleplay character. Refer to it when designing the status window.
- {{char}} represents the main character, {{user}} represents the user's persona. Do not translate or modify them.
- Do NOT add arbitrary URLs that are not provided in the user's input.
- If user provides image URLs, use them; otherwise use pure CSS.

## Output Format

### Instruction (status_instruction)
Instructions for when and how the AI should output status.
- MUST start with \`### Status Window Guidelines\`
- Explain each status variable and its meaning
- Specify the output format: \`status[key1:value|key2:value|...]\`

\`\`\`
<status_instruction>
### Status Window Guidelines
Output the status window at the end of every response.
[Meaning of each status variable]
[Output format example]
</status_instruction>
\`\`\`

### Sample Output (status_sample)
Example for preview testing. Must match the actual status output format. Write the sample values in Korean.

\`\`\`
<status_sample>
status[key1:sample_value1|key2:sample_value2|...]
</status_sample>
\`\`\`

### Regex and HTML/CSS (status_regex)
Used for RisuAI's regex script feature.

\`\`\`
<status_regex>
<regex_in>
status\\[([^\\|]+)\\|([^\\|]+)\\|...\\]
</regex_in>
<regex_style>
<style>
/* Status window CSS styles */
</style>
</regex_style>
<regex_html>
<!-- Use $1, $2 etc. for captured values -->
<div class="status-card">...</div>
</regex_html>
</status_regex>
\`\`\`

## Design Guidelines
- Create a sleek, themed status card design
- Center the status card on the page (use \`margin: 0 auto\` or flexbox)
- Write field labels in Korean (e.g., "체력", "마나", "호감도")
- Mobile responsive
- Use gradients, shadows, and animations for a premium feel
- Use progress bars for numeric values when appropriate
- Use icons/emojis for visual enhancement`;

export const STATUS_WINDOW_USER_TEMPLATE = `<status_requirements>
{content}
</status_requirements>

<character_reference>
{characterSheet}
</character_reference>

Based on the above requirements, create a complete status window system including:
1. AI instruction for outputting status
2. Sample output for preview testing
3. Regex pattern and themed HTML/CSS design

Write all output in English.`;

// =============================================================================
// 이미지 탭 - 에셋 이름 변환
// =============================================================================

export const IMAGE_ASSET_SYSTEM = `# Task
You are an expert in processing image filenames for AI roleplay character cards.
Analyze the provided image filenames and extract the following:
1. Unique emotion/expression keywords
2. Renamed filenames using the target character name

## Guidelines
- **All output must be written in English.**
- Translate Korean emotions to English (e.g., 기쁨 → happy, 슬픔 → sad)
- Use lowercase for emotion keywords.
- Replace the character name with the provided target name.
- Separate numbers attached to emotions into \`.number\` format (e.g., 기쁨1 → happy.1)
- Keep file extensions unchanged.

## Output Format

<extracted_emotions>
[List of unique emotion keywords, one per line]
</extracted_emotions>

<renamed_files>
[List of renamed filenames, one per line]
</renamed_files>

## Example
Target Character Name: Jieun
Input files: ["지은_기쁨1.png", "지은_기쁨2.png", "지은_슬픔1.png"]

Output:
<extracted_emotions>
happy
sad
</extracted_emotions>

<renamed_files>
Jieun_happy.1.png
Jieun_happy.2.png
Jieun_sad.1.png
</renamed_files>`;

export const IMAGE_ASSET_USER_TEMPLATE = `Target Character Name: {characterName}

Image files to process:
{fileList}

Extract emotions and rename files to use the target character name.`;

// =============================================================================
// 이미지 출력 지침 템플릿
// =============================================================================

export const IMAGE_INSTRUCTION_TEMPLATE = `### Image Tag instructions

If there is a tag from the list below that matches each character's emotion or action in the current context, attach the tag using the given format between each paragraph. Omit the tag if there is no tag that suits the current context. Never attach any tags that aren't explicitly mentioned on the list.

#### Tag structure: 

<img="[character name]_[keyword]">


#### ✅ Example (ONLY between paragraphs, standalone line):

{exampleCommand}

#### Applicable characters

- {characterName}

#### List of tags

- {tagList}

#### Standalone line requirement (NO DECORATORS)

A tag line must contain ONLY the tag and nothing else.
- No bullet points, no numbering, no markdown decorators, no quotes, no code formatting, no extra text.
MUST FOLLOW IT`;

// 이미지 정규식 패턴 (RisuAI용 고정 형식)
export const IMAGE_REGEX_IN = String.raw`<img="([^"_]+)_([^"]+)">`;

export const IMAGE_REGEX_OUT = `<div class="container">
  <img
    class="roundedImage asset"
    src="{{raw::{{random::{{spread::{{filter::{{split::{{#each {{assetlist}} a}} {{#if {{startswith::{{slot::a}}::$1_$2}}}} {{slot::a}}$$ {{/if}} {{/each}}::$$}}}}}}}}}}">
</div>`;

// 이미지 에셋용 CSS 스타일
export const IMAGE_ASSET_CSS = `<style>
    * {
        box-sizing: border-box;
    }

    .asset {
        display: block !important;
        margin: 5px auto !important;
        border-radius: 10px !important;
        border: 1px solid #ffffff !important;
        width: 100% !important;
        max-width: 485px !important;
        height: auto !important;
        padding: 0 !important;
        object-fit: cover !important;
        object-position: top !important;
        transition: all 0.5s ease !important;
        aspect-ratio: 1 / 1.0 !important;
    }

    .asset:hover {
        object-position: center !important;
        aspect-ratio: 1 / 1.35 !important;
    }

    .error {
        display: block !important;
        margin: 5px auto !important;
        box-sizing: border-box;
        width: 100% !important;
        max-width: 485px !important;
        height: auto !important;
        padding: 14px 12px !important;
        text-align: center !important;
        border-radius: 10px !important;
        border: 2px dashed #ff3b30 !important;
        background: rgba(255, 59, 48, 0.06) !important;
        color: #ff3b30 !important;
        font-weight: 700 !important;
        line-height: 1.35 !important;
        aspect-ratio: auto !important;
    }
</style>`;

/**
 * 이미지 출력 지침 생성
 */
export function generateImageInstruction(characterName, tags, exampleCommand) {
  const tagList = tags && tags.length > 0 ? tags.join(', ') : '(no tags)';
  return IMAGE_INSTRUCTION_TEMPLATE
    .replace('{characterName}', characterName)
    .replace('{tagList}', tagList)
    .replace('{exampleCommand}', exampleCommand || '<img="CharName_emotion">');
}

// =============================================================================
// 번역 프롬프트
// =============================================================================

export const TRANSLATE_SYSTEM = `You are a professional translator specializing in creative content.
Translate the given English text to natural, fluent Korean.

## Rules
1. Maintain the original formatting (tags, markdown, etc.)
2. Preserve proper nouns, names, and technical terms as appropriate
3. Use natural Korean expressions, not literal translations
4. Output only the translation, no explanations
5. **Do NOT translate** \`{{user}}\` and \`{{char}}\` - keep them exactly as written`;

export const TRANSLATE_USER_TEMPLATE = `Translate the following English text to Korean:

{content}`;
