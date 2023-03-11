import { IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import {sortVotes} from '../assets/sortVotes';
import { IPoll, IVoter } from '../definition';

export async function storeVote(poll: IPoll, voteIndex: number, { id, username, name }: IUser, { persis }: { persis: IPersistence }) {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, poll.msgId);

    const voter = { id, username, name };

    const findVoter = ({ id: voterId }) => voterId === id;
    const filterVoter = ({ id: voterId }) => voterId !== id;

    const previousVote = poll.votes.findIndex(({ voters }) => voters.some(findVoter));

    const hasVoted = poll.votes[voteIndex].voters.findIndex(findVoter);


    if (hasVoted !== -1) {
        poll.totalVotes--;
        poll.votes[voteIndex].quantity--;
        poll.votes[voteIndex].voters.splice(hasVoted, 1);
    } else {
        poll.totalVotes++;
        poll.votes[voteIndex].quantity++;
        poll.votes[voteIndex].voters.push(voter);
    }

    const data = sortVotes(poll);
    poll.votes = data.votes
    poll.options = data.options

    if (poll.singleChoice && hasVoted === -1 && previousVote !== -1) {
        poll.totalVotes--;
        poll.votes[previousVote].quantity--;
        poll.votes[previousVote].voters = poll.votes[previousVote].voters.filter(filterVoter);
    }

    return persis.updateByAssociation(association, poll);
}
