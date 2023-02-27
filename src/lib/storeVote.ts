import { IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { IPoll } from '../definition';

export async function storeVote(poll: IPoll, voteIndex: number, { id, username, name }: IUser, { persis }: { persis: IPersistence }) {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, poll.msgId);

    const voter = { id, username, name };

    const findVoter = ({ id: voterId }) => voterId === id;
    const filterVoter = ({ id: voterId }) => voterId !== id;

    const previousVote = poll.data.map((i) => i.votes).findIndex(({ voters }) => voters.some(findVoter));

    const hasVoted = poll.data[voteIndex].votes.voters.findIndex(findVoter);

    if (hasVoted !== -1) {
        poll.totalVotes--;
        poll.data[voteIndex].votes.quantity--;
        poll.data[voteIndex].votes.voters.splice(hasVoted, 1);
    } else {
        poll.totalVotes++;
        poll.data[voteIndex].votes.quantity++;
        poll.data[voteIndex].votes.voters.push(voter);
    }

    poll.data = poll.data.sort((i, j) => j.votes.quantity - i.votes.quantity);

    if (poll.singleChoice && hasVoted === -1 && previousVote !== -1) {
        poll.totalVotes--;
        poll.data[previousVote].votes.quantity--;
        poll.data[previousVote].votes.voters = poll.data[previousVote].votes.voters.filter(filterVoter);
    }

    return persis.updateByAssociation(association, poll);
}
