import {
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata';

import { createPollBlocks } from './createPollBlocks';
import { getPoll } from './getPoll';

export async function updatePollMessage({
    data,
    read,
    persistence,
    modify,
    logger,
}: {
    data;
    read: IRead;
    persistence: IPersistence;
    modify: IModify;
    logger: ILogger;
}) {
    const poll = await getPoll(String(data.view.id).replace('add-option-modal-', ''), read);

    if (!poll) {
        throw new Error('no such poll');
    }

    if (poll.finished) {
        throw new Error('this poll is already finished');
    }

    const {
        state,
    }: {
        state?: any;
    } = data.view;

    if (!state.addOption || !state.addOption.option) {
        throw {option: 'Please type your option here'};
    }

    try {

        poll.data.push({option: state.addOption.option, votes: { quantity: 0, voters: [] } })

        const message = await modify
            .getUpdater()
            .message(poll.msgId, data.user);
        message.setEditor(message.getSender());

        const block = modify.getCreator().getBlockBuilder();

        const showNames = await read
            .getEnvironmentReader()
            .getSettings()
            .getById('use-user-name');
        const wordCloudAPI = await read.getEnvironmentReader().getSettings().getById('wordcloud-api');

        const timeZone = await read.getEnvironmentReader().getSettings().getById('timezone');

        createPollBlocks(
            block,
            poll.question,
            poll.data.map((i) => i.votes),
            poll,
            showNames.value,
            timeZone.value,
            poll.anonymousOptions,
            wordCloudAPI.value,
        );

        message.setBlocks(block);

        const association = new RocketChatAssociationRecord(
            RocketChatAssociationModel.MISC,
            poll.msgId,
        );
        persistence.updateByAssociation(association, poll);

        return modify.getUpdater().finish(message);
    } catch (e) {
        logger.error('Error', e);
    }
}
