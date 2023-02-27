import { ILogger, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';

import { IPoll } from '../definition';
import { createLivePollMessage } from './createLivePollMessage';
import { createPollBlocks } from './createPollBlocks';
import { getPoll } from './getPoll';

async function finishPoll(poll: IPoll, { persis }: { persis: IPersistence }) {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, poll.msgId);
    poll.finished = true;
    return persis.updateByAssociation(association, poll);
}

export async function nextPollMessage({ data, read, persistence, modify, logger }: {
    data,
    read: IRead,
    persistence: IPersistence,
    modify: IModify,
    logger: ILogger,
}) {
    if (!data.message) {
        return {
            success: true,
        };
    }

    const poll = await getPoll(String(data.message.id), read);

    if (!poll) {
        throw new Error('no such poll');
    }

    if (poll.uid !== data.user.id) {
        throw new Error('You are not allowed to activate the next poll'); // send an ephemeral message
    }

    try {
        // Check if poll already marked inactive
        if (poll.activeLivePoll) {

            // Mark poll as inactive
            poll.activeLivePoll = false;
            // Finish poll if not finished
            if (!poll.finished) {
                await finishPoll(poll, { persis: persistence });
            }

            // Update poll association with activeLivePoll set to false
            const pollAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, poll.msgId);
            await persistence.updateByAssociation(pollAssociation, poll, true);

            const message = await modify.getUpdater().message(data.message.id as string, data.user);
            message.setEditor(message.getSender());

            const block = modify.getCreator().getBlockBuilder();

            const showNames = await read.getEnvironmentReader().getSettings().getById('use-user-name');
            const wordCloudAPI = await read.getEnvironmentReader().getSettings().getById('wordcloud-api');
            const timeZone = await read.getEnvironmentReader().getSettings().getById('timezone');

            createPollBlocks(block, poll.question, poll.data.map((i) => i.option), poll, showNames.value, timeZone.value, poll.anonymousOptions, wordCloudAPI.value);

            message.setBlocks(block);

            // End poll and send next poll
            if (poll.pollIndex !== undefined && poll.totalLivePolls && poll.pollIndex < poll.totalLivePolls - 1) {
                // Send updated message
                modify.getUpdater().finish(message);
                // Create next poll
                data.view = {id: poll.liveId};
                await createLivePollMessage(data, read, modify, persistence, data.user.id, poll.pollIndex + 1);
            } else {
                // Finish current poll
                return modify.getUpdater().finish(message);
            }
        }
    } catch (e) {
        logger.error('Error', e);
    }
}
