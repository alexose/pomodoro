(function(){
    var pomodoro   = 1000 * 60 * 25,
        shortBreak = 1000 * 60 * 5,
        longBreak  = 1000 * 60 * 30,
        numBreaks  = 3,
        day        = 1000 * 60 * 60 * 24;

    // Save and load methods for localStorage
    var namespace = 'pomodoro-app';

    function load(){
        var result;

        try {
            if (localStorage && JSON){
                var json = localStorage.getItem(namespace);
                result = JSON.parse(json);

                // Ensure index
                if (!result.tasks){
                    result.tasks = [];
                }

                // Re-establish reference to active task
                var i = result.activeIndex;
                if (typeof(i) === 'number' && i >= 0){
                    result.active = result.tasks[i];
                }
            }
        } catch(e){
            console.log('Could not load data.  Starting from scratch.');
        }
        return result || {};
    }

    function save(){

        try {
            if (localStorage && JSON){
                localStorage.setItem(namespace, JSON.stringify(this.data.instance));
            }
        } catch(e){
            console.log('Could not save data.' + e);
        }
    }

    var data = {
        instance : load(),
        sounds : [
            { name : 'sine1', display: 'Sine', selected : true },
            { name : 'sine2', display: 'Alternative sine'},
            { name : 'square', display: 'Square'}
        ],
        format : function(ts){
            var total = ts / 1000,
                seconds = total % 60,
                minutes = (total - seconds) / 60,
                formatted = minutes + ':' + ("0" + seconds).slice(-2);

            return ts ? formatted : "Complete!"; // via http://stackoverflow.com/questions/8043026/javascript-format-number-to-have-2-digit
        },
        getWidth : function(ts){
            return (1 - (ts / pomodoro)) * 100;
        },
        makeTitle : function(string, name){
            document.title = name ? string + " - " + name : "Pomodoro!";
        }
    };

    // Ensure defaults
    data.instance.options = data.instance.options || { currentSound : 'sine1' };

    var extended = Ractive.extend({
        update : function(skip){

            // TODO: Save remaining time without having to re-encode JSON
            // if (!skip){
                save.call(this);
            // }
            this._super();
        }
    });

    var ractive = new extended({
        el : 'application',
        template : '#pomodoro',
        data : data
    });

    // Find and trigger active tasks
    var start = data.instance.active;
    if (start){
        start.active = false;
        doStart.call(ractive, { context : start });
    }

    // Observe options
    var sound,
        keypath = 'instance.options.currentSound';
    ractive.observe(keypath, function(newvalue){

        var file = this.get(keypath);

        if (!file){
            file = this.data.sounds[0].name;
            this.set('keypath', file);
        }

        sound = new Audio('sounds/' + file + '.mp3');
    });

    ractive.on('start', doStart);
    ractive.on('break', doBreak);
    ractive.on('shortBreak', doShortBreak);
    ractive.on('longBreak', doLongBreak);
    ractive.on('new'  , doNew);
    ractive.on('reset', doReset);
    ractive.on('clear', doClear);
    ractive.on('clearCompleted', doClearCompleted);
    ractive.on('delete', doDelete);
    ractive.on('finish', doFinish);

    var interval;
    function doStart(evt, cb){
        var c = evt.context,
            increment = 1000 * 1, // Every one second
            active = c.active,
            ractive = this;

        if (!c.remaining){
            // TODO: Allow rename
            return;
        }

        doStop.call(this, evt);

        // If the selected task was the active one, return.
        if (active){
            ractive.update();
            return;
        }

        // Activate task in context
        this.data.instance.active = c;
        this.data.instance.activeIndex = this.data.instance.tasks.indexOf(c);

        c.active = true;

        ractive.update();

        // Begin updating status bar
        interval = setInterval(function(){
            c.remaining -= increment;

            // Finish task
            if (c.remaining <= 0){
                c.remaining = 0;
                clearInterval(interval);

                if (typeof(cb) === 'function'){
                    cb();
                } else {
                    completed.call(ractive, evt);
                }
                sound.play();
            }

            ractive.update.call(ractive, true);

        }, increment);

    }

    function completed(evt){
        doStop.call(this, evt, true);

        if (this.data.instance.options.autobreak){

            // Begin break automatically
            doBreak.call(this, evt);
        }
    }

    function doBreak(type){
        var instance = this.data.instance,
            cb = function(){};

        if (typeof(instance.breaks) === 'undefined'){
            instance.breaks = 0;
        }


        if (!type){
          type = instance.breaks && (instance.breaks % numBreaks === 0) ? "long" : "short";
        }

        var name = type == "long" ? "Long Break" : "Short Break";

        var obj = {
            context : {
                    name : name,
                    remaining : type == "long" ? longBreak : shortBreak
                }
            };

        doStart.call(this, obj);

        instance.breaks++;
        this.update();
    }

    function doShortBreak(){
        doBreak.call(this, "short");
    }

    function doLongBreak(){
        doBreak.call(this, "long");
    }

    function doDelete(evt){
        doStop.call(this);

        // Remove ask from array
        var index = evt.keypath.split('.').pop();
        this.data.instance.tasks.splice(index, 1);

        this.update();
    }

    function doFinish(evt){

        evt.context.remaining = 0;

        completed.call(this);

        this.update();
    }

    function doStop(evt, force){

        var instance = this.data.instance;

        // Clear interval
        if (interval){
            clearInterval(interval);
        }

        // Deactivate others
        instance.tasks.forEach(function(d){
            d.active = false;
        });

        if (instance.active){
            if (!force){
                instance.active.remaining = pomodoro;
            }
            instance.active = false;
            instance.activeIndex = false;
        }

    }

    function doNew(evt){

        var task = {
            name : evt.node.value,
            remaining : pomodoro,
            modified: +new Date(),
            active : false
        };

        // Insert into array above the first date maker
        var tasks = data.instance.tasks,
            pos = tasks.length - 1;

        tasks.splice(pos, 0, task);

        ractive.update();
    }

    function doClear(evt){
        evt.node.value = "";
    }

    function doClearCompleted(evt){

        this.data.instance.tasks = this.data.instance.tasks.filter(strip);
        this.update();

        return;

        function strip(task){
            return task.remaining === 0 ? false : true;
        }
    }

    function doReset(evt){
        doStop.call(ractive, evt);

        this.data.instance = { tasks : [] };
        this.update();
    }
})();
