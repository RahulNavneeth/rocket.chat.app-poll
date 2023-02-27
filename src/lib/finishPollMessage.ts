import {
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

import { IPoll } from '../definition';
import { createPollBlocks } from './createPollBlocks';
import { getPoll } from './getPoll';

async function finishPoll(poll: IPoll, { persis }: { persis: IPersistence }) {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MISC,
        poll.msgId,
    );
    poll.finished = true;
    return persis.updateByAssociation(association, poll);
}

export async function finishPollMessage({
    data,
    read,
    persistence,
    modify,
    http,
    logger,
}: {
    data;
    read: IRead;
    persistence: IPersistence;
    modify: IModify;
    http: IHttp;
    logger: ILogger;
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

    if (poll.finished) {
        throw new Error('this poll is already finished');
    }

    if (poll.uid !== data.user.id) {
        throw new Error('You are not allowed to finish the poll'); // send an ephemeral message
    }

    try {
        await finishPoll(poll, { persis: persistence });

        const message = await modify
            .getUpdater()
            .message(data.message.id as string, data.user);
        message.setEditor(message.getSender());

        const block = modify.getCreator().getBlockBuilder();

        const showNames = await read
            .getEnvironmentReader()
            .getSettings()
            .getById('use-user-name');
        const wordCloudAPI = await read
            .getEnvironmentReader()
            .getSettings()
            .getById('wordcloud-api');
        const timeZone = await read
            .getEnvironmentReader()
            .getSettings()
            .getById('timezone');

        if (poll.wordCloud && wordCloudAPI.value) {
            let wordList = [] as Array<string>;
            poll.data.map((i) => i).map((option, index) => {
                wordList = wordList.concat(
                    Array(poll.data[index].votes.quantity).fill(option),
                );
            });
            const attachment = {
                imageUrl: `${wordCloudAPI.value}?text=${wordList.join(' ')}`,
            } as IMessageAttachment;
            const response = await http.get(`${wordCloudAPI.value}?text=${wordList.join(' ')}`);
            if (response) {
                createPollBlocks(
                    block,
                    poll.question,
                    poll.data.map((i) => i.option),
                    poll,
                    showNames.value,
                    timeZone.value,
                    poll.anonymousOptions,
                    wordCloudAPI.value,
                );

                message.setBlocks(block);

                modify.getUpdater().finish(message);

                const wordCloudBuilder = modify
                .getCreator()
                .startMessage()
                .setUsernameAlias(data.user.username)
                .setRoom({ ...data.room } as IRoom)
                .setThreadId(data.message.threadId)
                .addAttachment(attachment);

                return modify.getCreator().finish(wordCloudBuilder);
            } else {
                createPollBlocks(
                    block,
                    poll.question,
                    poll.data.map((i) => i.option),
                    poll,
                    showNames.value,
                    timeZone.value,
                    poll.anonymousOptions,
                    false,
                );

                message.setBlocks(block);

                modify.getUpdater().finish(message);
            }
        } else {
            createPollBlocks(
                block,
                poll.question,
                poll.data.map((i) => i.option),
                poll,
                showNames.value,
                timeZone.value,
                poll.anonymousOptions,
                wordCloudAPI.value,
            );

            message.setBlocks(block);

            modify.getUpdater().finish(message);
        }
        return;
    } catch (e) {
        logger.error('Error', e);
    }
    return;
}
