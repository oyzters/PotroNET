export interface Author {
    id: string;
    full_name: string;
    avatar_url: string;
    email: string;
}

export interface Publication {
    id: string;
    content: string;
    tags: string[];
    likes_count: number;
    comments_count?: number;
    created_at: string;
    author: Author;
    user_liked?: boolean;
    image_url?: string;
    media?: Array<{ type: 'image' | 'video'; url: string }>;
}

export interface FeedPage {
    publications: Publication[];
    nextCursor: string | null;
    hasMore: boolean;
}

export type FeedItem =
    | { kind: 'post'; data: Publication }
    | { kind: 'widget'; name: 'newUsers' | 'ranking' | 'professors' | 'tutoring' | 'streak' };

// Widget injection: after publication at these indices
export const WIDGET_AT: Record<number, Extract<FeedItem, { kind: 'widget' }>['name']> = {
    1: 'newUsers',
    2: 'ranking',
    5: 'professors',
    9: 'tutoring',
    13: 'streak',
};

export function buildFeedItems(publications: Publication[]): FeedItem[] {
    const items: FeedItem[] = [];
    publications.forEach((pub, idx) => {
        items.push({ kind: 'post', data: pub });
        const widget = WIDGET_AT[idx];
        if (widget) items.push({ kind: 'widget', name: widget });
    });
    return items;
}
