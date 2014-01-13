(function(){
    var pomodoro = 1000 * 60 * 25,
        shortBreak = 1000, //, * 60 * 5,
        longBreak = 2000, // * 60 * 30,
        numBreaks = 3;

    // Save and load methods for localStorage
    var namespace = 'pomodoro-app';

    function load(){
        var result;

        try {
            if (localStorage && JSON){
                var json = localStorage.getItem(namespace);
                result = JSON.parse(json);

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

    function save(key, value){
        key = key || '';
        value = typeof(value) === 'undefined' ? this.data.instance : value;

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
        makeTitle : function(string){
            document.title = string;
        }
    };

    // Ensure defaults
    data.instance.options = data.instance.options || { currentSound : 'sine1' };

    var app = Ractive.extend({
        update : function(){
            save.call(this);
            this._super();
        }
    });

    var ractive = new app({
        el : 'application',
        template : '#pomodoro',
        data : data
    })

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
        save.call(this);
        
        var file = this.get(keypath);
        
        if (!file){
            file = this.data.sounds[0].name;
            this.set('keypath', file);
        }
       
        sound = new Audio('sounds/' + file + '.mp3');
    });

    ractive.on('start', doStart);
    ractive.on('break', doBreak);
    ractive.on('new'  , doNew);
    ractive.on('reset', doReset);
    ractive.on('clear', doClear);
    ractive.on('delete', doDelete);
    ractive.on('finish', doFinish);
    
    var interval;
    function doStart(evt, cb){
        var c = evt.context,
            increment = 1000 * 1, // Every one second
            active = c.active,
            ractive = this;

        doStop.call(this, evt);
        
        // If the selected task was the active one, we actually want to return.
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
            
            ractive.update();
            
        }, increment)
    }

    function completed(evt){
        doStop.call(this, evt);

        if (this.data.instance.options.autobreak){

            // Begin break automatically
            doBreak.call(this, evt);
        }
    }

    function doBreak(){
        var instance = this.data.instance,
            cb = function(){};

        if (typeof(instance.breaks) === 'undefined'){
            instance.breaks = 0;
        }

        if (instance.breaks && instance.breaks % numBreaks === 0){
            doStart.call(this, {
                context : {
                    name : 'Long Break',
                    remaining : longBreak
                }
            }, cb);
        } else {
            doStart.call(this, {
                context : {
                    name : 'Short Break',
                    remaining : shortBreak
                }
            }, cb);
        }

        instance.breaks++;
        this.update();
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
    }

    function doStop(evt){
       
        // Clear interval
        if (interval){
            clearInterval(interval);
        }

        // Deactivate others
        this.data.instance.tasks.forEach(function(d){
            d.active = false;
        });

        this.data.instance.active = false;
        this.data.instance.activeIndex = false;
    }

    function doNew(evt){
        data.instance.tasks.push({
            name : evt.node.value,
            remaining : pomodoro,
            modified : +new Date(),
            active : false
        })

        ractive.update();
    }

    function doClear(evt){
        evt.node.value = "";
    }
    
    function doReset(evt){
        doStop.call(ractive, evt);

        this.data.instance = { tasks : [] };
        this.update();
    };
})()
