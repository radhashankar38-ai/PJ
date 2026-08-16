export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  username: string;
  isPublic: boolean;
  photoURL?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  streakCount?: number;
  lastMomentDate?: string;
}

export interface Journal {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorUsername?: string;
  authorPhotoURL?: string;
  isPublic?: boolean;
  imageUrls?: string[];
  createdAt: string;
  likes: string[]; // array of user IDs
  understands?: string[]; // array of user IDs
  inspired?: string[]; // array of user IDs
  commentCount: number;
  unlockDate?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  collectionId?: string;
}

export interface Collection {
  id: string;
  title: string;
  description?: string;
  authorId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  journalId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export interface Moment {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhotoURL?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  filter?: string;
  overlayText?: string;
  overlayFont?: string;
  overlayPosition?: { x: number; y: number };
  createdAt: string;
  expiresAt: string;
  viewers: string[];
  sharedWith: string[]; // array of usernames or 'public'
}

export interface UserStreak {
  friendId: string;
  friendUsername: string;
  friendName: string;
  friendPhotoURL?: string;
  count: number;
  lastSharedAt: string;
}
