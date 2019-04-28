const hash = (params) => {
    const string = typeof params === 'string' ? params : JSON.stringify(params)

    return string
        .split('')
        .map(letter => letter.charCodeAt())
        .reduce((prev, curr) => prev + curr, 0)
}
const SECOND = 1000;

module.exports = function(options = {}) {
    const ttl = options.ttl || 0; // in seconds
    const maxValues = options.maxValues || 0;
    const data = new Map();

    this._getAllData = () => [...data.entries()];

    this.check = (key) => {
        if (data.has(key)) {
            const item = data.get(key);
            if (ttl > 0) {
                if (item.endTime > Date.now()) {
                    return true;
                } else {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    this.get = (params) => {
        const key = hash(params);

        if (this.check(key)) {
            this.incrementCounter(key);
            return data.get(key).value;
        }
    
        return;
    }

    this.set = (params, value) => {
        if (maxValues > 0 && Object.keys(data).length >= maxValues) {
            this.findAndRemoveSmallCounter();
        }

        data.set(hash(params), {
            value,
            counter: 1,
            endTime: ttl > 0 ? Date.now() + ttl * SECOND : 0,
        });
    }

    this.incrementCounter = (key) => {
        const item = data.get(key);
        item.counter++;
        data.set(key, item)
    }

    this.remove = (key) => data.delete(key)

    this.findAndRemoveSmallCounter = () => {
        let removeKey = null;
        let minCounter = null;

        data.forEach((val, key) => {
            if (!minCounter) {
                minCounter = val.counter;
            }

            if (val.counter <= minCounter) {
                removeKey = key;
            }
        });

        this.remove(removeKey)
    }

    this.startTimer = () => {
        if (ttl <= 0) {
            return;
        }

        clearTimeout(this.timerID);

        this.timerID = setTimeout(() => {
            data.forEach((val, key) => {
                if (! this.check(key)) {
                    this.remove(key)
                }
            });

            this.startTimer();
        }, 5000);
    }

    this.startTimer();

    return this;
};
