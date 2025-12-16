import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from '@/components/custom/use-scroll-to-bottom';
import { useState, useEffect } from "react";
import { ChatMessageGenerationType, ChatMessageModel, ChatMessageRoleType } from "../../interfaces/interfaces"
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import { v4 as uuidv4 } from 'uuid';

const API_ENDPOINT = "/api/generate_response";

export function Chat() {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const [messages, setMessages] = useState<ChatMessageModel[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    console.log(messages);
  }, [messages]);

  function buildContextFromMessages(history: ChatMessageModel[]) {
    const lastMessages = history.slice(-10);
    console.log(lastMessages);

    return lastMessages.map(msg => ({
      role: msg.role === ChatMessageRoleType.USER ? "user" : "assistant",
      content: msg.message,
    }));
  }

  async function handleSubmit(text?: string) {
    if (isLoading) return;

    const messageText = text || question;
    if (!messageText.trim()) return;

    setIsLoading(true);
    const traceId = uuidv4();

    // Optimistically add the user message to the UI
    setMessages(prev => [
      ...prev,
      {
        message: messageText,
        role: ChatMessageRoleType.USER,
        chat_id: traceId,
        generation_type: ChatMessageGenerationType.TEXT,
      }
    ]);
    setQuestion("");

    try {
      const context = buildContextFromMessages(messages);

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: messageText,
          use_rag: true,
          context,
          chat_id: traceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("API Response:", data);
        setMessages(prev => [...prev, data.data as ChatMessageModel]);
      }
    } catch (error) {
      console.error("API error:", error);
      setMessages(prev => [
        ...prev,
        {
          message: "Sorry, there was an error processing your request.",
          role: ChatMessageRoleType.ASSISTANT,
          chat_id: traceId,
          generation_type: ChatMessageGenerationType.TEXT,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <Header/>
      <div
        className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
        ref={messagesContainerRef}
      >
        {messages.length === 0 && <Overview />}
        {messages.map((message, index) => (
          <PreviewMessage key={index} message={message} />
        ))}
        {isLoading && <ThinkingMessage />}
        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
      </div>
      <div className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <ChatInput
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
