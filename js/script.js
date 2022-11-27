(function () {
    var pomodoro = 1000 * 60 * 25,
        shortBreak = 1000 * 60 * 5,
        longBreak = 1000 * 60 * 30,
        numBreaks = 3,
        day = 1000 * 60 * 60 * 24;

    // Save and load methods for localStorage
    var namespace = "pomodoro-app";

    function notify() {
        var inst = this.data.instance;
        var done = inst.visible.find(d => d.remaining === 0);
        var index = inst.tasks.indexOf(done);
        var next = inst.tasks[index + 1];

        var notification = new Notification("Notification", {
            icon: "img/favicon.ico",
            body: `Finished ${done.name}!\nNext up: ${next.name}`,
        });

        notification.onclick = () => {
            doStart.call(ractive, {context: next});
            // window.parent.parent.focus();
        };
    }

    function load() {
        var result;

        try {
            if (localStorage && JSON) {
                var json = localStorage.getItem(namespace);
                result = JSON.parse(json);

                // Ensure index
                if (!result.tasks) {
                    result.tasks = [];
                }

                // Re-establish reference to active task
                var i = result.activeIndex;
                if (typeof i === "number" && i >= 0) {
                    result.active = result.tasks[i];
                }
            }
        } catch (e) {
            console.log("Could not load data.  Starting from scratch.");
        }
        return result || {tasks: []};
    }

    function save() {
        try {
            if (localStorage && JSON) {
                localStorage.setItem(namespace, JSON.stringify(this.data.instance));
            }
        } catch (e) {
            console.log("Could not save data." + e);
        }
    }

    var data = {
        instance: load(),
        sounds: [
            {name: "sine1", display: "Sine", selected: true},
            {name: "sine2", display: "Alternative sine"},
            {name: "square", display: "Square"},
        ],
        format: function (ts) {
            ts = ts / 1000;

            var hours = Math.floor(ts / 3600),
                minutes = Math.floor((ts - hours * 3600) / 60),
                seconds = Math.round(ts - hours * 3600 - minutes * 60);

            if (hours < 10) {
                hours = "0" + hours;
            }
            if (minutes < 10) {
                minutes = "0" + minutes;
            }
            if (seconds < 10) {
                seconds = "0" + seconds;
            }

            var time = minutes + ":" + seconds;

            return ts ? time : "Complete!"; // via http://stackoverflow.com/questions/6312993
        },
        getWidth: function (ts) {
            return (1 - ts / pomodoro) * 100;
        },
        makeTitle: function (string, name) {
            document.title = name ? string + " - " + name : "Pomodoro!";
        },
        makeRemaining: function (tasks) {
            var remaining = tasks.filter(function (d) {
                    return d.remaining;
                }),
                total = remaining.length * pomodoro;

            var endDate = new Date(+new Date() + total),
                hours = endDate.getHours(),
                am = hours < 12;

            hours = hours % 12;
            hours = hours ? hours : 12;

            return hours + ":" + (endDate.getMinutes() < 10 ? "0" : "") + endDate.getMinutes() + (am ? " AM" : " PM");
        },
        makeTime: function (tasks) {
            var remaining = tasks.filter(function (d) {
                return d.remaining;
            });

            var total = remaining.length * (pomodoro / 60 / 1000),
                hours = Math.floor(total / 60),
                mins = total % 60,
                string = "";

            if (hours) {
                string += hours + " " + (hours > 1 ? "hours" : "hour");

                if (mins) {
                    string += " and ";
                }
            }

            if (mins) {
                string += mins + " " + (mins > 1 ? "minutes" : "minute");
            }

            return string;
        },
        startTime: function (i) {
            if (i % 3 !== 0 || i === 0) {
                return "";
            }

            const d = new Date();
            d.setMinutes(d.getMinutes() + i * 30);

            var hours = d.getHours(),
                am = hours < 12;

            hours = hours % 12;
            hours = hours ? hours : 12;

            return hours + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes() + (am ? " AM" : " PM");
        },
    };

    // Ensure defaults
    data.instance.options = data.instance.options || {currentSound: "sine1"};

    var extended = Ractive.extend({
        update: function (skip) {
            // TODO: Save remaining time without having to re-encode JSON
            // if (!skip){
            save.call(this);
            // }
            updateVisible(this.data);
            this._super();
        },
    });

    function updateVisible(data) {
        var show = data.instance.showCompleted;
        data.instance.visible = data.instance.tasks.filter(function (d) {
            return show ? true : d.remaining;
        });
    }

    updateVisible(data);

    var ractive = new extended({
        el: "application",
        template: "#pomodoro",
        data: data,
    });
    // Find and trigger active tasks
    var start = data.instance.active;
    if (start) {
        start.active = false;
        doStart.call(ractive, {context: start});
    }

    // Observe options
    var sound,
        keypath = "instance.options.currentSound";

    ractive.observe(keypath, function (newvalue) {
        var file = this.get(keypath);

        if (!file) {
            file = this.data.sounds[0].name;
            this.set("keypath", file);
        }

        sound = new Audio("sounds/" + file + ".mp3");
    });

    ractive.on("start", doStart);
    ractive.on("break", doBreak);
    ractive.on("shortBreak", doShortBreak);
    ractive.on("longBreak", doLongBreak);
    ractive.on("new", doNew);
    ractive.on("reset", doReset);
    ractive.on("clear", doClear);
    ractive.on("toggleCompleted", doToggleCompleted);
    ractive.on("toggleNotifications", doToggleNotifications);
    ractive.on("clearCompleted", doClearCompleted);
    ractive.on("delete", doDelete);
    ractive.on("finish", doFinish);
    ractive.on("doCallback", doCallback);
    ractive.on("toggleCallback", toggleCallback);
    ractive.on("updateCallback", updateCallback);

    var interval;

    function doStart(evt, cb) {
        var c = evt.context,
            increment = 1000 * 1, // Every one second
            active = c.active,
            ractive = this,
            before = new Date();

        if (!c.remaining) {
            // TODO: Allow rename
            return;
        }

        doStop.call(this, evt);

        // If the selected task was the active one, return.
        if (active) {
            ractive.update();
            return;
        }

        // Activate task in context
        this.data.instance.active = c;
        this.data.instance.activeIndex = this.data.instance.tasks.indexOf(c);

        c.active = true;

        ractive.update();

        // Begin updating status bar
        interval = setInterval(function () {
            var elapsed = new Date().getTime() - before.getTime();

            c.remaining -= elapsed;
            before = new Date();

            // Finish task
            if (c.remaining <= 0) {
                c.remaining = 0;
                clearInterval(interval);

                if (typeof cb === "function") {
                    cb();
                } else {
                    completed.call(ractive, evt);
                }
                sound.play();
            }

            ractive.update.call(ractive, true);
        }, increment);
    }

    function completed(evt) {
        doCallback.call(this, evt);
        notify.call(this);

        doStop.call(this, evt, true);
    }

    // Attempt to run custom code
    function doCallback(evt) {
        var string = this.data.instance.callback;
        if (string) {
            try {
                eval(string);
            } catch (e) {
                console.log(e);
            }
        }
    }

    function doBreak(type) {
        var instance = this.data.instance,
            cb = function () {};

        if (typeof instance.breaks === "undefined") {
            instance.breaks = 0;
        }

        if (!type) {
            type = instance.breaks && instance.breaks % numBreaks === 0 ? "long" : "short";
        }

        var name = type == "long" ? "Long Break" : "Short Break";

        var obj = {
            context: {
                name: name,
                remaining: type == "long" ? longBreak : shortBreak,
            },
        };

        doStart.call(this, obj);

        instance.breaks++;
        this.update();
    }

    function doShortBreak() {
        doBreak.call(this, "short");
    }

    function doLongBreak() {
        doBreak.call(this, "long");
    }

    function doDelete(evt) {
        doStop.call(this);

        // Remove ask from array
        var index = evt.keypath.split(".").pop();
        this.data.instance.tasks.splice(index, 1);

        this.update();
    }

    function doFinish(evt) {
        evt.context.remaining = 0;

        completed.call(this);

        this.update();
    }

    function doStop(evt, force) {
        var instance = this.data.instance;

        // Clear interval
        if (interval) {
            clearInterval(interval);
        }

        // Deactivate others
        instance.tasks.forEach(function (d) {
            d.active = false;
        });

        if (instance.active) {
            if (!force) {
                instance.active.remaining = pomodoro;
            }
            instance.active = false;
            instance.activeIndex = false;
        }
    }

    function doNew(evt) {
        var task = {
            name: evt.node.value,
            remaining: pomodoro,
            modified: +new Date(),
            active: false,
        };

        data.instance.tasks.push(task);

        ractive.update();
    }

    function doClear(evt) {
        evt.node.value = "";
    }

    function doToggleCompleted(evt) {
        this.data.instance.showCompleted = !this.data.instance.showCompleted;
        this.update();
        return;
    }

    function doToggleNotifications(evt) {
        this.data.instance.notifications = !this.data.instance.notifications;

        if (this.data.instance.notifications) {
            if (!Notification) alert("This browser does not support notifications.");
            if (Notification.permission !== "granted") Notification.requestPermission();
        }

        this.update();
        return;
    }

    function doClearCompleted(evt) {
        this.data.instance.tasks = this.data.instance.tasks.filter(strip);
        this.update();

        return;

        function strip(task) {
            return task.remaining === 0 ? false : true;
        }
    }

    function doReset(evt) {
        doStop.call(ractive, evt);

        this.data.instance = {tasks: []};
        this.update();
    }

    function toggleCallback(evt) {
        this.data.instance.showCallback = !this.data.instance.showCallback;
        this.update();
    }

    function updateCallback(evt) {
        this.data.instance.callback = evt.node.value;
        this.update();
    }
})();
