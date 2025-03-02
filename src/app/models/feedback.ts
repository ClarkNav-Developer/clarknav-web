export interface Feedback {
    id: number;
    title: string;
    feature: string;
    usability: string;
    performance: string;
    experience: string;
    suggestions: string;
    priority: FeedbackPriority; // Use enum
    status: FeedbackStatus; // Use enum
    created_at: string;
    updated_at: string;
}

export enum FeedbackPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

export enum FeedbackStatus {
    UNDER_REVIEW = 'UNDER_REVIEW',
    IN_PROGRESS = 'IN_PROGRESS',
    IMPLEMENTED = 'IMPLEMENTED',
    CLOSED = 'CLOSED'
}