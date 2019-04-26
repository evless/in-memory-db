const paramsToString = (params) => typeof params === 'string' ? params : JSON.stringify(params)
const SECOND = 1000;

module.exports = function(options = {}) {
    const ttl = options.ttl || 0; // in seconds
    const maxValues = options.maxValues || 0;
    const data = new Map();

    this._getAllData = () => [...data.entries()];

    this.check = (params) => {
        const key = paramsToString(params)
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
        if (this.check(params)) {
            this.incrementCounter(params);
            return data.get(paramsToString(params)).value;
        }
    
        return;
    }

    this.set = (params, value) => {
        if (maxValues > 0 && Object.keys(data).length >= maxValues) {
            this.findAndRemoveSmallCounter();
        }

        data.set(paramsToString(params), {
            value,
            counter: 1,
            endTime: ttl > 0 ? Date.now() + ttl * SECOND : 0,
        });
    }

    this.incrementCounter = (params) => {
        if (this.check(params)) {
            const key = paramsToString(params);
            const item = data.get(key);
            item.counter++;
            data.set(key, item)
        }
    }

    this.remove = (params) => data.delete(paramsToString(params))

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
