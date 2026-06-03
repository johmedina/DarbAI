//interface.ts

// export interface message{
//     content:string;
//     role:string;
//     id:string;
// }


export interface ChatModel {
    id: string
    name: string
    created_dt: Date
    recent_message_created_dt?: Date
    is_new?: boolean
  }
  
  export interface SharedChatModel {
    id?: string
    name?: string
    shared_dt?: Date
    created_dt?: Date
  }
  
  export enum ChatMessageRoleType{
      USER = "user",
      ASSISTANT = "assistant"
  }
  
  export enum ChatMessageGenerationType{
    TEXT = 'text',
    AGENTIC = 'agentic',
    DEEP_THINKING = 'deep_thinking',
    IMAGE = 'image',
    MUSIC = 'music',
    SPEECH = 'speech',
    MEDIA_UNDERSTANDING = 'media_understanding',
    IMAGE_UNDERSTANDING = 'image_understanding',
    VIDEO_UNDERSTANDING = 'video_understanding',
    TRANSCRIPTION = 'transcription'
  }
  
  export const TEXT_GENERATION_TYPES = [
    ChatMessageGenerationType.TEXT,
    ChatMessageGenerationType.AGENTIC,
    ChatMessageGenerationType.IMAGE_UNDERSTANDING,
    ChatMessageGenerationType.VIDEO_UNDERSTANDING,
    ChatMessageGenerationType.DEEP_THINKING,
    ChatMessageGenerationType.TRANSCRIPTION
  ]
  
  export const MEDIA_UNDERSTANDING_TYPES = [
    ChatMessageGenerationType.IMAGE_UNDERSTANDING,
    ChatMessageGenerationType.VIDEO_UNDERSTANDING,
    ChatMessageGenerationType.TRANSCRIPTION
  ]
  
  export interface ChatMessageReference{
      index: number
      number: number
      source: string
      content: string
  }
  
  export enum ChatUploadedFileType{
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio'
  }
  
  export const GENERATION_TYPE_OF_FILE_TYPE = {
    [ChatUploadedFileType.IMAGE]: ChatMessageGenerationType.IMAGE_UNDERSTANDING, 
    [ChatUploadedFileType.VIDEO]: ChatMessageGenerationType.VIDEO_UNDERSTANDING,
    [ChatUploadedFileType.AUDIO]: ChatMessageGenerationType.TRANSCRIPTION
  }
  
  export const FILE_TYPE_OF_GENERATION_TYPE = {
    [ChatMessageGenerationType.IMAGE_UNDERSTANDING]: ChatUploadedFileType.IMAGE,
    [ChatMessageGenerationType.VIDEO_UNDERSTANDING]: ChatUploadedFileType.VIDEO,
    [ChatMessageGenerationType.TRANSCRIPTION]: ChatUploadedFileType.AUDIO
  }
  
  export interface ChatUploadedFile{
    id?: string
    objectUrl?: string
    file?: File
    base64Url?: string
    type?: ChatUploadedFileType
    thumbnailBase64Url?: string
  }
  
  export interface ChatMessageToolCall {
    name: string
    arguments: Record<string, any>
    result?: any
    structured_content?: any
  }
  
  export enum ChatMessageFilteredType{
    SAFETY = "safety",
    BLOCKLIST = "blocklist",
    INCOMPLETE = "incomplete"
  }
  
  export interface TokenData {
    token: string
    au: number
    eu: number
    reliability: number
    entropy: number
    collision_entropy: number
  }
      
  
  export interface ChatMessageModel {
    id?: number
    chat_id: string
    role: ChatMessageRoleType
    message: string
    generation_type: ChatMessageGenerationType
    model_id?: string
    created_dt?: Date
    response?: string
    message_language?: string
    translated_message?: string
    response_to?: number
    is_attributable?: boolean
    reaction?: string
    with_typing?: boolean
    paired_on?: number
    is_failed?: boolean
    is_regenerated?: boolean
    is_filtered?: boolean
    filtered_type?: ChatMessageFilteredType
    references?: ChatMessageReference[]
    has_image?: boolean
    has_speech?: boolean
    chat_uploaded_file_ids?: string[]
    chat_uploaded_files?: ChatUploadedFile[]
    need_deep_thinking?: boolean
    has_exceeded_safety_filter_limit?: boolean
    tool_calls?: ChatMessageToolCall[]
    token_data?: TokenData[]
    total_reliability?: number
    total_entropy?: number
    total_collision_entropy?: number
    generation_time_seconds?: number                       
    total_reliability_with_hidden_layers?: number
  }
  
  export interface ChatMessageFileModel {
    id: number
    reaction?: string
    encoded_file: string
    url?: string
  }
  
  
  export const FEEDBACK_CATEGORIES = [
    "lacked_factual_accuracy",
    "failed_to_follow_instructions",
    "avoided_answering_questions",
    "content_was_disturbing",
    "too_brief",
    "too_long",
    "displeased_with_style_and_format",
    "full_of_grammatical_errors_and_strange_letters",
    "not_aligned_with_arabic_or_islamic_culture"
  ]
  
  export const FEEDBACK_CATEGORIES_FOR_IMAGE = [
    "lack_of_details_and_image_clarity",
    "failed_to_follow_instructions",
    "contradicts_with_arabic_and_islamic_culture_and_values",
    "lack_of_creativity_and_diversity",
    "too_conservative",
    "construction_took_too_long"
  ]
  
  export const FEEDBACK_CATEGORIES_FOR_ATTRIBUTION = [
    "incorrect_references",
    "incorrect_revised_response",
    "missing_references"
  ]
  
  export const FEEDBACK_CATEGORIES_FOR_SPEECH = [
    "naturalness",
    "intelligibility",
    "prosody",
    "noise_and_artifacts",
    "diacritics",
    "other"
  ]
  
  export const RED_TEAMING_TOPICS = ["qatar","religion","leadership","culture"]
  
  export const RED_TEAMING_SEVERITIES = ['low','high','severe']