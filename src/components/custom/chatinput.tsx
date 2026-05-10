import { Textarea } from "../ui/textarea";
import { cx } from 'classix';
import { Button } from "../ui/button";
import { ArrowUpIcon, PaperclipIcon, CrossIcon } from "./icons"
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useState, useRef } from 'react';

interface ChatInputProps {
    question: string;
    setQuestion: (question: string) => void;
    onSubmit: (text?: string) => void;
    isLoading: boolean;
    image: File | null;
    setImage: (image: File | null) => void;
}

const suggestedActions = [
    {
        title: 'What is the legal',
        label: 'driving age in Qatar?',
        action: 'What is the legal driving age in Qatar?',
    },
    {
        title: 'What are the different types',
        label: 'of driving licenses in Qatar?',
        action: 'What are the different types of driving licenses in Qatar?',
    },
];

export const ChatInput = ({ question, setQuestion, onSubmit, isLoading, image, setImage }: ChatInputProps) => {
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);
    const previewUrl = image ? URL.createObjectURL(image) : null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file.');
                return;
            }
            setImage(file);
        }
        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current += 1;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Only image files are supported.');
            return;
        }
        setImage(file);
    };

    const canSubmit = question.trim().length > 0 || image !== null;

    return(
    <div
        className="relative w-full flex flex-col gap-4"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
        {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-muted/80 pointer-events-none">
                <span className="text-sm font-medium text-primary">Drop image here</span>
            </div>
        )}
        {showSuggestions && (
            <div className="hidden md:grid sm:grid-cols-2 gap-2 w-full">
                {suggestedActions.map((suggestedAction, index) => (
                    <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.05 * index }}
                    key={index}
                    className={index > 1 ? 'hidden sm:block' : 'block'}
                    >
                        <Button
                            variant="ghost"
                            onClick={ () => {
                                const text = suggestedAction.action;
                                onSubmit(text);
                                setShowSuggestions(false);
                            }}
                            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
                        >
                            <span className="font-medium">{suggestedAction.title}</span>
                            <span className="text-muted-foreground">
                            {suggestedAction.label}
                            </span>
                        </Button>
                    </motion.div>
                ))}
            </div>
        )}

        {/* Hidden file input */}
        <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
        />

        {/* Image preview */}
        {previewUrl && (
            <div className="relative w-fit">
                <img
                    src={previewUrl}
                    alt="Selected"
                    className="h-24 w-auto rounded-lg object-cover border border-border"
                />
                <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-0.5 hover:bg-muted"
                    aria-label="Remove image"
                >
                    <CrossIcon size={12} />
                </button>
            </div>
        )}

        <div className="relative">
            <Textarea
            placeholder="Send a message..."
            className={cx(
                'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-xl text-base bg-muted pr-20',
            )}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();

                    if (isLoading) {
                        toast.error('Please wait for the model to finish its response!');
                    } else {
                        setShowSuggestions(false);
                        onSubmit();
                    }
                }
            }}
            rows={3}
            autoFocus
            />

            {/* Image upload button */}
            <Button
                type="button"
                variant="ghost"
                className="rounded-full p-1.5 h-fit absolute bottom-2 right-10 m-0.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                aria-label="Attach image"
            >
                <PaperclipIcon size={14} />
            </Button>

            <Button
                className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-600"
                onClick={() => onSubmit(question)}
                disabled={!canSubmit}
            >
                <ArrowUpIcon size={14} />
            </Button>
        </div>
    </div>
    );
}
