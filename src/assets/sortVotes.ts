import {IPoll, IVoter} from '../definition'

export const sortVotes = (poll: IPoll) => {
    let data: Array<[string, IVoter]> = [];
    for (let i = 0, n = poll.votes.length; i < n; i++) {
        data.push([poll.options[i], poll.votes[i]]);
    }
    data = data.sort((j, i) => i[1].quantity - j[1].quantity);
    return {options: data.map((i) => i[0]), votes: data.map((i) => i[1])}
}
