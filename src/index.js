const express = require('express');
const db = require('./db');
const inMemoryDb = require('./lib/memory-db')

const app = express();
const memory = inMemoryDb({
    ttl: 60, // seconds
    maxValues: 20,
})

// constants
const PORT = 3000;
const FROM_CACHE = 'from_cache';
const FROM_DB = 'from_db';
const NOT_FOUND = {
    result: 'Not found'
}

const parseResult = (type, result, startTime) => ({
    type,
    result,
    startTime,
    endTime: Date.now(),
    waitTime: Date.now() - startTime
})

app.get('/', function(req, res) {
    res.send(`
        <p>Поскольку используется условная "БД", то все запросы выполняются с радномным таймаутом.</p>
        <p>Имеются ручки:</p>
        <ul>
            <li><a href="/items" target="_blank">/items</a> — тут мы получаем полный список айтемов</li>
            <li><a href="/items?phone=8&isActive=true" target="_blank">/items?params</a> — тут мы фильтруем все айтемы по параметрам. (В целом там идет сравнение на соответствие или просто indexOf)</li>
            <li><a href="/item/5cc09a5dba58ac0b7e53c12d" target="_blank">/item/:id</a> — тут мы получаем итем по полю _id</li>
            <li><a href="/memory" target="_blank">/memory</a> — тут мы можем посмотреть кэш базы</li>
        </ul>

        <p>Все запросы отдаются в виде:</p>
        <pre>
        {
            type: 'from_cache' | 'from_db' -> Показывает откуда пришли данные
            result: Object -> сам результат
            startTime: Date -> Время начала запроса
            endTime: Date -> Время окончания запроса
            waittime: Date -> Сколько выполнялся запрос
        }
        </pre>
    `);
});

app.get('/items', async function(req, res) {
    const startTime = Date.now();
    const isQuery = Object.keys(req.query).length > 0;
    if (isQuery) {
        const cache = memory.get(req.query);
    
        if (cache) {
            return res.send(parseResult(FROM_CACHE, cache, startTime))
        }
    }

    const result = await db.getWithParams(req.query);

    if (isQuery) {
        memory.set(req.query, result);
    }

    res.send(parseResult(FROM_DB, result, startTime));
});

app.get('/item/:id', async function(req, res) {
    const startTime = Date.now();
    const id = req.params.id;
    const cache = memory.get(id);

    if (cache) {
        return res.send(parseResult(FROM_CACHE, cache, startTime))
    }

    const result = await db.getById(id);
    if (!result) {
        res.send(NOT_FOUND)
    } else {
        memory.set(id, result);
        res.send(parseResult(FROM_DB, result, startTime));
    }
});

app.get('/memory', function(req, res) {
    res.send(JSON.stringify(memory._getAllData()))
})

app.listen(PORT, function() {
    console.log(`Example app with in-memory-db listening on ${PORT} port.`)
});
