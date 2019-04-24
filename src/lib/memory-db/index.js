const paramsToString = (params) => typeof params === 'string' ? params : JSON.stringify(params)
const SECOND = 1000;

module.exports = function(options = {}) {
    const ttl = options.ttl || 0; // in seconds
    const maxValues = options.maxValues || 0;
    const data = {};

    this._getAllData = () => data;

    this.check = (params) => {
        const item = data[paramsToString(params)];
        if (item) {
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
            return data[paramsToString(params)].value;
        }
    
        return;
    }

    this.set = (params, value) => {
        if (maxValues > 0 && Object.keys(data).length >= maxValues) {
            this.findAndRemoveSmallCounter();
        }

        data[paramsToString(params)] = {
            value,
            counter: 1,
            endTime: ttl > 0 ? Date.now() + ttl * SECOND : 0,
        };
    }

    this.incrementCounter = (params) => this.check(params) && (data[paramsToString(params)].counter++)

    this.remove = (params) => delete data[paramsToString(params)]

    this.findAndRemoveSmallCounter = () => {
        const keys = Object.keys(data);

        const key = keys.sort((keyA, keyB) => data[keyA].counter > data[keyB].counter)[0]

        this.remove(key)
    }

    this.startTimer = () => {
        if (ttl <= 0) {
            return;
        }

        clearTimeout(this.timerID);

        this.timerID = setTimeout(() => {
            const keys = Object.keys(data);

            keys.forEach(key => {
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
