import { IUIKitBlockIncomingInteraction } from '@rocket.chat/apps-engine/definition/uikit/UIKitIncomingInteractionTypes';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export enum pollVisibility {
    open = 'open',
    confidential = 'confidential',
    mixed = 'mixed',
}

export type IVoterPerson = Pick<IUser, 'id' | 'username' | 'name'>;

export interface IVoter {
    quantity: number;
    voters: Array<IVoterPerson>;
}

export interface IPoll {
    msgId: string;
    uid: string; // user who created the poll
    question: string;
    totalVotes: number;
    data: Array<{option: string, votes: IVoter }>;
    finished?: boolean;
    visibility?: pollVisibility;
    singleChoice?: boolean;
    wordCloud?: boolean;
    liveId?: string;
    pollIndex?: number;
    totalLivePolls?: number;
    activeLivePoll?: boolean;
    livePollEndTime?: string;
    anonymousOptions: Array<string>;
    allowAddingOptions?: boolean;
}

export interface IModalContext extends Partial<IUIKitBlockIncomingInteraction> {
    threadId?: string;
}
