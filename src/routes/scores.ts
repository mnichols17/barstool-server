import {Router, Request, Response} from 'express';
import axios from 'axios';
import {redis_client} from '../redis'

const router = Router();

const parseInfo = (league: string, data: any) => {
    const {away_period_scores, home_period_scores, 
        home_team, away_team, event_information} = data;

    const shared: any = {
        league,
        home_period_scores,
        away_period_scores,
        home_abb: home_team.abbreviation,
        away_abb: away_team.abbreviation,
        home_name: home_team.last_name,
        away_name: away_team.last_name,
        status: event_information.status
    }

    switch(league){
        case("MLB"):
            const {home_batter_totals, away_batter_totals,
                away_errors, home_errors} = data;

            return {
                ...shared,
                home_total: [home_batter_totals.runs, home_batter_totals.hits, home_errors],
                away_total: [away_batter_totals.runs, away_batter_totals.hits, away_errors]
            }
        case("NBA"):
            const {home_totals, away_totals} = data;

            return {
                ...shared,
                home_total: [home_totals.points],
                away_total: [away_totals.points],
            }
        default:
            return shared;
    }
}

const getGameInfo = (id: string) => new Promise((resolve, reject) => {
    redis_client.get(id, async(err, result) => {
        if(result) {
            resolve(JSON.parse(result))
        }
        else {
            axios.get(`https://chumley.barstoolsports.com/dev/data/games/${id}.json`)
            .then((res:any) => {
                const parsed = parseInfo(res.data.league, res.data)

                redis_client.setex(id, 15, JSON.stringify(parsed));
                resolve(parsed)
            })
            .catch((err: any) => {
                redis_client.setex(id, 15, JSON.stringify({error: "INVALID GAME ID"}));
                resolve({error: "INVALID GAME ID"})
            })
        }
    })
})


router.get('/', async(req: Request, res: Response) => {
    // 6c974274-4bfc-4af8-a9c4-8b926637ba74 = NBA
    // eed38457-db28-4658-ae4f-4d4d38e9e212 = MLB

    const game_ids = ['6c974274-4bfc-4af8-a9c4-8b926637ba74', 'eed38457-db28-4658-ae4f-4d4d38e9e212']

    const game_data = game_ids.map(async(id: string) => getGameInfo(id))

    const games = await Promise.all(game_data)

    res.json(games.filter((game:any) => !game.error));
})

export default router;