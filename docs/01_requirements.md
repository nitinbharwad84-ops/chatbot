# Requirements Specification

## Functional Requirements
- **Authentication:**
    - Email/Password Signup/Login.
    - Session persistence.
- **Conversation Management:**
    - Create new chats.
    - List historical chats in sidebar.
    - Delete conversations.
    - Rename conversations (Auto-summary of first message).
- **Chat Interface:**
    - Real-time streaming responses.
    - Model selection dropdown.
    - Message history loading.
    - Actions: Copy, Regenerate, Delete message.
    - Auto-scroll to bottom.
- **Global Settings:**
    - Model preference persistence.
    - Reset settings to default.

## Non-Functional Requirements
- **Latency:** Streaming must feel instantaneous (<500ms start time).
- **Responsive:** Mobile-first design with hamburger menu.
- **Security:** API keys hidden in environment variables; RLS enforced on Supabase.
- **UI:** Dark theme, clean typography, glassmorphism elements.
