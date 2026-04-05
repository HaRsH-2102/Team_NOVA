const http = require('http');

const total = 5000;
const concurrency = 500;
let completed = 0;

function makeRequest() {
    return new Promise((resolve) => {
        const start = Date.now();

        http.get('http://localhost:9090/getAllUsers', (res) => {
            res.on('data', () => {});
            res.on('end', () => {
                completed++;
                resolve(Date.now() - start);
            });
        });
    });
}

(async () => {
    const start = Date.now();

    const batches = total / concurrency;

    for (let i = 0; i < batches; i++) {
        await Promise.all(Array(concurrency).fill().map(makeRequest));
        console.log(`Progress: ${completed}/${total}`);
    }

    console.log(`Done in ${Date.now() - start} ms`);
})();