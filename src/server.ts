import express from 'express';
import scoresRouter from './routes/scores'
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.use(cors())
app.use('/scores', scoresRouter)

app.listen(port, () => console.log("Server listening on", port))