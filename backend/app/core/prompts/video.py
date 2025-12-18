"""
Video generation prompt templates for AI script and storyboard generation.
Story 4.2: Script & Storyboard AI Service
"""

CREATIVE_AD_PROMPT = """
你是一个专业的广告视频脚本编剧。基于产品信息生成一个充满活力的{duration}秒广告脚本。

产品信息：
名称: {name}
描述: {description}
卖点: {selling_points}
类别: {category}
目标受众: {target_audience}

要求：
1. 生成总共{duration}秒的视频脚本，分成{segments}个段落
2. 每个脚本段落包含：文本（用于TTS）和预估时长（秒）
3. 语气充满活力、说服力强，激发购买欲望
4. 突出产品的核心价值主张和独特卖点
5. 脚本应该朗朗上口，适合视频广告场景

分镜板要求：
1. 为每个脚本段落生成对应的视觉场景
2. 每个场景包含：场景序号、时长、视觉描述、转场效果
3. 视觉描述要具体，便于AI生成画面
4. 转场效果包括：fade（淡入淡出）、cut（切镜）、slide（滑动）、dissolve（溶解）
5. 场景总时长必须与脚本总时长匹配

返回严格的JSON格式：
{{
  "script": [
    {{"text": "开场白文本", "duration": 3.0}},
    {{"text": "产品介绍文本", "duration": 5.0}},
    {{"text": "核心卖点展示", "duration": 4.0}},
    {{"text": "行动号召", "duration": 2.0}}
  ],
  "storyboard": [
    {{
      "scene_index": 1,
      "duration": 3.0,
      "visual_prompt": "产品精美特写镜头，突出设计细节",
      "transition": "fade"
    }},
    {{
      "scene_index": 2,
      "duration": 5.0,
      "visual_prompt": "产品在实际使用场景中的展示",
      "transition": "cut"
    }},
    {{
      "scene_index": 3,
      "duration": 4.0,
      "visual_prompt": "产品核心功能的动态展示",
      "transition": "slide"
    }},
    {{
      "scene_index": 4,
      "duration": 2.0,
      "visual_prompt": "品牌Logo和产品口号展示",
      "transition": "fade"
    }}
  ]
}}

重要：必须返回有效的JSON格式，确保所有字段都存在且格式正确。
"""

FUNCTIONAL_INTRO_PROMPT = """
你是一个专业的产品介绍视频编剧。基于产品信息生成一个清晰、专业的{duration}秒功能介绍脚本。

产品信息：
名称: {name}
描述: {description}
功能特点: {selling_points}
产品类别: {category}
适用用户: {target_audience}

要求：
1. 生成总共{duration}秒的视频脚本，分成{segments}个段落
2. 每个脚本段落包含：专业文本和预估时长（秒）
3. 语气专业、客观、信息丰富
4. 清晰展示产品功能和使用价值
5. 提供实用的产品信息

分镜板要求：
1. 为每个脚本段落生成对应的功能展示场景
2. 每个场景包含：场景序号、时长、视觉描述、转场效果
3. 视觉描述要专业，清晰展示产品功能
4. 转场效果包括：fade（淡入淡出）、cut（切镜）、slide（滑动）、zoom（缩放）
5. 场景总时长必须与脚本总时长匹配

返回严格的JSON格式：
{{
  "script": [
    {{"text": "产品概述介绍", "duration": 4.0}},
    {{"text": "核心功能说明", "duration": 6.0}},
    {{"text": "使用场景演示", "duration": 5.0}},
    {{"text": "产品规格总结", "duration": 3.0}}
  ],
  "storyboard": [
    {{
      "scene_index": 1,
      "duration": 4.0,
      "visual_prompt": "产品全景展示，标注主要功能区域",
      "transition": "fade"
    }},
    {{
      "scene_index": 2,
      "duration": 6.0,
      "visual_prompt": "产品功能的详细演示，突出技术优势",
      "transition": "cut"
    }},
    {{
      "scene_index": 3,
      "duration": 5.0,
      "visual_prompt": "不同应用场景下的使用示例",
      "transition": "slide"
    }},
    {{
      "scene_index": 4,
      "duration": 3.0,
      "visual_prompt": "产品规格参数图表和信息总结",
      "transition": "zoom"
    }}
  ]
}}

重要：必须返回有效的JSON格式，确保所有字段都存在且格式正确。
"""

# Template mapping for easy access
VIDEO_TEMPLATES = {
    "creative_ad": CREATIVE_AD_PROMPT,
    "functional_intro": FUNCTIONAL_INTRO_PROMPT
}

def get_video_prompt_template(mode: str) -> str:
    """Get the appropriate video prompt template based on mode.

    Args:
        mode: Video generation mode ('creative_ad' or 'functional_intro')

    Returns:
        Prompt template string

    Raises:
        ValueError: If mode is not supported
    """
    if mode not in VIDEO_TEMPLATES:
        raise ValueError(f"Unsupported video mode: {mode}. Supported modes: {list(VIDEO_TEMPLATES.keys())}")

    return VIDEO_TEMPLATES[mode]